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
source .test-env.sh                     # NOT optional - see below
.venv/Scripts/pytest.exe                # 905 tests
bash scripts/dev_api.sh                 # API on :8099
```

**Run tests as CI does — bare `pytest`, not `python -m pytest`.** The latter puts
the working directory on `sys.path`, which hides import errors that CI will catch.
That exact divergence produced a green local suite and a red CI for the same commit.

**`source .test-env.sh` first, or four RLS tests fail for a reason that looks
exactly like a regression.** Without it the app connects as a role that is not
subject to RLS, so `test_scores_are_insert_only` reports `DID NOT RAISE` instead
of a permissions error. The tests are right; the connection is wrong.

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

## Resume parsing — local first, Textract as fallback

`pypdf` and `python-docx` read a normal CV for nothing. **Textract is called
only when they fail or return almost no text**, which is what a scanned CV — a
phone photo saved as a PDF — looks like: pypdf reports *success* and returns an
empty string, so without OCR that candidate is scored as having no experience
and nothing errors. The trigger is therefore a length floor
(`MIN_USEFUL_CHARS`), not an exception.

Textract bills per page with no free tier, so *not* calling it on the common
path is a requirement, not an optimisation. `resume_textract_fallback_enabled`
turns it off; scanned CVs then fail loudly rather than scoring as empty.
Textract runs in `ap-south-1`, so text stays in India while **N2** is open.

Every extraction records `parser` and `parser_version`. This is not
bookkeeping: invariant 1 requires a score to be replayable from the stored
extraction chain, and a different parser produces different text and therefore
a different score. Changing parser is a **re-score**, not an upgrade. See
`docs/progress.md` → *Deferred by decision*.

## Placeholder content — ours, not the client's

Produced 2026-09-12 under Round 7.10. **Every one of these carries a flag that a
test asserts**, so a placeholder cannot quietly become the product:

| Where | Flag |
|---|---|
| `subscriptions/catalogue.py` | `PLACEHOLDER_PRICING` |
| `courses/catalogue.py` | `HAS_MEDIA`, every `asset_key is None` |
| `notifications/templates.py` | every `dlt_template_id is None` — **an SMS cannot be sent without one**, and an unregistered body is dropped silently by the operator |
| `questionnaire/bank.py`, `interview/bank.py` | `BANK_VERSION` |
| `kyb/forms.py`, `college/forms.py` | `FORM_VERSION` |
| `app/core/i18n/locales/*.json` | non-English bundles still need a native-speaker pass |

Flipping one of these is a client decision, not a tidy-up.

**The score is never drawn as a red-to-green gauge, dial or speedometer.**
`docs/design-system.md` §1, and machine-readable in `docs/design-tokens.json`.
That picture is the visual language of an Indian bureau score — invariant 6
forbids the words for the same reason, and a dial says it louder than any word.

## Integrity signals never move the score

SRS 1.4.5, enforced by the `integrity-never-imports-scoring` contract.
`integrity/domain.py` raises signals; a human resolves them.

**Severity is the design, not the rules.** HIGH removes a candidate from
employer search *before* anyone has looked, so only two rules may reach it —
injected instructions and hidden text, the two things nobody does by accident.
Everything that could equally be a typo, an unusual career, or our own extractor
misreading is MEDIUM or LOW. `test_only_the_two_deliberate_rules_can_ever_reach_high`
is where a third one would have to be argued for.

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
