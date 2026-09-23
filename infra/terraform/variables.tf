variable "aws_region" {
  description = "Mumbai. The data-residency question (plan.md N2) is still open, so the default keeps everything in India until the client answers."
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Environment name; used as a suffix so dev and prod can coexist in one account."
  type        = string
  default     = "dev"
}

variable "project" {
  description = "Prefix for every resource name."
  type        = string
  default     = "bharatpath"
}

variable "callback_urls" {
  description = "OAuth redirect targets for the hosted UI. Expo dev client and localhost during the sprint."
  type        = list(string)
  default = [
    "http://localhost:8099/api/v1/auth/callback",
    "http://localhost:19006/",
    "bharatpath://auth/callback",
  ]
}

variable "logout_urls" {
  type    = list(string)
  default = ["http://localhost:19006/", "bharatpath://auth/logout"]
}

variable "scoring_model_ids" {
  description = "Bedrock inference-profile ids the backend may invoke to read CVs. The four offered to the client on 2026-09-13; narrow to the one chosen."
  type        = list(string)
  default = [
    "global.anthropic.claude-sonnet-4-6",
    "global.anthropic.claude-haiku-4-5-20251001-v1:0",
    "global.anthropic.claude-sonnet-5",
    "in.openai.gpt-5.6-luna",
  ]
}

# -- email (2026-09-18) ------------------------------------------------------
variable "email_domain" {
  description = "The domain BharatPath sends email from, e.g. bharatpath.in. Empty until the client names it: no SES identity is created and both Cognito pools keep Cognito's built-in sender (about 50 emails a day -- development only)."
  type        = string
  default     = ""
}

variable "email_from_local_part" {
  description = "The sender's mailbox name. It need not be a real mailbox; replies go to support."
  type        = string
  default     = "no-reply"
}

variable "route53_zone_id" {
  description = "Set if the domain's DNS is a Route 53 hosted zone in this account; Terraform then writes the DKIM, MAIL FROM and DMARC records itself. Empty: add them at the registrar from `terraform output email_dns_records`."
  type        = string
  default     = ""
}

variable "dmarc_report_address" {
  description = "Where DMARC aggregate reports go. Defaults to dmarc@<email_domain>."
  type        = string
  default     = ""
}

# ---------------------------------------------------------------------------
# Email without a domain (2026-09-22)
# ---------------------------------------------------------------------------
variable "email_sender_address" {
  description = <<-DESC
    A single mailbox to send from while the client has no domain (blockers
    E38). SES verifies ONE address rather than a whole domain: it emails a
    confirmation link to this address, and once somebody clicks it the
    account may send `From:` that address and nothing else.

    This is the stop-gap, not the destination. Set `email_domain` instead as
    soon as the domain and its DNS exist -- an address identity cannot carry
    DKIM alignment, so mail sent this way is markedly more likely to be
    filtered as spam, and every message is From: a personal-looking mailbox.

    Ignored when `email_domain` is set: a domain identity covers every
    address at that domain, so both would be redundant.
  DESC
  type        = string
  default     = ""
}

# ---------------------------------------------------------------------------
# The single-host test deployment (2026-09-22) -- see ec2.tf
# ---------------------------------------------------------------------------
variable "deploy_ec2" {
  description = <<-DESC
    Create the EC2 test host. **Default false, and that matters:** everything
    else in this module is free at idle, so the standing assumption has been
    that nothing bills between sessions. An instance breaks that assumption,
    so switching it on is a deliberate act.

      terraform apply -var deploy_ec2=true
      terraform apply -var deploy_ec2=false   # tears the host down again

    The EBS data volume has `prevent_destroy`, so switching it off stops the
    instance bill and keeps the database.
  DESC
  type        = bool
  default     = false
}

variable "instance_type" {
  description = <<-DESC
    t3.small (2 vCPU, 2 GiB, ~$15/month in ap-south-1) runs the API, worker,
    beat, Postgres and Redis together for a test environment.

    x86_64 rather than Graviton on purpose -- `backend/Dockerfile` is built
    wherever it is run, and an image built on an x86 machine will not start
    on ARM. Move to t4g when images are built in CI for a pinned arch.

    2 GiB is enough and not generous: Postgres and Redis take their share.
    If the worker is OOM-killed under a real CV load, t3.medium is the step.
  DESC
  type        = string
  default     = "t3.small"
}

variable "data_volume_size_gb" {
  description = "Postgres's data directory. Separate from the root volume so replacing the instance does not destroy the database."
  type        = number
  default     = 20
}

variable "ssh_allowed_cidrs" {
  description = <<-DESC
    Who may reach port 22. **Narrow this.** The default is open because an
    empty default locks the first person out of the host they just created,
    but an internet-facing SSH port is the one rule here worth changing
    before the instance has been up a day.

      terraform apply -var 'ssh_allowed_cidrs=["203.0.113.4/32"]'

    Session Manager works with no SSH at all (the instance role carries
    AmazonSSMManagedInstanceCore), so `[]` is a real option.
  DESC
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "ssh_public_key" {
  description = "An OpenSSH public key for the host. Leave empty to use Session Manager only, which needs no key and no open port."
  type        = string
  default     = ""
}

variable "api_domain" {
  description = <<-DESC
    A hostname pointing at this instance's elastic IP. When set, Caddy gets a
    real Let's Encrypt certificate for it automatically; when empty it serves
    the IP over a self-signed certificate, which browsers and most HTTP
    clients will refuse until told otherwise.

    Anything resolvable works for a test environment -- it does not have to be
    the client's production domain, and it is unrelated to `email_domain`.
  DESC
  type        = string
  default     = ""
}
