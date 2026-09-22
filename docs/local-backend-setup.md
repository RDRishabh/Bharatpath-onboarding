# Running the backend locally, without AWS

For the app and web teams. Nothing here needs an AWS account, AWS credentials,
a Cognito pool, or the internet after the first `pip install`. Everything runs
in Docker on your machine.

Verified end to end on Windows (Git Bash) on 2026-09-22, from a clean shell
holding nothing but a fresh `cp .env.example .env`: the API boots, tokens mint,
an employer organisation is created, and a subscription checkout completes and
turns ACTIVE. If your `.env` is older than that, **copy it again from
`.env.example` rather than patching it by hand** — two settings that a fresh
copy needs (`AUTH_ALLOW_LOCAL_TOKENS`, and the quoting on
`CORS_ALLOWED_ORIGINS`) were only added to the template on that date.

---

## 1. What you need

- **Docker Desktop**, running.
- **Python 3.12**.
- **Git Bash** (the scripts are bash; from PowerShell run them as
  `& "C:\Program Files\Git\bin\bash.exe" scripts/<script>.sh`).

That is the whole list. No AWS console, no keys.

## 2. Setup, once

```bash
cd backend
cp .env.example .env
docker compose up -d                 # postgres, redis, localstack, mailhog

python -m venv .venv
source .venv/Scripts/activate        # macOS/Linux: source .venv/bin/activate
pip install -e ".[dev]"

PYTHON=.venv/Scripts/python.exe bash scripts/reset_local_db.sh
```

`reset_local_db.sh` builds the schema, the three database roles, the plan and
course catalogue, and the configuration rows. It is idempotent — run it again
whenever you pull a schema change.

## 3. Start the API

```bash
PYTHON=.venv/Scripts/python.exe bash scripts/dev_api.sh
```

- Base URL: **`http://localhost:8099/api/v1`**
- Swagger UI: **`http://localhost:8099/docs`** — every endpoint is callable
  from there once you paste a token into the Authorize button.
- `backend/openapi.json` is the same contract, if you generate a client from it.

**If it dies with `error parsing value for field "cors_allowed_origins"`**,
your `.env` predates the fix. The line must be single-quoted:

```bash
CORS_ALLOWED_ORIGINS='["http://localhost:3000","http://localhost:3001","http://localhost:3002","http://localhost:5173"]'
```

`dev_api.sh` loads `.env` with `set -a; . ./.env`, and without the outer quotes
the shell eats the inner double quotes, so the value stops being JSON and
`Settings` refuses to boot. Copy the line from `.env.example` and restart. Add
your dev-server origin to that list — keeping the quotes — or the browser
blocks every call.

## 4. Signing in without Cognito

**The API has no login endpoint.** In a deployed environment the app talks to
Cognito directly and sends us the access token. Locally there is no Cognito, so
the backend mints its own real RS256 tokens:

```bash
curl -X POST http://localhost:8099/api/v1/auth/dev/token \
  -H "Content-Type: application/json" \
  -d '{"pool":"CANDIDATE","email":"you@example.com"}'
```

```json
{"access_token":"eyJhbG...","token_type":"Bearer","subject":"...","expires_in":3600}
```

Send it as `Authorization: Bearer <access_token>` on every call. It goes through
the ordinary verification path — nothing about auth is faked except who issued
the token.

- `"pool":"CANDIDATE"` → a candidate. `GET /auth/me` returns `role: CANDIDATE`,
  `tenant_id: null`.
- `"pool":"BUSINESS"` → an employer or college **with no organisation yet**.
  `GET /auth/me` answers **403 `no_active_membership`**. That is not a bug; it
  means "create your organisation":

  ```http
  POST /api/v1/employer/organisation   {"legal_name": "Acme Pvt Ltd"}
  POST /api/v1/college/organisation    {"legal_name": "Acme College"}
  ```

  After that `GET /auth/me` returns `EMPLOYER_OWNER` (or the college role) and a
  `tenant_id`.
- **Keep the `subject`** from the response and pass it back
  (`{"pool":"CANDIDATE","subject":"<subject>"}`) to sign in as the *same* user
  again. A fresh call with no subject creates a new account every time.

The route exists only while `AUTH_ALLOW_LOCAL_TOKENS=true`, which `.env.example`
sets and which `Settings` refuses to accept in staging or production. It is not
in the deployed `openapi.json`.

## 5. Money, without a payment gateway

No gateway is chosen yet, so `.env.example` sets `PAYMENTS_PROVIDER=stub`. A
checkout then completes in two calls, synchronously:

```http
POST /api/v1/candidate/subscription/checkout   {"plan_code": "CANDIDATE_MONTHLY"}
  → 201 {"payment_id": "...", "status": "PENDING", "amount_minor": 14900, ...}

POST /api/v1/billing/dev/payments/{payment_id}/simulate   {"outcome": "SUCCEEDED"}
  → 200 {"status": "SUCCEEDED", ...}

GET  /api/v1/candidate/subscription
  → {"state": "ACTIVE", "has_access": true, ...}
```

