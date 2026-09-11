# Progress log

Running record of what has been built, what is blocked, and what is next.
**Update this at the end of any session that changes state.**

`plan.md` §14 holds the formal tracker; this file holds the narrative and the
operational detail — resource IDs, gotchas, and the reasoning behind partial
states. Newest entries first.

---

## State at a glance

| | |
|---|---|
| **Branch** | `feat/day3-auth-identity` |
| **`main`** | green on all five CI jobs |
| **Tests** | 121 passing (local + CI) |
| **Coverage** | 70% |
| **Days done** | 1, 2 complete · 3, 4 partial |
| **Next** | Day 5 — permission matrix and the Week 1 gate |

### Blocked, and not on us

| Blocker | Blocks | Lead time |
|---|---|---|
| **TRAI DLT registration** | All SMS to Indian numbers | **2–4 weeks — longer than the sprint.** Binds the sender, not the gateway; neither Cognito nor Twilio removes it. **Start it.** |
| **Twilio account** | Phone OTP, the 3 Cognito custom-auth Lambdas | Days |
| **Google OAuth client** | Google federation on the candidate pool | Hours |
| **N7 — who makes the course?** | Day 15 scope | Unknown. Never asked. A course moves the score 30 points and nobody has said who produces it or what "completing" it means. |
| **N2 — can CV text leave India?** | Day 8 scoring design | Open. `ap-south-1` chosen so the answer cannot be wrong. |

---

## 2026-09-11 — Day 3/4 auth chain, and AWS

### Built

The identity spine (`PR #2`, `#3`, `#4`):

- `app/core/auth/` — pluggable `IdentityProvider`. `cognito.py` verifies RS256
  against pool JWKS **with the algorithm pinned**; `local.py` is a dev-only
  provider behind `AUTH_ALLOW_LOCAL_TOKENS`.
- `membership.py` — role and tenant from our `memberships` table, cached 60s in
  Redis. Never from token claims.
- `core/cache.py`, `core/ratelimit.py` — Redis lifecycle, fixed-window limiter.
- identity module router/service/repository/schemas; `test_auth_chain.py` (18 tests).

### AWS — applied and verified

Account `592033927084`, `ap-south-1`. 38 resources via `infra/terraform`.

| Resource | ID |
|---|---|
| Cognito candidate pool | `ap-south-1_afBHHXfyH` |
| Cognito business pool | `ap-south-1_w1u6W6fTP` (MFA required, admin-create only) |
| S3 | 6 buckets, `bharatpath-<name>-dev-592033927084`, private + AES256 + versioned |
| SQS | `bharatpath-tasks-dev` + DLQ |
| IAM | `bharatpath-app-dev`, least-privilege |

Verified rather than assumed: the **production** `cognito.py` path fetched live
JWKS from both pools and correctly rejected an `alg=none` forgery. App IAM
credentials were tested in both directions — S3/SQS succeed, bucket creation and
IAM listing are denied.

Deliberately **not** provisioned: RDS, ElastiCache, VPC/NAT, ECS. Those bill at
idle and are Day 20 concerns. Postgres and Redis stay in docker/CI.

### Four bugs CI caught that local checks had hidden

Worth reading before trusting a green local run:

1. **`pool: str` + hand-rolled validator** when `Pool` Literal existed, forcing a
   **malformed** `type: ignore`. mypy had never been run.
2. **`Routers never touch repositories`** forbade `router → service → repository`
   — the exact layering it exists to enforce. It could only pass on a module whose
   service does no persistence. Fixed with `allow_indirect_imports`, then verified
   it *still* breaks on a direct import.
3. **CI died in the migrations step**: the new `Settings` validator demands an auth
   mechanism, and CI set none. Invisible locally because `backend/.env` sets it and
   CI has no `.env`.
4. **`ModuleNotFoundError: No module named 'tests'`** — CI runs `pytest`; running
   `python -m pytest` puts cwd on `sys.path` and hid it. Fixed by making `tests` a
   real package.

**Lesson worth keeping: run the CI command, not your habitual one.**

---

## Earlier

- **Day 2** (2026-08-30) — baseline schema, RLS, append-only audit grants,
  idempotency, outbox, OpenAPI stub publish. 40 tables, 12 RLS policies.
- **Day 1** (2026-08-30) — scaffold, CI, 20 module skeletons, invariants 5 and 6.
