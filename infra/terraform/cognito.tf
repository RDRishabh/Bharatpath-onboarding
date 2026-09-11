# Two user pools, matching the two authentication models the PRD requires
# (plan.md 5.7). They are separate pools rather than one pool with groups
# because the mechanisms differ: candidates authenticate by phone OTP
# through a custom flow, business users by password with mandatory MFA.
#
# Neither pool is an authorisation authority. Role and tenant come from
# our `memberships` table on every request (app/core/auth/membership.py).
# Cognito answers "who is this" and nothing else -- so no groups are
# defined here, deliberately.

# --------------------------------------------------------------------------
# Candidate pool -- students and job seekers.
# --------------------------------------------------------------------------
resource "aws_cognito_user_pool" "candidates" {
  name = "${var.project}-candidates-${var.environment}"

  # Phone OTP is delivered by Twilio from inside the custom-auth Lambdas,
  # NOT by Cognito via SNS (plan.md 5.8). So phone is never listed as an
  # auto-verified attribute -- doing so would make Cognito try to send its
  # own SMS, duplicating the message and bypassing Twilio's abuse controls.
  auto_verified_attributes = ["email"]
  username_attributes      = ["email", "phone_number"]

  # Do not leak which phone numbers and emails are registered.
  # Cognito returns a generic failure instead of "user not found".
  # Enumerating the candidate base is exactly the bulk-extraction risk
  # flagged as N4 in the plan.
  lifecycle {
    ignore_changes = [schema]
  }

  password_policy {
    minimum_length                   = 12
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = false
    temporary_password_validity_days = 1
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  # MFA is not forced on candidates: the phone-OTP flow is already a
  # possession factor, and requiring a second one on a consumer signup in
  # this market would cost more conversions than it buys security.
  mfa_configuration = "OFF"

  deletion_protection = "INACTIVE"
}

resource "aws_cognito_user_pool_client" "candidates" {
  name         = "${var.project}-candidates-app-${var.environment}"
  user_pool_id = aws_cognito_user_pool.candidates.id

  # Public mobile client: no secret, because a secret shipped inside an
  # app binary is not a secret.
  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_CUSTOM_AUTH",   # phone OTP, once the Lambda triggers land
    "ALLOW_USER_SRP_AUTH", # email + password
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  prevent_user_existence_errors = "ENABLED"

  supported_identity_providers = ["COGNITO"]

  callback_urls = var.callback_urls
  logout_urls   = var.logout_urls

  read_attributes  = ["email", "email_verified", "phone_number", "name"]
  write_attributes = ["email", "phone_number", "name"]
}

# --------------------------------------------------------------------------
# Business pool -- employer, college and admin users.
# --------------------------------------------------------------------------
resource "aws_cognito_user_pool" "business" {
  name = "${var.project}-business-${var.environment}"

  auto_verified_attributes = ["email"]
  username_attributes      = ["email"]

  password_policy {
    minimum_length                   = 14
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 3
  }

  # Software-token MFA is mandatory for every business user (SRS 1.3.4).
  # These accounts reach candidate PII in bulk, which is what makes the
  # stricter policy proportionate here and not on the candidate pool.
  mfa_configuration = "ON"

  software_token_mfa_configuration {
    enabled = true
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Business accounts are provisioned by us, not self-registered. An
  # employer signing themselves up would bypass KYB entirely.
  admin_create_user_config {
    allow_admin_create_user_only = true
  }

  deletion_protection = "INACTIVE"
}

resource "aws_cognito_user_pool_client" "business" {
  name         = "${var.project}-business-app-${var.environment}"
  user_pool_id = aws_cognito_user_pool.business.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  # Shorter than the candidate pool. These sessions see candidate PII.
  access_token_validity  = 30
  id_token_validity      = 30
  refresh_token_validity = 7

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  prevent_user_existence_errors = "ENABLED"

  supported_identity_providers = ["COGNITO"]

  callback_urls = var.callback_urls
  logout_urls   = var.logout_urls
}
