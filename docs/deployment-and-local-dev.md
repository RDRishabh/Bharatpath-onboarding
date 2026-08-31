# How this runs — locally, and in AWS

Written for someone comfortable with Azure App Service who is new to AWS and
to containers. If you know what a managed identity is and what App Service
Configuration does, you already understand 80% of this — the names change more
than the ideas do.

---

## 1. The Azure → AWS translation

| What you did in Azure | The AWS equivalent here | Same idea? |
|---|---|---|
| App Service (Web App) | **ECS Fargate service** | Yes — a managed place to run your app without managing servers |
| App Service Configuration → Application settings | **ECS task definition** → `environment` and `secrets` | Yes, exactly |
| Azure Key Vault | **AWS Secrets Manager** | Yes |
| **Managed Identity** | **IAM task role** | Yes — this is the single most useful analogy on this page |
| Azure SQL firewall → whitelist my IP | **Security groups + VPC** | Similar goal, different mechanism (see §6) |
| Azure Container Registry | **ECR** | Yes |
| Azure SQL Database | **RDS PostgreSQL** | Yes |
| Azure Cache for Redis | **ElastiCache** | Yes |
| Blob Storage | **S3** | Yes |
| Azure Front Door / App Gateway | **ALB + CloudFront** | Roughly |

**The one genuinely different habit:** in Azure you were whitelisting your
laptop's IP to reach dev resources. In AWS the database usually has no public
endpoint at all, so there is no IP to whitelist. We run the whole stack locally
in containers instead. More on that in §6 — it is a real change in workflow,
not just a change in tooling.

---

## 2. What a container actually is

If you have only deployed to App Service, containers can sound more mysterious
than they are.

**A container image is a zip file of a filesystem, plus a note saying which
command to run.** That's it. Ours contains: a minimal Linux, Python 3.12, our
dependencies, and our `app/` directory. The note says
`uvicorn app.main:app --host 0.0.0.0 --port 8000`.

The recipe that builds it is `backend/Dockerfile`. Reading it top to bottom:

```dockerfile
FROM python:3.12-slim        # start from a Linux that already has Python
WORKDIR /srv                 # work in this directory
COPY pyproject.toml ./       # copy the dependency list in
RUN pip install .            # install dependencies
COPY app ./app               # copy our code in
USER bharatpath              # stop being root
CMD ["uvicorn", "app.main:app", ...]   # what to run when started
```

Three properties that matter, and are the reason containers are worth the
learning curve:

1. **It is identical everywhere.** The image that passes CI is the byte-identical
   image that runs in production. "Works on my machine" stops being a category
   of bug, because there is only one machine — the image.
2. **It is immutable.** You do not edit a running container. You build a new
   image and replace the old one. Rollback is "run the previous image", which
   takes seconds and always works.
3. **It contains NO secrets.** No passwords, no connection strings, no keys.
   The image is just code. Configuration arrives at *startup*, from outside.

That third point is the one to internalise, and it is where your `.env`
question comes in.

### Two deployables, one image

`docker-compose.yml` and the ECS services run **the same image** with
different commands:

```
same image ──┬── uvicorn app.main:app          → the API service
             └── celery -A app.worker worker   → the worker service
```

Why bother: the API and the workers share model definitions and business
rules. If they were separate images they could drift — the worker computing a
score with last week's rules while the API validates with this week's. One
image makes that impossible rather than unlikely.

---

## 3. The deploy pipeline

```
  you push to main
        │
        ▼
  GitHub Actions
        │
        ├── lint, mypy, import-linter, invariant guards
        ├── pytest against a real Postgres
        │
        ├── docker build  →  one image, tagged with the git SHA
        │                     e.g. bharatpath-backend:a3f9c21
        │
        ▼
  push image to ECR   (the registry — like ACR)
        │
        ▼
  update the ECS service to point at the new tag
        │
        ▼
  ECS starts new tasks, waits for /health/ready to pass,
  drains the old ones  ← rolling deploy, no downtime
```

**Tagging by git SHA, not `latest`.** `latest` is ambiguous: you cannot tell
what is running, and rollback becomes guesswork. With a SHA tag, "what is in
production?" has one answer and rolling back is pointing at the previous SHA.

---

## 4. How configuration gets in — the `.env` question

**In deployed environments there is no `.env` file.** Nothing reads one.

An ECS **task definition** is the direct equivalent of App Service
Configuration. It is a JSON document that says: run this image, with this much
CPU and memory, in these subnets, with these environment variables. It has two
separate sections:

