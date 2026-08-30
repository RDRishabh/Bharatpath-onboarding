# BharatPath — Backend

One shared FastAPI service consumed by all four surfaces: the candidate mobile
app, and the employer, college and admin web consoles. Plus Celery workers
running from the same image.

The build plan, the client decision history, and the open questions live in
[`../docs/`](../docs/). **[`../docs/plan.md`](../docs/plan.md) is the working
document** — start there.

---

## Run it

```bash
cd backend
cp .env.example .env
docker compose up -d              # postgres, redis, localstack, mailhog

python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"

alembic upgrade head
uvicorn app.main:app --reload
```

- API — <http://localhost:8000/api/v1>
- Interactive docs — <http://localhost:8000/docs>
- Health — <http://localhost:8000/api/v1/health>
- Mail catcher — <http://localhost:8025>

Workers:

```bash
celery -A app.worker.celery_app worker --loglevel=info
```

## Checks

```bash
pytest                                  # tests
ruff check app tests scripts            # lint
mypy app                                # types — strict on every domain.py
lint-imports                            # module boundaries (invariant 4′)
python scripts/check_no_age_fields.py   # invariant 5
python scripts/check_vocabulary.py      # invariant 6
python scripts/gen_modules.py --check   # every module skeleton present
python scripts/export_openapi.py        # write openapi.json
```

---

## Layout

```
backend/
├── app/
│   ├── main.py             FastAPI factory, middleware, error handlers
│   ├── worker.py           Celery factory
│   ├── settings.py         env-driven; NOT where product numbers live
│   ├── api/                root router + health
│   ├── core/               db, tenant, deps, errors, audit, idempotency,
│   │                       outbox, pagination, logging, models
│   ├── modules/            20 modules, identical 7-file shape
│   └── tasks/              Celery tasks — thin wrappers over services
├── alembic/versions/       one migration per PR, never edited after merge
├── scripts/                invariant guards, module generator, openapi export
└── tests/
    ├── unit/               pure domain logic, no I/O
    ├── integration/        real Postgres via testcontainers
    ├── contract/           schemathesis + masking-leak assertions
    └── invariants/         one file per rule — never delete these
```

Every module has the same seven files:

| File | Rule |
|---|---|
| `router.py` | HTTP only. Never touches a repository. |
| `schemas.py` | Pydantic DTOs. The API contract. ORM models are never exposed. |
| `models.py` | SQLAlchemy ORM. |
| `repository.py` | All DB access. **Private to the module.** |
| `service.py` | Business rules, transaction boundaries. Never touches `Request`. |
| `domain.py` | Pure functions and state machines. No I/O. mypy strict. |
| `events.py` | Domain events, emitted through the outbox. |

**A module may import another module's `service`, never its `repository` or
`models`.** That single rule is what makes later service extraction mechanical
rather than archaeological, and `lint-imports` checks it in CI so it does not
depend on discipline.

Adding a module: append to `MODULES` in `scripts/gen_modules.py`, run it, done.

---

## The ten invariants

`docs/plan.md` §1 calls these architectural invariants, not features. Each is
pushed to the lowest layer that can enforce it — **database constraint >
repository query shape > domain service > API schema > UI** — and each has a
test in `tests/invariants/` that proves it.

| # | Rule | Enforced by | Status |
|---|---|---|---|
| 1 | Score reproducible (never explained) | Full extraction chain stored; `replay()` never re-invokes the model | Day 8 |
| 2 | Scale 700–990; 700 is a base, not a floor | Arithmetic, not a clamp — stored == displayed, always | Day 8 |
| 3 | Score never human-editable | No route accepts a score; app role has no `UPDATE` on `scores` | Day 8 |
| 4′ | Add-on contributions bounded and versioned | Caps as pure functions; `lint-imports` contract | Day 8 |
| 5 | No age-gating | `scripts/check_no_age_fields.py` | ✅ **green** |
| 6 | No financial framing | `scripts/check_vocabulary.py` | ✅ **green** |
| 7 | Masked without an active access window | `require_active_access_window`; schema cannot hold PII | Day 14 |
| 7′ | Every PII reveal audited | Audit row in the same transaction as the reveal | Day 14 |
| 8 | No job publish before KYB approval | Domain service + Postgres trigger | Day 10 |
| 9 | College consent required, every reveal audited | Consent joined by the query itself, not a Python `if` | Day 18 |

**Never delete an invariant test to make a build pass.** These are the tests you
show the client.

Three that are easy to get wrong:

- **Invariant 8's test runs with `kyb.require_approval` ON**, even though
  production defaults it off (R15). A gate only ever exercised in the config
  where it does nothing is not a tested gate.
- **Invariant 4′'s contract is inverted, not deleted.** The client reversed the
  original rule ("paid add-ons never change the score") on 2026-08-24. So
  `scoring` now *reads* add-on completion events, and the add-on modules still
  import nothing from `scoring` — which is what stops one awarding itself points.
- **Invariant 7′ is new.** Blanket employer access (R14) destroyed the natural
  one-row-per-unlock audit trail, but PRD rule 9 did not stop applying, so the
  audit moved to the read.

---

## Conventions

- **Base path** `/api/v1`. Version in the path, never a header.
- **Surface prefixes are namespacing, not authorisation.** A candidate hitting
  `/employer/*` is rejected by the role dependency, not by routing.
- **Cursor pagination**, never offset. `total` only where it is cheap and safe.
- **Async operations** return `202` with `{ job_id, status_url }`.
- **Errors** are RFC 7807 with a stable `code`. The backend never returns a
  user-facing English sentence — four clients localise into 6–8 languages.
- **A foreign tenant's resource returns 404, never 403.** 403 confirms it exists.
- **Timestamps** are UTC ISO-8601 with `Z`. Clients render IST; the server never does.
- **Enums** are `SCREAMING_SNAKE` matching the SRS state names exactly.
- **Money** is integer minor units (paise). Never a float, never `Decimal` at
  the API boundary.
- **Tenant IDs come from server-side membership.** Never from a path, query,
  body or header (SRS §2.24.7).
- **Product numbers are config rows, not constants.** Score base and ceiling,
  contribution caps, prices, view caps, expiry windows — all in `config_values`.
  Every number the client changed on 27 August was already a row, which is what
  made that rewrite seed data rather than a migration. Keep it that way.

---

## Where the schedule risk is

`docs/plan.md` §8 is a 20-day plan. The days dense with *judgment* rather than
typing are **8** (score reproducibility and the extraction chain), **14**
(access-window expiry, reveal audit at volume), **15** (two billing flows, one
a UPI e-mandate) and **18** (consent-gated analytics). AI accelerates writing
code far more than it accelerates deciding what the code should do. If the
schedule slips, it slips there.

**Blocked before Day 8:** client approval of `docs/scoring-approach.md`, the
data-residency decision, and the 50–100 CV calibration corpus. See
`docs/questions.txt`.
