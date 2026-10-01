# Remote state in the account that owns these resources (335345888157,
# created 2026-10-01). Written from `terraform -chdir=../bootstrap output
# -raw backend_configuration`; a new account means a new bucket name here.

terraform {
  backend "s3" {
    bucket         = "bharatpath-tfstate-335345888157"
    key            = "bharatpath/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "bharatpath-tfstate-locks"
    encrypt        = true
  }
}
