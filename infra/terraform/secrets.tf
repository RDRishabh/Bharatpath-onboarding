# Secret *containers* only -- values are set out of band, never in
# Terraform, because anything passed through a variable lands in plaintext
# in terraform.tfstate.
#
# Populate with:
#   aws secretsmanager put-secret-value --secret-id <name> --secret-string '...'

resource "aws_secretsmanager_secret" "twilio" {
  name        = "${var.project}/${var.environment}/twilio"
  description = "Twilio Account SID, Auth Token, and Verify Service SID. Read by the Cognito custom-auth Lambdas."

  # Zero, so a destroyed dev secret can be recreated under the same name
  # immediately. AWS otherwise holds the name for 7 days minimum.
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret" "app" {
  name        = "${var.project}/${var.environment}/app"
  description = "Application secrets: database URLs, JWT signing material, payment gateway keys."

  recovery_window_in_days = 0
}
