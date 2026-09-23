# Remote state for the main module. Apply this ONCE, before anything else.
#
# ---------------------------------------------------------------------------
# Why this is a separate module
# ---------------------------------------------------------------------------
# A Terraform backend cannot create the bucket it stores state in: the backend
# is configured before any resource is evaluated, so the bucket has to exist
# already. The usual answers are a hand-made bucket (undocumented, and nobody
# remembers its settings) or this -- a tiny module with LOCAL state whose only
# job is to make the place the real state lives.
#
# Its own `terraform.tfstate` stays local and stays boring: two resources, no
# secrets, and re-running it is a no-op. Losing it costs an import, not data.
#
# ---------------------------------------------------------------------------
# What this fixes
# ---------------------------------------------------------------------------
# Until 2026-09-22 `infra/terraform/terraform.tfstate` was a local file on one
# laptop, and it held the app IAM user's secret access key in plaintext. Two
# consequences, both real:
#
#   1. **One machine was the source of truth.** A second person running
#      `terraform apply` would not have seen the first person's resources and
#      would have tried to create them all again.
#   2. **The drift was invisible.** The Cognito changes of 2026-09-18 were
#      written and never applied, and nothing said so -- the live business
#      pool still refused self-signup while the code said it allowed it
#      (blockers E7). A shared, locked backend does not prevent that, but it
#      does mean `terraform plan` tells anyone who runs it.
#
# ---------------------------------------------------------------------------
#   cd infra/bootstrap
#   terraform init && terraform apply
#   # then, in infra/terraform:
#   terraform init -migrate-state
# ---------------------------------------------------------------------------

terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "bharatpath"
      ManagedBy = "terraform"
      Purpose   = "remote-state"
    }
  }
}

data "aws_caller_identity" "current" {}

locals {
  # Account-suffixed, like the app buckets: S3 names are globally unique.
  bucket_name = "${var.project}-tfstate-${data.aws_caller_identity.current.account_id}"
  lock_table  = "${var.project}-tfstate-locks"
}

resource "aws_s3_bucket" "state" {
  bucket = local.bucket_name

  # NOT `force_destroy`. This bucket holds the only record of what exists in
  # the account; a `terraform destroy` that emptied it would leave every real
  # resource orphaned and unmanageable.
  force_destroy = false

  lifecycle {
    prevent_destroy = true
  }
}

# State is a secret. It holds the app IAM user's secret access key, and will
# hold the database password once RDS exists.
resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Versioning is the undo button for state. A corrupted or truncated state file
# is otherwise unrecoverable, and "unrecoverable" here means every resource in
# the account becomes unmanaged.
resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Old state versions accumulate on every apply and are useful for a while.
resource "aws_s3_bucket_lifecycle_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    id     = "expire-old-state-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# The lock. Two people applying at once against one state file corrupts it;
# this makes the second one wait instead.
#
# PAY_PER_REQUEST because this table sees a few writes a week and provisioned
# capacity would bill for idle.
resource "aws_dynamodb_table" "locks" {
  name         = local.lock_table
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  lifecycle {
    prevent_destroy = true
  }
}

output "backend_configuration" {
  description = "Paste this into infra/terraform/backend.tf, then run `terraform init -migrate-state`."
  value       = <<-EOT
    terraform {
      backend "s3" {
        bucket         = "${aws_s3_bucket.state.id}"
        key            = "bharatpath/terraform.tfstate"
        region         = "${var.aws_region}"
        dynamodb_table = "${aws_dynamodb_table.locks.name}"
        encrypt        = true
      }
    }
  EOT
}