```jsonc
{
  "containerDefinitions": [{
    "image": "…ecr…/bharatpath-backend:a3f9c21",

    // Non-secret values, in plain text. Anyone who can read the task
    // definition can read these — so nothing sensitive goes here.
    "environment": [
      { "name": "ENVIRONMENT", "value": "prod" },
      { "name": "AWS_REGION",  "value": "ap-south-1" }
      // NOTE: no AWS_ENDPOINT_URL here. That is a LocalStack-only setting.
      // Absent means "talk to real AWS".
    ],

    // Secrets. The VALUE is never written here — only a pointer to it.
    // ECS fetches each one at task start and injects it as an env var.
    "secrets": [
      { "name": "DATABASE_URL",
        "valueFrom": "arn:aws:secretsmanager:ap-south-1:…:/bharatpath/prod/db/url" },
      { "name": "REDIS_URL",
        "valueFrom": "arn:aws:secretsmanager:…:/bharatpath/prod/redis/url" }
    ]
  }]
}
```

So from the application's point of view **nothing changes between local and
production.** `app/settings.py` reads `os.environ` either way. Locally those
variables come from `.env`; in production ECS puts them there. Same names,
different source.

That is why `.env.example` is safe to commit: it is a template for the local
Docker stack, with credentials that only unlock a throwaway container on your
laptop.

---

## 5. How the app gets AWS permissions — your managed identity, renamed

This is the bit that maps most cleanly onto what you already know.

**In Azure:** you gave the App Service a managed identity, granted that
identity access to Key Vault and Storage, and the SDK picked up credentials
automatically. No keys in config.

**In AWS it is the same idea with different words.** Two roles are attached to
every task:

| Role | Used by | For what |
|---|---|---|
| **Task execution role** | The ECS agent, before your code starts | Pulling the image from ECR, reading the Secrets Manager values above, writing logs |
| **Task role** | **Your code** (boto3) | Calling S3, SQS, Bedrock, Textract |

When `boto3` needs credentials it checks a chain of sources. Inside ECS it
finds a link-local HTTP endpoint (`169.254.170.2`) that hands out **temporary
credentials for the task role**, rotated automatically. Your code does nothing
to enable this:

```python
import boto3
s3 = boto3.client("s3")     # credentials resolved automatically
```

**This is why `AWS_ACCESS_KEY_ID` must not be set in production.** Setting it
overrides the role and pins you to a long-lived key that cannot be rotated
without a deploy, leaks through logs and backups, and never expires. Exactly
the problem managed identity solves in Azure — same solution, different name.

Locally there is no task role, so `.env.example` sets the literal string
`test`, which is all LocalStack wants.

---

## 6. How connections are made — networking

This is where AWS differs most from what you were doing, so it is worth
reading slowly.

```
                        Internet
                            │
                    ┌───────▼────────┐
                    │      ALB       │   public subnets
                    │  (port 443)    │   ← the only thing reachable from outside
                    └───────┬────────┘
                            │  port 8000
          ┌─────────────────▼──────────────────┐
          │   ECS tasks: api + worker          │   private subnets
          │   no public IP at all              │   ← cannot be reached from
          └─────────────────┬──────────────────┘      the internet, ever
                            │  port 5432
          ┌─────────────────▼──────────────────┐
          │   RDS PostgreSQL (Multi-AZ)        │   private subnets
          │   publicly accessible = NO         │   ← no internet path exists
          └────────────────────────────────────┘
```

**Security groups are stateful firewalls, and the AWS idiom is to reference
other security groups rather than IP ranges:**

| Security group | Rule |
|---|---|
| `alb-sg` | Allow 443 from `0.0.0.0/0` (the internet) |
| `ecs-sg` | Allow 8000 **from `alb-sg`** |
| `rds-sg` | Allow 5432 **from `ecs-sg`** |

Read that last row carefully. It does not say "from IP 10.0.3.14". It says
"from anything wearing the `ecs-sg` badge". Scale the service from 2 tasks to
20 and the rule still holds, with no firewall edits. **This is the thing your
Azure IP-whitelisting habit translates into**, and it is why the whitelist
disappears rather than moving.

### So how does the app authenticate to Postgres?

Two layers, and both matter:

1. **Network** — `rds-sg` only accepts connections from `ecs-sg`. Nothing else
   can even open a socket.
2. **Credentials** — `DATABASE_URL` from Secrets Manager, containing the
   `bharatpath_app` role's password.

And then a third layer that is ours, not AWS's: that role is deliberately
**not** the table owner and does **not** have `BYPASSRLS`, so Row-Level
Security genuinely applies to it. Even a SQL injection that got past the ORM
would still only see one tenant's rows.

> **A note on RDS IAM authentication.** AWS can issue short-lived DB tokens
> instead of passwords — closer still to Azure managed identity. Worth
> considering later; it is not on the critical path, and the Secrets Manager
> password path is well-understood and rotatable.

