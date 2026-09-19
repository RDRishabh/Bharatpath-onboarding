# Secret *containers* only -- values are set out of band, never in
# Terraform, because anything passed through a variable lands in plaintext
# in terraform.tfstate.
#
# Populate with:
#   aws secretsmanager put-secret-value --secret-id <name> --secret-string '...'

# The Twilio secret was removed 2026-09-18: the client dropped SMS and phone
# OTP until DLT exists, so nothing reads it. Bring it back with them.

resource "aws_secretsmanager_secret" "app" {
  name        = "${var.project}/${var.environment}/app"
  description = "Application secrets: database URLs, JWT signing material, payment gateway keys."

  # Zero, so a destroyed dev secret can be recreated under the same name
  # immediately. AWS otherwise holds the name for 7 days minimum.
  recovery_window_in_days = 0
}
