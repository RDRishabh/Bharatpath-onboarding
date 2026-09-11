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
| Secrets Manager (containers only) | ✅ | Twilio and app secrets. Values set out of band. |
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

## Still blocked

Two things here are waiting on decisions outside this repository:

1. **Phone OTP.** The candidate pool declares `ALLOW_CUSTOM_AUTH`, but the
   three Lambda triggers (`DefineAuthChallenge`, `CreateAuthChallenge`,
   `VerifyAuthChallenge`) are not written, because they call Twilio Verify
   and no Twilio account exists yet (plan.md §5.8). **Email/password auth
   works today on both pools**, which is enough to build against.

2. **TRAI DLT registration** — 2–4 weeks, longer than the entire sprint, and
   neither Cognito nor Twilio removes it: it binds the sender, not the
   gateway. This is the longest uncontrolled lead time on the project.

3. **Google as a federated IdP** on the candidate pool needs Google OAuth
   client credentials; not yet created, so `supported_identity_providers`
   lists `COGNITO` only.

## Region

`ap-south-1` (Mumbai). Data residency (plan.md **N2**, still open with the
client) is the reason — keeping everything in India is the answer that
cannot be wrong, until they tell us CV text may leave.
