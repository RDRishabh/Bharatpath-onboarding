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
.venv/Scripts/pytest.exe                # 1237 tests
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
- Other modules **never** import `resume.repository` or `resume.models`. The
  confirm gate (SRS 1.4.4) lives in `resume.service.get_scorable_version`, and
  a rule in a service is only a rule while the service is the only way in —
  `repository.list_versions` returns unconfirmed versions quite correctly, for
  the review screen.

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

## The confirm gate — and the Day 8 trap under it

SRS 1.4.4: an unconfirmed resume version can never reach scoring. Parsing is
not accurate, so the candidate has to see what was extracted before a number is
attached to it.

- **`resume.service.get_scorable_version` is the only door.** The filter is a
  SQL predicate (`confirmed_at IS NOT NULL`), so an unconfirmed row is never
  loaded rather than loaded and then checked.
- **Scoring must trigger on `resume.version_confirmed`, never on
  `resume.version_created`.** The creation event is the obvious choice and it
  is wrong: it fires on every unconfirmed parse and every unconfirmed
  correction, so consuming it bypasses the gate *while the whole suite still
  passes* — the gate function stays intact and is simply never called.
  `tests/invariants/test_confirm_gate.py` fails the build on it.
- **Versions are append-only.** An edit creates a row chained by
  `supersedes_id`; the chain cannot fork (unique index) and `confirmed_at` is a
  latch (conditional UPDATE, `WHERE confirmed_at IS NULL`). An edit never
  inherits confirmation — that would be the gate reached through a side door.

Anything that feeds a deliberately unreadable document into the parse chain
will call **Textract for real** unless it is pinned to `LocalResumeParser` —
see the `local_parser_only` fixture.

## Scoring — the model reads, code scores

Three layers (`docs/scoring-approach.md` §4). Layer 1 reads a CV into facts
and bounded 0–4 ratings; Layers 2 and 3 are ordinary, versioned, tested code.
**The model never sees the weights and never returns a total**, so it cannot
aim at a target score and neither can anyone writing instructions into a CV.

- **The model's output is an *input* to scoring, captured once and stored.**
  `replay(score_id)` re-runs Layers 2 and 3 over the stored response and
  **never calls the model**, so a 2029 dispute about a 2026 score gets an
  exact answer. A mismatch raises rather than returning a different number.
- **The extraction cache is keyed on the CV text**, not the resume or the
  user: `sha256(normalised_text + model_id + prompt_version + schema_version)`.
  One model call per distinct CV ever. Two candidates with identical text
  share one row. **Tests that count model calls must use unique CV text** —
  cache rows outlive the test that wrote them.
- **There is no fallback extractor, deliberately.** With no model wired,
  `UnconfiguredResumeExtractor` raises and the score stays PENDING. A
  heuristic stand-in would produce a plausible wrong number, which is
  unfixable once a candidate has seen it (§11).
- **`scoring.repository.insert_score` is the only write path.** No update, no
  delete, and the app role holds neither grant.
- The display floor lives in `display_value`, applied at the serialization
  boundary and nowhere else — what is stored is what was computed.

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

## Employer tenancy and discovery — Day 9

- **`get_db` does not bind `app.tenant_id`.** A service reading an RLS table
  must call `set_transaction_tenant(session, ctx.tenant_id)` first, from the
  resolved membership and never from a path or body. Without it the policy
  matches nothing and reads come back empty, which looks like a missing row
  rather than a bug.
- **`current_business_identity` admits a business account with no
  membership.** It exists so an account can create its organisation, and it
  returns `BusinessIdentity`, not a `TenantContext`. Every route added to it is
  a way in that skips the membership check; keep it to the two it has.
- **Who an employer can see is `VISIBLE_CANDIDATES_CTE`, and nothing else.**
  Every discovery query is built on it, and a test enforces that. It fails
  closed: a candidate needs a score, an `integrity_checks` row for that version,
  and no HIGH signal that is OPEN or CONFIRMED. Only CLEARED restores.
- **The integrity task reads a score and never writes one** (SRS 1.4.5). It
  lives in `app/tasks/` because `integrity` may not import `scoring`, and a test
  fails the build if it names a scoring write path.
- **Manual-form resumes currently never score, so they never appear to
  employers.** `docs/blockers.md` E6.

## Streak points are not the score

`app/modules/engagement` (added 2026-09-13, `docs/streaks.md`) keeps daily
app-open streaks: −10 per break, +10/+15/+20 at 30/90/365 days. **Those points
are a separate balance and must never reach the 700–990 score.** Applied to
the score they break invariants 1, 2, 3 and 4′ at once: below the 700 base,
past 990, and not replayable. `engagement` and `scoring` are independent under
import-linter, employer-facing modules may not import `engagement`, and
`tests/invariants/test_streak_never_moves_the_score.py` guards both contracts
and the event routing table.

- **The numbers are config, not code:** `config_values` key
  `engagement.streak_rules`. Bad config raises rather than falling back.
  Every ledger row stores `rules_version`.
- **The day is IST and decided by the server.** A check-in carries no date.
- Streak integration tests inject `now`, so a config row they insert must be
  `effective_from` before the simulated day, not the real `now()`.

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
