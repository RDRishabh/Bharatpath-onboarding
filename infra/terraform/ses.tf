# Email: every message the product sends, and every code Cognito sends.
#
# Added 2026-09-18, when the client dropped SMS and phone OTP until the
# organisation's registration (and with it TRAI DLT) exists. From then on:
#
#   * Cognito sends sign-up verification codes, password-reset codes and the
#     temporary password of an account staff created -- through SES, not
#     Cognito's built-in sender, which is capped at about 50 emails a day and
#     sends from a no-reply@verificationemail.com address nobody trusts.
#   * The backend sends notifications (`NOTIFICATIONS_EMAIL_PROVIDER=ses`).
#
# **Nothing here is created until `email_domain` is set.** Verifying a domain
# needs DNS records added where the domain's DNS lives, and SES production
# access (a support request) before it will send to anyone but verified
# addresses. See infra/README.md, "Email".

locals {
  email_enabled = var.email_domain != ""
  email_from    = local.email_enabled ? "${var.email_from_local_part}@${var.email_domain}" : ""
  # Cognito wants `Name <address>`.
  email_from_display = local.email_enabled ? "BharatPath <${local.email_from}>" : ""
}

resource "aws_sesv2_email_identity" "domain" {
  count          = local.email_enabled ? 1 : 0
  email_identity = var.email_domain

  # Easy DKIM: SES generates the keys and publishes three CNAME targets.
  dkim_signing_attributes {
    next_signing_key_length = "RSA_2048_BIT"
  }
}

# Bounces come back to a subdomain we own rather than amazonses.com, which is
# what lets SPF align for DMARC.
resource "aws_sesv2_email_identity_mail_from_attributes" "domain" {
  count                  = local.email_enabled ? 1 : 0
  email_identity         = aws_sesv2_email_identity.domain[0].email_identity
  mail_from_domain       = "mail.${var.email_domain}"
  behavior_on_mx_failure = "USE_DEFAULT_VALUE"
}

# ---------------------------------------------------------------------------
# DNS -- written for you only if the domain's DNS is a Route 53 zone in this
# account. Otherwise `terraform output email_dns_records` lists what to add
# at the registrar, once.
# ---------------------------------------------------------------------------
locals {
  manage_dns = local.email_enabled && var.route53_zone_id != ""
}

resource "aws_route53_record" "dkim" {
  count   = local.manage_dns ? 3 : 0
  zone_id = var.route53_zone_id
  name    = "${aws_sesv2_email_identity.domain[0].dkim_signing_attributes[0].tokens[count.index]}._domainkey.${var.email_domain}"
  type    = "CNAME"
  ttl     = 1800
  records = ["${aws_sesv2_email_identity.domain[0].dkim_signing_attributes[0].tokens[count.index]}.dkim.amazonses.com"]
}

resource "aws_route53_record" "mail_from_mx" {
  count   = local.manage_dns ? 1 : 0
  zone_id = var.route53_zone_id
  name    = "mail.${var.email_domain}"
  type    = "MX"
  ttl     = 1800
  records = ["10 feedback-smtp.${var.aws_region}.amazonses.com"]
}

resource "aws_route53_record" "mail_from_spf" {
  count   = local.manage_dns ? 1 : 0
  zone_id = var.route53_zone_id
  name    = "mail.${var.email_domain}"
  type    = "TXT"
  ttl     = 1800
  records = ["v=spf1 include:amazonses.com ~all"]
}

resource "aws_route53_record" "dmarc" {
  count   = local.manage_dns ? 1 : 0
  zone_id = var.route53_zone_id
  name    = "_dmarc.${var.email_domain}"
  type    = "TXT"
  ttl     = 1800
  # `p=none` first: report, do not reject, until the reports show every
  # legitimate sender aligned. Tighten to quarantine after that.
  records = ["v=DMARC1; p=none; rua=mailto:${var.dmarc_report_address != "" ? var.dmarc_report_address : "dmarc@${var.email_domain}"}"]
}
