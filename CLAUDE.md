# BharatPath — working context

A three-sided hiring marketplace for India (candidates, employers, colleges) built
around a proprietary resume-derived score. Python 3.12 / FastAPI / Postgres /
Redis / Celery, as a **modular monolith**.

**Read `docs/plan.md` first.** It is the build plan and the source of truth for
scope, the twenty-day schedule, and the progress tracker (§14). This file holds
only what that document does not: how to run things, and the operational state a
new session cannot infer from the code.

`docs/progress.md` is the running log of what has actually been done, and why.
**Update it at the end of any session that changes state.**

## The invariants are not style preferences

`docs/plan.md` §1 lists nine. Two are enforced by CI on every push and are legal
requirements, not preferences:

- **Invariant 5 — no age-gating.** `scripts/check_no_age_fields.py`
- **Invariant 6 — no financial framing.** `scripts/check_vocabulary.py`
  (no "credit score", "creditworthiness", "CIBIL", "loan", "underwriting")

The others are enforced by tests in `backend/tests/invariants/`. Do not weaken a
test to make a change pass — the tests encode client and regulatory commitments.

## Running it

```bash
cd backend
docker compose up -d postgres redis     # Docker Desktop must be running
PYTHON=.venv/Scripts/python.exe bash scripts/reset_local_db.sh
source .test-env.sh
.venv/Scripts/pytest.exe                # 121 tests
bash scripts/dev_api.sh                 # API on :8099
```

**Run tests as CI does — bare `pytest`, not `python -m pytest`.** The latter puts
the working directory on `sys.path`, which hides import errors that CI will catch.
That exact divergence produced a green local suite and a red CI for the same commit.

### Local CI equivalent

```bash
python scripts/check_no_age_fields.py && python scripts/check_vocabulary.py
ruff check app tests scripts && ruff format --check app tests scripts
mypy app && lint-imports && python scripts/gen_modules.py --check
pytest --cov=app
```

## Architecture rules the linter enforces

`.importlinter`, run as `lint-imports`:

- Add-on modules (`questionnaire`, `interview`, `courses`) **never** import
  `scoring` — this is invariant 4′, stopping an add-on awarding itself points.
- Routers never *directly* import repositories; `router → service → repository`
  is the intended path.
- `app.core` never imports `app.modules` (one documented exception:
  `app/core/metadata.py`, which exists only to populate `Base.metadata`).
- `domain.py` is pure — no I/O, no DB, no clock.

## Authentication — the part most likely to be got wrong

- **Cognito answers "who is this" and nothing else.** Role and tenant come from
  our `memberships` table on every request, cached 60s in Redis
  (`app/core/auth/membership.py`). Token claims and Cognito groups are *not* the
  authority: a revoked membership that stayed valid until token expiry is the
  tenant-isolation failure SRS §2.24.7 forbids.
- `cognito_sub` is stored on `users` but **must never appear in an API response.**
- Two pools: candidates (phone OTP / email) and business (password + mandatory
  software-token MFA). A token from the wrong pool is rejected, not half-trusted.
- `AUTH_ALLOW_LOCAL_TOKENS=true` enables a dev-only provider that mints real
  RS256 tokens locally. `Settings` refuses to boot with it set outside local/CI.
  **CI needs it set** — with no Cognito pool configured, `Settings` otherwise
  refuses to construct and even Alembic fails.

## Environment

- `backend/.env` — local development (gitignored)
- `backend/.env.aws` — real AWS values, written by Terraform (gitignored, holds a
  secret key). Regenerate: `terraform output -raw env_file`
- `backend/.test-env.sh` — test env for the docker stack

## AWS

Account `592033927084`, region `ap-south-1` (Mumbai — data residency, plan §13 N2
is still open). Terraform in `infra/terraform`, applied 2026-09-11. See
`infra/README.md` for what is deliberately *not* provisioned and why.

Everything provisioned is ~free at idle. Postgres and Redis are **not** in AWS by
design — docker locally, service containers in CI.

## Conventions

- Money is integer minor units, never a float, and columns are named `*_minor`.
- A tenant-scoped miss is **404, not 403** — a 403 confirms the row exists.
- The baseline migration is not reversible; rebuild with `reset_local_db.sh`.
- Seeding uses the **migrator** role (write + BYPASSRLS); the app role is
  genuinely subject to RLS, which is what makes the RLS tests meaningful.
