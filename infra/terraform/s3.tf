data "aws_caller_identity" "current" {}

# The six buckets app/settings.py expects. Names are suffixed with the
# account id because S3 bucket names are globally unique across all of
# AWS -- "bharatpath-resumes" was almost certainly taken years ago.
locals {
  buckets = {
    resumes         = "Uploaded CVs and their parsed versions."
    kyb_documents   = "Employer verification documents."
    interview_audio = "Voice interview recordings and chunks."
    exports         = "Generated CSV/PDF exports."
    audit_archive   = "Cold copies of the append-only audit trail."
    course_media    = "Course video and materials (producer still unknown -- plan.md N7)."
  }

  bucket_names = {
    for k, v in local.buckets :
    k => "${var.project}-${replace(k, "_", "-")}-${var.environment}-${data.aws_caller_identity.current.account_id}"
  }
}

resource "aws_s3_bucket" "this" {
  for_each = local.buckets

  bucket        = local.bucket_names[each.key]
  force_destroy = var.environment == "dev"
}

# Every one of these buckets holds personal data under DPDP. None of them
# is ever public -- objects reach users through presigned URLs with short
# expiry, never through a public read.
resource "aws_s3_bucket_public_access_block" "this" {
  for_each = aws_s3_bucket.this

  bucket                  = each.value.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  for_each = aws_s3_bucket.this

  bucket = each.value.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Versioning is not for convenience. Invariant 1 requires a score to be
# reproducible from the stored extraction chain, which means the exact
# bytes that were scored must still be retrievable after any later
# overwrite (plan.md 8, Day 8).
resource "aws_s3_bucket_versioning" "this" {
  for_each = aws_s3_bucket.this

  bucket = each.value.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Presigned uploads come straight from the mobile client, so the browser
# and RN fetch layer need CORS. Kept wide for development -- tighten to
# the real origins before launch.
resource "aws_s3_bucket_cors_configuration" "uploads" {
  for_each = toset(["resumes", "kyb_documents", "interview_audio"])

  bucket = aws_s3_bucket.this[each.key].id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}
