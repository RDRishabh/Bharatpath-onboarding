# 01 — Architecture: how this backend is put together

Read [00-foundations.md](00-foundations.md) first if words like "endpoint,"
"token," or "migration" aren't yet familiar — this doc builds on them and
won't re-explain them.

Everything here is about the *shape* of the code, not any one feature. Once
this makes sense, every per-module doc later in this series will read the
same way, because every module is built to the same shape on purpose.

---

## 1. One codebase, two processes

```
backend/app/
├── main.py     ← FastAPI app. Run as:    uvicorn app.main:app
├── worker.py   ← Celery app.  Run as:    celery -A app.worker worker
├── core/       ← shared plumbing, used by every module
├── modules/    ← the actual features, one folder each
├── api/        ← wires all the modules' routers together
└── tasks/      ← background jobs (Celery) that don't belong to one module
```

`app/main.py`'s own docstring says it plainly:

> One deployable service consumed by all four surfaces... this is a modular
> monolith with hard internal boundaries enforced by import-linter.
> `uvicorn app.main:app` and `celery -A app.worker worker` run from the same
> container image, so the API and the workers can never drift on model
> definitions.

That last sentence is the reason it's built this way rather than as two
separate codebases: if the API and the worker were different programs, they
could each end up with a slightly different idea of what a `Score` row looks
like, and that mismatch would only surface as a production bug. One codebase,
one Docker image, two different commands to start it — means that can't
happen.

---

## 2. Anatomy of a module

Open any folder under `app/modules/` (e.g. `identity/`, `resume/`) and you'll
see the same files every time:

| File | What lives there |
|---|---|
| `router.py` | HTTP endpoints. Parses the request, calls `service`, returns a response. **No business logic, no database access.** |
| `service.py` | The business logic. "What should happen when someone applies to a job." Calls `repository` for data, calls other modules' services if it needs them. |
| `repository.py` | The only place that talks to the database for this module — raw queries via the ORM. No business logic here either; just "get me this row," "insert this row." |
| `domain.py` | Pure logic and pure data — rules, state machines, calculations that need **no** database, no clock, no I/O of any kind. e.g. "what stage can an application legally move to next." |
| `models.py` | The ORM table definitions — the Python classes that map to Postgres tables. |
| `schemas.py` | The shapes of HTTP request/response bodies (Pydantic models) — deliberately separate from `models.py`, because what an API returns and what's stored in a table are allowed to diverge (an API response never needs to leak an internal id or a `cognito_sub`, for instance). |
| `events.py` | Names for things that happened ("resume.version_confirmed"), used so other modules can react without directly calling into this one. |

**The call chain always goes one direction:**

```
HTTP request
     │
     ▼
  router.py     — "what did they ask for, is the shape valid"
     │
     ▼
  service.py    — "what are the rules, what has to happen"
     │
     ▼
  repository.py — "read/write the actual rows"
     │
     ▼
  Postgres
```

A router is not allowed to call a repository directly, skipping the service.
This is enforced by a tool called **import-linter** (`.importlinter`,
run as `lint-imports`) — not just a convention someone might forget, but a
check that fails the build if violated. Why it matters: the service layer is
where the *rules* live — permission checks, validation, "does this action
even make sense right now." If a router could reach the repository directly,
it would be possible to add a new endpoint that quietly bypasses those rules
by construction, not by anyone intending to.

### Worked example: `GET /me`

From `identity/router.py`:

```python
@router.get("/me", response_model=MeResponse)
async def me(user: CurrentUser) -> MeResponse:
    return MeResponse(
        user_id=user.user_id, role=user.role,
        pool=user.pool, tenant_id=user.tenant_id,
    )
```

Notice this one doesn't even call `service.py` — it's simple enough that the
router just repackages what it's handed. But look at `user: CurrentUser`.
That's not a coincidence of naming: **`CurrentUser` is where all the actual
work already happened**, before this function body ever ran. That's the
subject of the next section.

---

## 3. Dependencies: FastAPI's "run this first" mechanism

FastAPI lets a route declare that some value must be produced by another
function before the route body runs — that's what `user: CurrentUser` means.
`CurrentUser` is defined in `app/core/deps.py` as:

```python
CurrentUser = Annotated[TenantContext, Depends(current_user)]
```

which tells FastAPI: "before calling this endpoint, run `current_user()`,
and hand its return value in as `user`." If `current_user()` raises an error
(e.g. "not authenticated"), the endpoint body never runs at all — FastAPI
turns the exception straight into an HTTP error response.

This is the mechanism behind every cross-cutting check in the codebase:
authentication, role checks, subscription checks. They're not `if`
statements scattered inside every handler — they're declared once, in the
function signature, and FastAPI runs them before anything else.

