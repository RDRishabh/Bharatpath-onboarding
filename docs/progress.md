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
| **Branch** | `feat/day6-resume-intake` |
| **`main`** | green on all five CI jobs |
| **Tests** | 905 passing (local + CI) |
| **Coverage** | 77% |
| **Days done** | 1, 2 complete · 3, 4, 5, 6 partial |
| **Next** | Day 7 — versions, review, confirm gate, status polling |

> **Run the suite as CI does**, and `source .test-env.sh` first. Without it the
> four RLS tests fail for an environmental reason that looks exactly like a
> regression: the app connects as a role that is not subject to RLS, so
> `test_scores_are_insert_only` reports `DID NOT RAISE` rather than a
> permissions error. Same family as the `.env`-masking bug below.

### Deferred by decision — revisit before launch

| Item | Decided | Why deferred | What it takes to land |
|---|---|---|---|
| **Legacy `.doc` (OLE2) parsing** | 2026-09-11 | No maintained pure-Python reader; the alternatives are native binaries that would go in the Docker image. | Either drop `application/msword` from the accepted types, or add a converter. Currently accepted at upload and will fail at parse — **decide before launch**. |

> ⚠️ **Switching parser is not a drop-in.** Invariant 1 requires a score to be
> reproducible from the stored extraction chain. A different parser yields
> different text, so it yields a different score. `parser` and `parser_version`
> are stored per extraction precisely so a replay can tell which engine produced
> a score, and so a change is a **re-score**, not a silent drift.

**Full register: [`blockers.md`](blockers.md)** — 40 items by category.

### Blocked, and not on us

| Blocker | Blocks | Lead time |
|---|---|---|
| **Textract account activation** | OCR fallback for scanned CVs | `SubscriptionRequiredException` on a brand-new AWS account, with `AdministratorAccess` — so it is account activation, not IAM. Usually clears within hours. **Code is written and wired; run `backend/scripts/verify_ocr_fallback.py` once it clears.** |
| ~~TRAI DLT registration~~ | Every SMS | ✅ **Started 2026-09-11.** Still 2–4 weeks to clear; SMS to Indian numbers fails silently until it does. **The bodies to register are now drafted** — `notifications/templates.py`, `sms_templates()`. |
| **Twilio account** | Phone OTP, the 3 Cognito custom-auth Lambdas | Days |
| **Google OAuth client** | Google federation on the candidate pool | Hours |
| **N7 — who makes the course?** | **Launch, not the build** | Build unblocked 2026-09-11 with a placeholder course and a provisional, versioned completion rule. The product question is untouched: a completion still moves a real score by up to 30 points on criteria nobody has agreed. See `blockers.md` C1. |
| **N2 — can CV text leave India?** | Day 8 scoring design | Open. `ap-south-1` chosen so the answer cannot be wrong. |

---

## 2026-09-12 — Dishonest-CV rules, and the Round 7.10 content

Two client instructions, both of the form *"use your best knowledge"*:
Round 7.6 (integrity rules) and Round 7.10 (course, prices, question banks,
translations, SMS copy, design, form fields). **905 tests, up from 738.**

### Integrity — the rules that decide who gets hidden from search

`integrity/domain.py`, 40 tests. Eight rules, and the design is the *severity*
rather than the detection: HIGH suppresses a candidate from employer search
**before a human has looked**, so it is reserved for the two things that cannot
be an accident or a bad parse — instructions aimed at an automated reader, and
text deliberately hidden from a human one. Everything else is MEDIUM or LOW and
reaches a reviewer with the candidate still visible. A test pins that:
`test_only_the_two_deliberate_rules_can_ever_reach_high`.

**The prompt-injection patterns match imperatives, never nouns.** An AI
engineer's CV legitimately says "system prompt" and "prompt injection"; matching
those would suppress the best-qualified applicants for exactly the roles this
marketplace sells. `AI_ENGINEER_CV` in the tests is six real sentences that must
never fire.

Roughly half the tests assert a rule stays *quiet* — notice-period overlaps, a
mistyped year, a forgotten early job, an employment gap. Deliberately no rule
for gaps, for work predating a qualification (age reasoning, invariant 5), or
for cross-candidate duplicates (dropped by the client, R6).

New contract in `.importlinter`: **integrity must not import scoring** (SRS
1.4.5). Signals never move a number.

### Content — all of it placeholder, all of it flagged as such

