# Infrastructure

Terraform for the AWS resources the application cannot run without.

## What is here, and what is deliberately not

The scope is narrow on purpose. This module provisions **only what has no
local equivalent** — Cognito above all, which has no emulator. LocalStack's
free tier does not provide it, and `backend/app/core/auth/cognito.py` is
written against the real service.

| Resource | Here? | Why |
|---|---|---|
| Cognito user pools (2) + app clients | ✅ | No emulator exists. This is the Day 3/4 blocker. |
| S3 buckets (6) | ✅ | Free tier; presigned uploads need a real endpoint. |
| SQS queue + DLQ | ✅ | Celery broker. Free tier covers 1M requests/month. |
| Secrets Manager (containers only) | ✅ | App secrets. Values set out of band. (Twilio's was removed 2026-09-18 with SMS.) |
| SES domain identity + DNS | ✅ once `email_domain` is set | Every email: Cognito's codes and invitations, and notifications. See **Email** below. |
| IAM user + least-privilege policy | ✅ | What the backend runs as during the sprint. |
| **Postgres** | ❌ | `docker-compose.yml` locally, service container in CI. Both free and faster than a round trip to Mumbai. |
| **Redis** | ❌ | Same. |
| **VPC / NAT Gateway** | ❌ | A NAT Gateway is ~$32/month to solve a problem we do not have yet. |
| **RDS / ElastiCache / ECS** | ❌ | Deployment concerns — plan.md Day 20. These bill while idle. |

Everything provisioned here is **$0 at idle**. Nothing needs switching off
between sessions. `terraform destroy` removes all of it.

## Usage

```bash
cd infra/terraform
terraform init
terraform plan          # read this before applying
terraform apply

# Write the settings the backend expects straight into its env file:
terraform output -raw env_file > ../../backend/.env.aws
```

`terraform.tfstate` holds the app's IAM secret key in plaintext and is
gitignored. It is currently **local state** — before a second person runs
this, move it to an S3 backend with DynamoDB locking, or you will get two
divergent copies of reality.

## Email (2026-09-18)

The client dropped SMS and phone OTP until the organisation's registration
exists, so email is the only channel outside the app. `ses.tf` creates
nothing until you set the domain:

```bash
terraform apply -var 'email_domain=bharatpath.in'
# add -var 'route53_zone_id=Z...' if the domain's DNS is a Route 53 zone here,
# and Terraform writes the records itself. Otherwise:
terraform output email_dns_records   # five records to add at the registrar, once
```

Then, in the SES console, **request production access** — until it is granted
SES only delivers to verified addresses. Once the domain verifies, both
Cognito pools send through it (`email_configuration`, `DEVELOPER`) instead of
Cognito's own sender (about 50 emails a day), and `env_file` switches the
backend to `NOTIFICATIONS_EMAIL_PROVIDER=ses`.

## Still blocked, or deferred

1. **Phone OTP — deferred by the client (2026-09-18).** `ALLOW_CUSTOM_AUTH`
   is removed from the candidate client and the Twilio secret is gone.
   `phone_number` stays a username attribute on the candidate pool on purpose:
   changing `username_attributes` *replaces* the pool. Bringing phone OTP
   back is the three Lambda triggers, SMS delivery, and `AUTH_PHONE_OTP_ENABLED`.

2. **TRAI DLT registration** — deferred with SMS. It binds the sender, not
   the gateway, and takes 2–4 weeks when it restarts.

3. **Google as a federated IdP** on the candidate pool needs Google OAuth
   client credentials; not yet created, so `supported_identity_providers`
   lists `COGNITO` only.

## Region

`ap-south-1` (Mumbai). Data residency (plan.md **N2**, still open with the
client) is the reason — keeping everything in India is the answer that
cannot be wrong, until they tell us CV text may leave.