---

## 7. "Can I connect to the dev database from my laptop?"

Your Azure habit was: whitelist my IP, point local code at the dev database.

**In AWS that usually is not possible, and that is deliberate.** RDS sits in a
private subnet with `publicly accessible = false`. There is no public endpoint,
so there is no IP to whitelist. Making it public to enable that habit would
undo the strongest control in the diagram above.

When you genuinely need to reach a **dev** database, the AWS way is a tunnel:

```bash
# SSM Session Manager port forwarding. No SSH keys, no open ports,
# no public IPs — and every session is logged in CloudTrail.
aws ssm start-session \
  --target i-0abc123 \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters '{"host":["bharatpath-dev.xxx.ap-south-1.rds.amazonaws.com"],
                 "portNumber":["5432"],"localPortNumber":["5432"]}'
```

Then `localhost:5432` reaches the dev database through the tunnel.

**But mostly: do not.** Our `docker compose up -d` gives you a real Postgres, a
real Redis, and LocalStack for S3 and SQS in about thirty seconds. It is
faster, it works offline, it costs nothing, and you can drop the whole database
and start again without asking anyone. Reach for the tunnel only for the few
things with no local equivalent (§8).

**Never connect to production.** Not to debug, not "just to read". Production
holds real candidates' resumes, phone numbers and email addresses; under the
DPDP Act, a laptop holding a production connection string is an unmanaged copy
of that data. If you need production-shaped data, use an anonymised dump.

---

## 8. The three environments

| | Local | Shared dev AWS | Staging / Prod |
|---|---|---|---|
| Runs on | Your laptop, Docker | Real AWS, disposable data | Real AWS |
| Config from | `.env` | Task definition + Secrets Manager | Task definition + Secrets Manager |
| Postgres | Container | RDS (private) | RDS Multi-AZ (private) |
| S3 / SQS | LocalStack | Real | Real |
| Cognito | ⚠️ none — no emulator | Real dev pool | Real |
| Bedrock / Textract | ⚠️ stubs behind interfaces | Real | Real |
| Direct DB access | Yes, it is yours | Via SSM tunnel, if you must | **Never** |
| Deploy by | n/a | Merge to `main` | Merge to `main`, gated |

Almost all work happens in the first column. The second exists only for the
handful of services with no local emulator. The third is where you test the
*deploy*, not the code.

---

## 9. What actually happens when a request arrives

End to end, in production:

1. A candidate's phone hits `https://api.bharatpath.example/api/v1/candidate/score`.
2. **Route 53** resolves the name; **CloudFront/ALB** terminates TLS.
3. The **ALB** picks a healthy ECS task and forwards to port 8000.
4. **uvicorn** hands the request to FastAPI, which assigns a correlation ID.
5. The auth dependency verifies the JWT against the **Cognito** pool's JWKS
   (cached in memory), then reads role and tenant from **our `memberships`
   table** — never from the token's claims, because claims go stale and a
   revoked membership must take effect in seconds.
6. The session dependency opens a transaction and issues
   `SET LOCAL app.tenant_id = …` from that resolved membership.
7. The query runs. **Postgres RLS silently filters every row** that does not
   belong to that tenant. If step 6 were somehow skipped, the setting would be
   NULL, the policy would match nothing, and the query would return **zero
   rows** rather than everything. Failing closed is the design.
8. Anything slow — parsing, scoring, evaluation — is not done here. The API
   writes an outbox row and returns `202` with a `status_url`; a **worker**
   task picks it up from SQS.
9. Logs go to **CloudWatch** as JSON, with PII redacted on the way out.

---

## 10. What is NOT built yet

Being explicit, because most of this page describes a target rather than a
current state:

- **There is no infrastructure code.** No Terraform, no CDK. Per
  `plan.md` §12, infrastructure is provisioned by a different team; this repo
  is application code written against it.
- **Nothing is deployed.** No AWS account is wired up, no ECR repository, no
  ECS cluster, no RDS instance.
- **The CI pipeline builds an image but does not push or deploy it.** Adding
  the ECR push and the ECS update is a small change once an account exists.
- **`docs/resources-needed.md` §12 is the checklist**, and every box on it is
  currently unticked.

Two things worth insisting on when that work starts:

1. **Terraform or CDK, not click-ops.** Infrastructure created by clicking in
   the console cannot be handed over, only re-documented. It is also
   impossible to review.
2. **OIDC from GitHub Actions to AWS, not stored access keys.** GitHub can
   exchange a short-lived token for an AWS role directly — same principle as
   the task role, applied to the pipeline.