| Produced | Where | Marker |
|---|---|---|
| Price list — 4 candidate periods, 3 employer, 4 college seat tiers, 2 one-offs | `subscriptions/catalogue.py` | `PLACEHOLDER_PRICING = True` |
| Course syllabus — 6 modules, 18 lessons, ~2h20 | `courses/catalogue.py` | `HAS_MEDIA = False`, every `asset_key` is `None` |
| Questionnaire — 12 questions, 4 sections | `questionnaire/bank.py` | `BANK_VERSION` |
| Interview — 3 sets × 6 questions, 5-dimension rubric | `interview/bank.py` | `BANK_VERSION` |
| Messages — 21 templates, 17 of them SMS | `notifications/templates.py` | every `dlt_template_id` is `None` |
| Translations — 8 locales × 32 keys | `app/core/i18n/` | native review still owed |
| KYB and college forms — 27 and 20 fields | `kyb/forms.py`, `college/forms.py` | `FORM_VERSION` |
| Design system + tokens | `docs/design-system.md`, `design-tokens.json` | no logo, C7 stays open |

Each marker is asserted by a test, so "this is still ours, not the client's"
survives a demo rather than living in a comment nobody reads.

### Decisions taken inside that work, worth knowing

- **The score is never drawn as a red-to-green gauge** (`design-system.md` §1).
  That picture is the visual language of an Indian bureau score, and it would
  undo in one screen what `check_vocabulary.py` protects in words. Recorded as
  data in `design-tokens.json → score.forbiddenForms` so a front-end can lint it.
- **Noto Sans per script.** Eight locales span six writing systems; a
  Latin-only typeface renders tofu on a user's first screen in their own
  language.
- **SMS is budgeted against 70 characters, not 160.** One non-GSM character
  switches the whole message to UCS-2 — which every Indian-language translation
  is. A test holds the English source under 130.
- **Interview feedback carries no points.** A completed session is +20 whether
  it went well or badly. Grading it would add a second unexplained hidden
  judgment underneath the first one.
- **The course syllabus never names a weight, band or cap** — tested. A course
  that taught the rubric would inflate every score without improving anyone.
- **The rubric never assesses accent, fluency, pace or pitch** — tested. In this
  market those measure schooling and region.
- **Consumer prices tax-inclusive, business prices exclusive.** Backwards, that
  is an 18% error found at the first GST filing.

### Found while building

- **E5 — hidden text is not extracted yet.** The rule is written and inert:
  `ResumeClaims.hidden_text` defaults to empty, so it never fires on a field
  nothing fills. Populating it needs a pypdf visitor reading font colour and
  size. Until then the most-documented CV gaming technique is undetected.
- **An open commercial question nobody has asked**: when a college buys seats,
  does the student still pay their own subscription? Both are priced as if the
  answer is yes, and if it is no the college price is far too low. See
  `blockers.md` C12.

---

## 2026-09-11 (later) — Day 5, Week 1 gate

### Built

- `tests/unit/test_permission_matrix.py` — role x guard matrix over all **10**
  roles (SRS 1.2; note the plan's prose says nine). Calls the dependency
  callables directly with a constructed `TenantContext`, so 10x10 coverage costs
  no database round trips. Also asserts `require_role` rejects an unknown role at
  *import* time, so a typo fails the build rather than silently admitting nobody.
- `tests/invariants/test_route_authorisation.py` — drives every documented route
  with no `Authorization` header and asserts 401/403 unless explicitly
  allowlisted, with the reason recorded beside each exemption.

121 -> 160 tests.

### Two judgement calls worth knowing

**The route guard asks the app, it does not read its dependency tree.** The
structural version needs FastAPI internals (`_IncludedRouter`,
`_EffectiveRouteContext`) that changed in this version and will change again —
and it only proves a guard is *declared*. Driving the route proves the request is
actually refused. Verified by adding a deliberately unguarded route and
confirming the test names it.

**Known limit, stated rather than hidden:** routes with
`include_in_schema=False` are invisible to it. Today that is only `/`, asserted
separately.

### Day 5 is partial, not done

The gate has four parts. Permission matrix, no-anonymous-access and the
audit/revocation tests are green. **Cross-tenant is proven at the database layer
only** (`test_rls_and_grants.py`), because the plan's "every tenant-scoped
endpoint" cannot be tested against five endpoints — the rest are Week 2. The
harness is in place; the HTTP-layer suite lands with the endpoints.

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