`outcome` is `SUCCEEDED` or `FAILED` — not `SUCCESS`. Plan codes come from
`GET /{candidate|employer|college}/subscription/plans`; the prices there are
placeholders, not the client's.

**Every employer action is paywalled** — jobs, pipeline, search, reveal. A
`402 subscription_required` means that tenant has not run a checkout.
Organisation, team and KYB stay open, so onboarding works unpaid. A candidate
reading or withdrawing their own applications is never paywalled.

## 6. What works locally and what does not

| Thing | Locally | Notes |
|---|---|---|
| Postgres, Redis | Real, in Docker | |
| File uploads (CV, KYB documents, audio) | **LocalStack S3** on :4566 | Presigned URLs work; `docker compose up -d` already started it |
| Email | **Mailhog**, web UI at **http://localhost:8025** | Catches everything, sends nothing |
| Sign-in | `POST /auth/dev/token` | Section 4 |
| Payments | Stub + simulate route | Section 5 |
| Background work (notifications, settlement, expiry sweeps) | Celery worker + beat, on Redis | Section 7 |
| **CV → score** | **Off** (`SCORING_EXTRACTION_ENABLED=false`) | Needs an OpenAI key. Without one a score stays `PENDING` — deliberately; there is no fallback scorer, because a plausible wrong number is unfixable once a candidate has seen it |
| **Scanned-PDF OCR** | **Off** | Textract is real AWS and bills per page |
| **Interview transcription and feedback** | **Off** (`none`) | The session stays COMPLETED and the report PENDING |
| SMS | **Does not exist**, anywhere | Client decision, 2026-09-18. Email and in-app only |

Every "off" row returns a clean, documented state rather than a crash or a fake
number. Build the UI against those states.

## 7. Background jobs (only if you need them)

Nothing settles a payment, sends a notification or carries out a deletion until
the relay runs. The simulate route in section 5 does not need it; most other
async work does.

```bash
celery -A app.worker worker --loglevel=info --pool=solo
celery -A app.worker beat   --loglevel=info      # exactly one of these, ever
```

`.env.example` points the broker at Redis
(`CELERY_BROKER_URL=redis://localhost:6379/1`), so this runs with no AWS.
Deployed environments use SQS.

## 8. When something looks broken

| Symptom | Cause |
|---|---|
| `error parsing value for field "cors_allowed_origins"` at boot | Unquoted `CORS_ALLOWED_ORIGINS` in `.env` — section 3 |
| `No authentication configured` at boot | `AUTH_ALLOW_LOCAL_TOKENS=true` is missing from `.env`. With no Cognito pool and no flag, `Settings` refuses to construct and nothing runs, Alembic included — section 4 |
| The browser blocks the call and nothing reaches the server log | Your origin is not in `CORS_ALLOWED_ORIGINS` |
| `403 no_active_membership` | A business account with no organisation — section 4 |
| `402 subscription_required` | That tenant has not paid — section 5 |
| `503` on a checkout | `PAYMENTS_PROVIDER` is not `stub` |
| `NoSuchBucket` from `localhost:4566` when uploading a CV or a KYB document | LocalStack started without its six buckets. Create them: `docker exec bharatpath-localstack-1 bash -c 'for b in resumes kyb-documents interview-audio exports audit-archive course-media; do awslocal s3 mb s3://bharatpath-$b; done'`. On Windows the usual cause is a CRLF checkout of `scripts/init_localstack.sh` — the container's shell dies on line 3 and creates nothing. `.gitattributes` now pins shell scripts to LF; `git add --renormalize .` after pulling it fixes an existing clone |
| A list comes back empty when the row clearly exists | Usually a backend bug (a missing tenant or user binding), not your request. Send us the `request_id` from the error body or the `X-Request-ID` response header |
| A code change appears to have no effect | An old uvicorn still holds the port. `dev_api.sh` kills it for you; a uvicorn you started by hand you kill by hand |
| Schema errors after a `git pull` | Re-run `reset_local_db.sh` |

Every error response has the same shape, and `code` is the field to branch on:

```json
{"type": "...", "title": "Permission denied", "status": 403,
 "code": "no_active_membership", "instance": "/api/v1/auth/me",
 "request_id": "..."}
```

## 9. Where the rest is written down

- `docs/APIs.md` — the endpoint reference, per role.
- `docs/signup-and-accounts.md` — the four ways an account comes into
  existence, and what the app does at each step. Read this before building
  sign-up.
- `backend/README.md` — the same setup, plus how the test suite is run.
- `backend/bharatpath.postman_collection.json` — an importable Postman
  collection.