---

## 4. Authentication: "who is this," and what can they do

This is the part of the codebase most worth understanding carefully, because
getting it wrong is the classic way multi-tenant systems leak one customer's
data to another.

### Step 1 — Cognito answers "who is this," and nothing more

This project uses **AWS Cognito** to actually authenticate people — verify
a phone OTP or a password + MFA code, and issue a signed token. There are
**two separate Cognito pools**:

- **Candidates** — phone OTP or email.
- **Business** (employers, colleges, platform staff) — password + mandatory
  software-token MFA.

Crucially, `app/modules/identity/router.py` has **no login endpoint**. Its
own docstring is explicit about why:

> Cognito owns the session and issues the tokens... Putting a login endpoint
> here would mean this service handling credentials, which is the liability
> the Cognito decision exists to avoid.

So this backend never sees a password. It only ever receives a token that
Cognito already issued, and its job is to *verify* that token (signature,
issuer, audience, expiry) and figure out what to do with the identity inside
it.

### Step 2 — our own `memberships` table answers "what can they do"

Here is the specific, deliberate decision that shapes the whole auth system,
from `app/core/deps.py`'s `current_user()`:

1. Verify the token → get a `cognito_sub` (Cognito's own id for this person).
2. Look up (or create, on first sign-in) **our own** `users` row for that
   `cognito_sub`.
3. Look up **our own** `memberships` table to get role + tenant — **not**
   read from any claim inside the token itself.

Why not just trust the token's own claims? Because a token is valid for its
whole lifetime (say, an hour) regardless of what happens after it's issued.
If someone's access is revoked — fired, company suspended — but the role is
read from the token, they keep working for up to an hour after being cut
off. Reading from our own database instead means a revoked membership stops
working on the very next request. Straight from the code's own comment:

> a claim goes stale and a revocation that does not take effect is the
> tenant-isolation failure SRS 2.24.7 forbids.

The cost of a database lookup on every single request is avoided by caching
that membership lookup in Redis for **60 seconds** — cheap the rest of the
time, and never more than 60 seconds out of date. That number is the
deliberate trade: instant token claims would be free but could be arbitrarily
stale; a 60-second cache on a database read costs microseconds and revokes
in seconds.

### The two pools can never cross over

A token from the candidate pool can never carry a business role, and vice
versa — checked explicitly, not just "it happens not to have one." Straight
from `deps.py`: if a candidate-pool token somehow resolves to a membership
row, that's treated as an error (`pool_role_mismatch`), not honoured — a
membership on a candidate identity would mean someone was granted staff
access to an account that never went through the business pool's MFA
requirement, which must never be trusted just because a row exists.

### Roles, at a glance

Defined in `app/core/deps.py`: `CANDIDATE`, `EMPLOYER_OWNER`,
`EMPLOYER_RECRUITER`, `EMPLOYER_VIEWER`, `COLLEGE_ADMIN`, `COLLEGE_STAFF`,
`PLATFORM_ADMIN`, `KYB_REVIEWER`, `INTEGRITY_REVIEWER`, `SUPPORT_AGENT`.

Authorization by role happens with `require_role(...)`, used as a dependency
just like `CurrentUser` — and it checks the role resolved in step 3 above,
never the URL. A candidate hitting an `/employer/*`-prefixed route is
rejected because of their role, not because of the path prefix; the prefixes
exist purely for humans reading the code.

### One identity, no tenant yet: `current_business_identity`

There's a narrow, deliberate exception: `current_business_identity()` admits
a verified business-pool account **even with no membership at all**. It
exists for exactly one situation — a brand-new business account has to be
able to *create* its own organisation, and it can't already belong to one at
that point. It's given its own type, `BusinessIdentity`, specifically so it
can never be confused with a real `TenantContext` and accidentally used to
read tenant-scoped data. Every route that uses it is a route that skips the
membership check, so — per the code's own comment — it's kept to exactly the
few places that genuinely need to run before a tenant exists.

### Paying gates: four separate checks, on purpose

Beyond "who is this" and "what role," several endpoints are gated further:

1. `current_user` — valid token, correct pool.
2. `require_role(...)` — correct role, from **our** table.
3. `require_active_subscription` — has this user/tenant paid at all (R13)?
4. `require_active_access_window` — is the employer's *current* paid period
   still open, specifically for the reveal action (R14)?

These are kept as separate functions, deliberately, because they fail with
**different error codes** that tell the client different things to do:
`subscription_required` means "go buy a plan"; `access_window_expired` means
"you were just using this — your period ran out." Merging them would still
work most of the time, but would occasionally tell a user the wrong thing to
do about their own account.

---

## 5. Tenant isolation: keeping companies' data apart

This is a system where many separate companies (employers, colleges) share
one database. The whole system's credibility depends on one company never
being able to see another's data, even by accident, even through a bug. The
codebase uses **three independent layers**, deliberately redundant:

### Layer 1 — Postgres Row-Level Security (RLS)

Postgres itself can be told: "on this table, a query may only ever see rows
matching this condition" — enforced by the database engine, below and
outside the application code entirely. Even a badly-written query, or a bug
in a repository function, cannot see another tenant's rows, because the
*database* refuses to return them.

### Layer 2 — `SET LOCAL app.tenant_id`, bound from the verified membership

RLS policies need to know *which* tenant the current database connection is
allowed to see. That's set once at the start of each request's transaction,
from `app/core/db.py`:

```python
async def set_transaction_tenant(session, tenant_id: UUID) -> None:
    await session.execute(
        text("SELECT set_config('app.tenant_id', :tid, true)"),
        {"tid": str(tenant_id)},
    )
```

Two details worth noticing because they're each the fix for a real bug
class:

- **`tenant_id` here is always the id resolved from the membership lookup in
  §4 — never a value taken from a URL, a request body, or a header.** If a
  tenant id could come from client input, a request could just claim to be
  a different tenant and RLS would honestly, correctly show that tenant's
  data — the isolation would be perfect and pointless, gated by nothing.
- **`is_local => true` is what makes this safe with connection pooling.**
  A database connection is reused across many different requests over its
  lifetime. `SET LOCAL` (which is what `set_config(..., true)` really is)
  ties the setting to the *current transaction only* — it evaporates the
  instant the transaction ends. Without it, one request's tenant binding
  could leak into the next, unrelated request that happens to reuse the same
  pooled connection.

(There's a matching `set_transaction_user()` for candidates, who don't
belong to any tenant at all — see §6.)

### Layer 3 — a repository-level filter, as belt and braces

Even with the above, repository code still filters by tenant explicitly
where relevant. Not because layers 1–2 are expected to fail, but because
defense in depth means no *single* layer's mistake is enough to cause a
leak.

### Why three layers instead of trusting the strongest one

Because each layer is a different kind of insurance: RLS protects against
a bug in *application* code; the transaction-scoped binding protects against
*stale or cross-request* state; the repository filter protects against a
mistake in the *migration/policy* layer. A failure in any one alone doesn't
break isolation.

---

## 6. Candidates are not tenants

A subtlety worth internalising early: **a candidate belongs to no company**.
`app.tenant_id` (§5) literally cannot represent them — it's either a specific
company's id, or unset. So candidate-scoped database policies read a
*different* setting, `app.user_id`, bound the same way
(`set_transaction_user`). A handful of specific policies check "is this the
signed-in candidate's own row" using that value — and only honour it when
*no* tenant is bound, so a business account's user id, if it somehow ended
up in that slot, would grant nothing.

The practical consequence you'll see repeatedly in later docs: any service
handling candidate-only data must remember to bind `app.user_id`, exactly as
a tenant-scoped service must remember to bind `app.tenant_id` — forgetting
either one doesn't crash anything. It just makes every query come back
empty, which looks exactly like "there's no data" rather than "you forgot a
step." That specific failure mode is called out more than once in this
project's own engineering notes, which tells you it has already happened at
least once in practice.

---

## 7. "Invariants": rules the code is not allowed to regress

Beyond the architecture, this project maintains a specific list of business
and legal rules — called **invariants** — documented in `docs/plan.md §1`.
A few examples that will come up constantly in the per-module docs:

- A score, once computed, must always be **replayable** from what was stored
  at the time — recomputing it later from the same stored inputs must give
  the *exact* same number.
- No age-related field may ever exist anywhere in the schema (a legal
  requirement, not a style choice).
- No financial-lending vocabulary ("credit score," "loan," "CIBIL," ...) may
  appear anywhere — this product is not, and must never look like, a credit
  or lending product.

These aren't just written down and hoped for — most are enforced
automatically: some by a script that scans the codebase
(`scripts/check_no_age_fields.py`, `scripts/check_vocabulary.py`), some by
automated tests (`backend/tests/invariants/`), some by the database schema
itself (a `CHECK` constraint that makes an illegal state impossible to
insert, not just discouraged). Each per-module doc in this series will point
out which invariants that module is responsible for, and how they're
enforced there specifically.

---

## What's next

This doc covered the shape every module shares. From here, the series goes
module by module, in roughly the order they were built (since each one leans
on the modules before it) — starting with `identity` (accounts, sessions,
memberships) and `resume` (the resume intake pipeline and the confirm gate),
then `scoring`, then outward through the employer, college, and payments
sides of the system.

See [README.md](README.md) for the index and current status of that series.
