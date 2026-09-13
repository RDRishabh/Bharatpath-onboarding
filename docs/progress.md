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
| **Tests** | 1406 passing locally 2026-09-13. `c50d246` green on CI; `59e9edc` pushed, CI not yet checked; Day 10 uncommitted. |
| **Coverage** | 85% |
| **Days done** | 1, 2, 5, 7, 10 complete · 3, 4, 6, 8, 9 partial |
| **Next** | Day 11 — job search, eligibility, apply and withdraw |

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

**Full register: [`blockers.md`](blockers.md)** — 45 items by category.

### Blocked, and not on us

| Blocker | Blocks | Lead time |
|---|---|---|
| **Textract account activation** | OCR fallback for scanned CVs | `SubscriptionRequiredException` on a brand-new AWS account, with `AdministratorAccess` — so it is account activation, not IAM. Usually clears within hours. **Code is written and wired; run `backend/scripts/verify_ocr_fallback.py` once it clears.** |
| ~~TRAI DLT registration~~ | Every SMS | ✅ **Started 2026-09-11.** Still 2–4 weeks to clear; SMS to Indian numbers fails silently until it does. **The bodies to register are now drafted** — `notifications/templates.py`, `sms_templates()`. |
| **Twilio account** | Phone OTP, the 3 Cognito custom-auth Lambdas | Days |
| **Google OAuth client** | Google federation on the candidate pool | Hours |
| **N7 — who makes the course?** | **Launch, not the build** | Build unblocked 2026-09-11 with a placeholder course and a provisional, versioned completion rule. The product question is untouched: a completion still moves a real score by up to 30 points on criteria nobody has agreed. See `blockers.md` C1. |
| ~~**N2 — can CV text leave India?**~~ | ~~Day 8~~ | ✅ **Closed 2026-09-11** (Round 7.2, *"can be"*) — this table was stale. Processing stays in `ap-south-1` anyway: it costs nothing and is the answer that stays right if the position changes. |

---

## 2026-09-13 (evening) — Day 10: KYB and jobs; Bedrock connected; Week 1 gate closed

**1237 -> 1406 tests.** `59e9edc` carries the Bedrock connection, integrity
thresholds as config and the cross-tenant suite; Day 10 is uncommitted.

### Day 10 — KYB, jobs, invariant 8

- **R15 is one switch.** `config_values` key `kyb.require_approval`,
  `{"enabled": true|false}`, off when absent. Off: a complete submission is
  approved on arrival and marked `auto_approved`. On: it waits at SUBMITTED for
  a reviewer. A malformed row refuses with `kyb_config_invalid` rather than
  guessing: guessing "off" approves organisations nobody meant to approve.
- **Answers are validated on the server** against the published form, by a new
  `app.core.forms.validate_answers`. Every problem is returned at once, by field
  and code. Until now nothing checked a submitted form; the patterns in the
  definition were hints to the browser only.
- **Documents follow the CV intake rules.** The server derives the key, the
  type is sniffed from the bytes (PDF, JPEG or PNG), size is capped at 10 MB, a
  rejected object is deleted, and completing twice is a retry.
- **Each decision is mirrored onto `employers.kyb_status`**, the column the
  publish trigger reads, through `employer.service.set_kyb_status` only. A
  profile edit cannot set it.
- **Jobs.** DRAFT -> PUBLISHED -> PAUSED -> PUBLISHED -> CLOSED. CLOSED is
  terminal. A job is editable only as a draft or while paused, so nobody applies
  on terms that are then changed. A smuggled `status` is a 422.
- **Invariant 8 is held twice**: a service check that can say what to do, and
  the trigger that nothing can route around. The trigger re-checks on
  PAUSED -> PUBLISHED, so losing verification keeps a paused job off the board.
  Tested with the switch on, and through a direct repository call.
- **Threshold preview is treated as the leak vector the plan names.** Thresholds
  in steps of ten, counts floored to the nearest ten, anything under ten
  reported only as "fewer than ten", 30 previews an hour per organisation.
- **The Week 2 path works through the API alone**: sign up, complete KYB,
  publish a job. Tested end to end, with nothing set behind the API's back.

### Found while building

- **`reference.INDIAN_STATES` did not exist.** Both the KYB and college forms
  name it as an options source, so every state an employer chose would have been
  refused. Added in `app/core/reference.py`, where both modules can use it
  without importing each other.
- **KYB submissions had nowhere to store their answers.** Added `answers`,
  `form_version`, and a partial unique index allowing one open submission per
  organisation.
- **No reviewer can exist** (E10). A membership needs a tenant, and tenants are
  only EMPLOYER or COLLEGE. KYB and integrity review actions are built and tested
  in their services, with no routes until platform-staff tenancy is decided.

### Also today

- **Manual-form CVs now go through Layer 1**, rendered to text without the name
  or the graduation year (E6 closed in code). A correction to what I told the
  client: they cannot be scored without a model. Scoring the form directly would
  give zero for the three judgments only the model makes, so the same career
  would score lower through the form than through an upload.
- **Bedrock extractor built**, off by default, with no default model. Terraform
  grants invoke-only on the four offered models; planned, not applied.
- **Integrity thresholds are config.** Every number is in
  `integrity.thresholds`; `thresholds_version` is stored on every signal and
  check; a bad row stops the check.
- **Week 1 gate closed.** The cross-tenant suite enumerates every tenant route
  with an id from the running app, and a new route without a 404 case fails the
  build. It caught all six Day 10 routes the moment they existed.

### AWS, checked live on 2026-09-13

- **Bedrock:** "account being verified" has cleared, but every model, Amazon
  Nova included, returns `Operation not allowed`. Claude shows `NOT_AUTHORIZED`
  and the Anthropic use-case form has not been submitted.
- **Textract and GuardDuty:** `SubscriptionRequiredException`, in two regions.
  The Health dashboard does not show per-account service activation. Needs a
  support case.

### Owed

- The subscription gate on jobs and KYB (Day 15; pay-first, R13).
- Reviewer routes for KYB and integrity (E10).
- Model choice, the Terraform apply, and AWS service activation. Until then the
  Week 2 gate's "20 real resumes, upload to score" cannot run.

---

## 2026-09-13 — Day 9: integrity on real CVs, suppression inside discovery, employer tenancy

**+80 tests.** Built in the same working tree, at the same time, as the streak
work in the next entry, by a second session. Neither overwrote the other, the
combined suite passes, and **both are uncommitted**.

### What landed

| | |
|---|---|
| **Integrity runs on real CVs** | `scoring.score_computed` routes to `integrity.detect`, which reads the stored Layer 1 extraction and the CV text, runs the eight rules, and persists signals. Idempotent by resume version. |
| **Suppression lives inside discovery** | One CTE, `VISIBLE_CANDIDATES_CTE`, that every discovery query is built on. `test_discovery_suppression.py` fails the build if a query skips it. |
| **Employer tenancy** | Create an organisation, the three employer roles, and add, re-role and remove members by email. Eight endpoints; every team change audited without the address. |

### Four decisions worth knowing

- **Visibility fails closed.** Integrity runs asynchronously after scoring, so
  a candidate briefly has a score and no signals. Without a record that the
  check ran, *no signals* cannot tell *clean* from *not yet looked at*, and a CV
  carrying injected instructions would be searchable for exactly that window.
  A new `integrity_checks` row closes it: **unchecked means invisible**.
- **A confirmed dishonest CV stays hidden.** The existing partial index matched
  `state = 'OPEN'` alone, so a reviewer *confirming* manipulation would have put
  the candidate straight back into search. OPEN and CONFIRMED now both suppress,
  and only CLEARED restores. The index and the CTE share one predicate, asserted
  character for character so the planner can use the index.
- **Suppression is candidate-wide, not per version.** Otherwise: inject, get
  flagged, upload a clean copy, and reach employers before anyone has looked.
- **Dates are dropped, never guessed.** Layer 1 captured only durations, so the
  timeline rules were unreachable from a real CV. Schema v2 adds role dates, with
  a month only where the CV states one. "2019–2021, 2021–2023" rounded to
  January starts and December ends becomes eleven months of two full-time jobs.
  The whole-career rules run only when every role is month-dated. Scoring reads
  none of the new fields — asserted.

### Employer onboarding

- **Creating an organisation was unreachable.** `current_user` refuses a
  business account with no membership, and an account cannot create its
  organisation if it must already belong to one. New `current_business_identity`
  returns a `BusinessIdentity`, deliberately not a `TenantContext`, and backs
  exactly two routes.
- **`get_db` never binds `app.tenant_id`.** The employer service binds it from
  the resolved membership before every read. Without that, RLS on `employers`
  returns nothing, which looks like a missing row rather than a bug.
- **One organisation per account, checked against raw `memberships`.**
  Authorisation hides a suspended tenant's membership, so a naive check would let
  the owner of a suspended employer start a fresh one. Tested.
- **Concurrency.** The last-owner rule holds under `FOR UPDATE`; one account,
  one organisation holds under an advisory lock.
- **No enumeration oracle.** Adding an address that belongs to a candidate or to
  another employer's member returns one identical refusal, so no employer can
  test whether a person is registered.

### Found while building

- **`module-privacy` had been wrong since Day 1.** Missing
  `allow_indirect_imports`, it forbade `employer.service -> identity.service ->
  identity.repository`, the path it exists to funnel traffic into. Invisible
  until a module first called `identity.service`. The third time this exact bug
  has appeared in `.importlinter`; a direct import was re-verified to break it.
- **Manual-form resumes never score, so they never reach employers.** Day 8
  scoring refuses a version with no free text; Day 9 visibility requires a
  score. Recorded as `blockers.md` E6.
- Two test bugs, not code bugs: raw SQL used the ORM attribute
  `event_metadata` rather than the column `metadata`, and a resolve test passed
  a random reviewer id into a real foreign key.

### Owed before Day 9 is done

- **Rule thresholds in `config_values`.** Rules are versioned but the numbers
  are still named constants in `integrity/domain.py`.
- The reviewer-queue routes (Day 19). `resolve_signal` exists; no HTTP route yet.
- Hidden-text extraction (E5), so `HIDDEN_TEXT` stays inert.
- CI has not run on this tree.

---

## 2026-09-13 — Daily streaks and engagement points (client request)

**+111 tests, one new module (`engagement`, the 21st), three endpoints, two new
import-linter contracts.** Outside the twenty-day schedule. Full write-up:
[`streaks.md`](streaks.md).

### What was asked, and the contradiction in it

The client asked for LeetCode-style streaks: −10 points when a streak breaks,
and +10/+15/+20 at 30/90/365 days, all configurable. The request does not say
*which* points. **Read as points on the candidate score, it breaks invariants
1, 2, 3 and 4′ at once:**
- a −10 takes a fresh 700 below its base, and milestones take 990 past the
  ceiling, so both writes would hit the CHECK constraints;
- "opened the app" is not an input `replay()` can reproduce;
- 700 + 200 + 30 + 60 = 990 has no room for another contributor.

**Built as a separate engagement-points balance**, and kept separate
structurally rather than by convention:
- an import-linter **independence** contract between `engagement` and
  `scoring`;
- a forbidden contract stopping employer, jobs, applications, discovery,
  college and analytics from importing `engagement`;
- `tests/invariants/test_streak_never_moves_the_score.py`, which guards both
  contracts and the task routing table (routing holds task *names*, so an
  import contract alone would not catch a subscription).

Confirming this with the client is **S1** in `streaks.md` §7, along with *what
the points are for*: nothing spends them yet.

### Decisions taken inside it (S2–S8, all cheap to reverse)

- **One deduction per break**, however many days were missed. The **balance is
  floored at 0**, and the ledger stores `requested_points` beside `points` so
  clipping stays visible.
- **Milestones once per streak run**, re-earnable after a break. Nothing past
  365.
- **The day is IST, decided by the server.** A check-in carries no date,
  because one that did could keep a streak alive forever. Fixed offset, not
  `ZoneInfo`: IST has no DST, and `ZoneInfo` needs `tzdata` on Windows.
- **A break shows at once, and the deduction lands at the next check-in.**
  `GET` returns BROKEN with streak 0 immediately; no nightly sweep.
- **Candidates only, and not behind the subscription gate.** Behind the
  paywall, a lapsed subscriber would lose points for not paying rather than
  for not opening the app.

### How "configurable" is made true

- **Every number lives in `StreakRules`**, loaded from `config_values` key
  `engagement.streak_rules`: the highest version whose `effective_from` has
  passed. With no row, `DEFAULT_RULES` applies.
- **`check_in` names no number.** `test_without_a_milestone_at_thirty_nothing_is_awarded_at_thirty`
  proves it.
- **Parsing is strict.** An unknown key, a boolean, a negative value or a
  duplicate milestone raises `streak_rules_invalid`. Falling back to defaults
  would make a misspelt row look applied.
- **Every ledger row stores `rules_version`.**

### Guarantees and where they live

| Guarantee | Mechanism | Test |
|---|---|---|
| Two devices checking in at once count once and deduct once | `SELECT … FOR UPDATE` after `INSERT … ON CONFLICT DO NOTHING` | `test_two_simultaneous_first_opens_count_once`, `test_simultaneous_opens_after_a_break_deduct_once` |
| The ledger cannot be rewritten | `REVOKE UPDATE, DELETE ON streak_point_events` | `test_the_points_ledger_is_append_only` (as the app role) |
| Balance never negative | Domain floor + CHECK on both tables | 25-seed property test; `test_the_database_refuses_a_negative_balance` |
| A milestone once per run, a break once per day | Partial unique indexes | — (belt and braces behind the lock) |
| Streaks never write a score | Independence contract | `test_streak_points_never_write_a_score` |

### Found while building

- **A test simulating March 2026 cannot use a config row effective from the
  real `now()`.** The row is in the future relative to the injected clock, so
  the "config changes the numbers" test silently ran on the defaults. The
  fixture now defaults `effective_from` to 2000-01-01. Noted in `CLAUDE.md`,
  because the next time-injected test will hit the same thing.
- **Python-side `default=0` does not help a raw SQL insert.** The
  negative-balance test failed on NOT NULL before the CHECK was reached. The
  integer columns now carry server defaults too.
- **Parallel work in the same tree.** Day 9 integrity changes (`integrity/`,
  `discovery/`, `scoring/service.py`, `tasks/routing.py`, `integrity_checks`
  in the baseline) appeared uncommitted during this session. They were left
  untouched. `mypy app` currently reports 3 errors there, and `ruff` reports
  E501 in `discovery/repository.py`. **Both are outside `engagement`, and both
  will fail CI until that work is finished.**

### Schema

The baseline migration gains `user_streaks` and `streak_point_events`. As
always, **rebuild with `reset_local_db.sh`**: 43 tables and 12 RLS policies
with the Day 9 work included.

---

## 2026-09-12 — Day 8: the scoring pipeline, and invariants 1–4′

**958 -> 1046 tests.** The client accepted the calibration (35/35 "about
right"), which took the rubric from provisional to agreed, and the rest of Day
8 followed: Layer 2, the extraction cache, persistence, replay, the display
floor, the candidate route and the trigger.

### Invariants 1, 2, 3 and 4′ are green

| # | What makes it true |
|---|---|
| **1** | `replay(score_id)` re-runs Layers 2 and 3 over the **stored** model response and never calls the model. Tested with add-on contributions, not only base scores — a replay that only reproduces base scores breaks the first time someone buys a course. A mismatch **raises**: a replay that quietly disagreed would be used to answer a dispute and would answer it wrongly. |
| **2** | CHECK constraints hold 700–990 and `raw = base + addon`. `display_value` applies the floor at the serialization boundary **and nowhere else**, so what is stored is what was computed. Asserted across all 291 values in range. |
| **3** | `repository.insert_score` is the only write path; there is deliberately no update and no delete function, and the app role holds neither grant. |
| **4′** | Exercised end to end through the real write path: a caller asking for 500 + 500 add-on points gets 90, and the decomposition still sums. |

### The design decision that carries the most weight

**The model's output is an input to scoring, captured once and stored — not a
step in the computation.** Everything else follows from that. Replay is
bit-identical in perpetuity because it re-reads a stored JSON blob rather than
re-asking a model that may have been retired, upgraded or simply moved on.

The cache key is `sha256(normalised_text + model_id + prompt_version +
schema_version)` — **not the resume id and not the user id**. So the model is
called once per distinct CV ever; two candidates with identical text get
identical extractions because it is literally the same row; and re-scoring
after a course purchase is Layer 3 only, costing nothing and unable to drift.

### Decisions taken inside that work

- **There is deliberately no heuristic fallback extractor.** With no model
  wired, `UnconfiguredResumeExtractor` raises and the score stays **PENDING**.
  A keyword-matching stand-in would produce a plausible wrong number, which
  `scoring-approach.md` §11 forbids: unfixable once the candidate has seen it,
  and a dispute we cannot win. A test asserts an unconfigured build yields
  pending rather than 700.
- **Experience is summed from the roles, not read from the model's own
  total.** The roles are checkable and the total is not; a model that
  miscounts its own arithmetic must not move a score by 55 points.
- **An unrecognised job title resolves to `unknown` and scores zero.**
  Guessing is how a scoring system starts rewarding inflated titles. Longest
  match wins, so "Senior Vice President" is an executive, not a senior.
- **Layer 2 is total, never raising.** It runs against extractions stored
  years earlier under a schema that has since moved on, and a replay that
  throws cannot answer a dispute — which is the one thing it exists to do. A
  malformed field degrades that dimension to zero.
- **Skill evidence is the mean, rounded down**, over *distinct* skills. A CV
  with one well-evidenced skill and nine bare keywords is mostly a keyword
  list; rounding up would pay for the keywords.
- **STRONG runs to 990, not 900.** 900 is the resume-only ceiling. Stopping
  the top band there would leave every candidate who bought an add-on in no
  band at all — and the band is what an employer sees (R4).
- **`ALGORITHM_VERSION` is composed** from the taxonomy and rubric versions
  rather than being a number somebody has to remember to bump.
- **`prompt_hash` is stored beside `prompt_version`.** The version is a label
  a human maintains and can forget; the hash is computed and cannot be, so a
  replay comparing both can tell a deliberate change from a careless one.

### The Day 8 trap, closed at the place it would actually be sprung

Day 7 left a tripwire: scoring must consume `resume.version_confirmed`, never
`resume.version_created`. That test scanned `app/modules/scoring/` for the
wrong event name — which would not have caught anything, because **the
subscription does not live in that module**. It lives in the task wiring.

So `app/tasks/routing.py` now holds one table mapping event to task, and the
invariant test asserts against the table directly: the confirmed event routes
to scoring, the created event does not, and the routed task name is one a
worker actually registers. That last one was verified by renaming the task and
watching it fail — a routing table pointing at a name nobody registers is
wiring that reads as working and does nothing, and the symptom would have been
scores that never appear rather than an error anyone sees.

### Found while building

- **My own new import-linter contract was wrong.** `resume-internals-are-
  private` (added yesterday) forbade the *indirect* chain
  `scoring.service -> resume.service -> resume.repository`, which is the exact
  path the contract exists to funnel traffic into. Same failure the `layers`
  contract hit on Day 3, with the same fix (`allow_indirect_imports`). Re-
  verified that a **direct** import still breaks it.
- **The extraction cache made tests order-dependent, correctly.** Several
  tests shared one CV body, so the second to run saw zero model calls and
  failed an assertion about caching. That is the cache doing exactly what it
  promises — one call per distinct CV **ever**, across users and across time,
  with rows outliving the test that wrote them. Fixed by giving each test its
  own document, not by weakening the cache.
- **The invariant-5 checker caught my own test.** A test asserting the
  extraction schema has no date-of-birth field had to *name* the field to do
  so, which trips `check_no_age_fields.py`. The script exempts exactly one
  file — invariant 5's own test — and diluting that for convenience would
  weaken a legal-requirement guard. Rewritten to assert on the prompt text
  instead; repo-wide field absence was already guaranteed by the existing
  test.

### Owed before Day 8 can be called done

- **The Layer 1 model client.** The seam is real, exercised and tested; the
  client lands when credentials do. Nothing else moves when it does — the
  cache, Layers 2 and 3, persistence and replay all sit behind
  `get_resume_extractor` and none of them knows which extractor produced a
  result.
- **The shareable card** (band by default, exact number on explicit opt-in,
  opaque revocable token). Not started.
- **The outbox -> broker hop** remains the pre-existing Day 19 TODO. The
  subscription table is declared and tested; `_publish` still logs rather than
  enqueuing.

---

## 2026-09-12 (later still) — C12 closed, and the college price list rebuilt

The client answered the one open question that moved a revenue number rather
than a date: **"No - Student does not pay if the college has paid for it."**

### What was wrong, and why nothing caught it

C12 had never been put to the client. Both price lists were built on the
unexamined assumption that a seat and a subscription were separate purchases —
a college deal earning its seat fee *on top of* whatever those students paid
directly. On that reading, ₹12–17 per seat per month was a placement-cell tool
sold alongside real candidate revenue, and it looked entirely reasonable.

The answer is the opposite. The seat fee is the **entire** lifetime revenue
from that student, which put the old ladder at **13–18% of what the same
student was worth unsigned**. A thousand-seat annual deal would have displaced
roughly ₹10.2 lakh of candidate revenue to book ₹1.4 lakh — every college
signed would have made the business smaller.

**Nothing failed, and that is the part worth keeping.** Every price check in
the suite was structural: totals ascending with seat count, longer periods
never costing more per month, tax flags correct per audience. All of them
passed. A number can satisfy every structural invariant while being an order of
magnitude wrong about *what it is selling*, and the figure that would have
shown it — revenue per seat — was not computed anywhere in the codebase.

### What replaced it

A seat is now priced as what it is: a **bulk-rate candidate subscription**,
discounted for volume rather than invented independently. The discount is real
— one invoice, upfront, students at zero acquisition cost, onboarding carried
by the college — but it is a discount on a known number.

| Plan | Old | New | Per seat, ex-tax | Yield vs direct |
|---|---|---|---|---|
| `COLLEGE_SEMESTER_250` | ₹24,999 | **₹69,999** | ₹279.99 | 17% → **47.3%** |
| `COLLEGE_SEMESTER_1000` | ₹79,999 | **₹2,19,999** | ₹219.99 | 13% → **37.1%** |
| `COLLEGE_ANNUAL_250` | ₹44,999 | **₹1,19,999** | ₹479.99 | 18% → **47.2%** |
| `COLLEGE_ANNUAL_1000` | ₹1,39,999 | **₹3,79,999** | ₹379.99 | 14% → **37.4%** |

~2.7x across the board. That is not a price rise; it is the first list being
wrong about what it was selling.

- **`PLACEHOLDER_PRICING` is still `True`.** These still need sign-off. They
  are now wrong in a direction that costs a deal rather than the business.
- **Ex-tax on both sides.** Candidate prices are inclusive, business prices
  exclusive, so the raw numbers are not comparable — comparing them directly
  flatters a seat by 18%. `GST_RATE` is now a constant in the catalogue rather
  than something applied only at the invoice, because that comparison became a
  revenue decision rather than a presentational one.
- **`MIN_SEAT_SHARE_OF_DIRECT = 0.35`** with
  `test_a_seat_never_undercuts_direct_candidate_revenue`, so this cannot drift
  back by increments. Verified against all four old prices: every one is
  caught. A companion test asserts every college period has a candidate plan of
  the same duration to price against — without it the floor silently skips.

### The engineering consequence, recorded before Day 15 builds it

A seated student pays us nothing and must still get in, so
**`require_active_subscription` is a check with two limbs**: a personal
subscription **OR** an active college seat. It is still a stub, which is why
this answer arriving now rather than on Day 15 is worth something.

`college_seats` is therefore an **entitlement row, not an allowance counter**.
Withdrawing a seat is an access change, not an administrative one, and
`seats_used` being off by one is either a student locked out of something
bought for them or a student we carry free. Both `deps.py` and
`college/models.py` now say so at the point someone will read them.

It also raises the stakes on an older open question — what happens at the 501st
student on a 500-seat plan. Over-allocating no longer over-serves a seat; it
gives away a full subscription.

### Three things the answer opens, none blocking

Consequences, not restatements. All three need answering before the first
college contract, and none of them stops the build:

1. **A student who already paid, then joins a roster.** Refund, credit, or
   their subscription simply runs alongside? We are building the third — no
   money moves without a human — but someone who paid ₹1,199 in June and is
   seated free in July will ask.
2. **Non-renewal.** Students lose access in batches of 250 or 1000, on a date
   known in advance. That wants a deliberate grace period, not a hard cutoff
   discovered live.
3. **Do add-ons ride along?** Our assumption: a seat covers the **subscription
   only**; the course (+30) and interview sessions (+60) stay the student's own
   purchase. Otherwise a 1000-seat deal silently includes ~₹8.5 lakh of add-on
   inventory. Flagged rather than assumed.

Full detail: `answers-log.md` Round 8.

---

## 2026-09-12 (later) — Day 7: versions, review, the confirm gate

**905 -> 954 tests.** Four endpoints, one new import-linter contract, and the
half of SRS 1.4.4 that had to be built before Day 8 could be trusted.

### The confirm gate is enforced three times, on purpose

SRS 1.4.4 says an unconfirmed version can never reach scoring. Scoring is Day
8, so a gate written as a service function and nothing else would be a
convention waiting to be forgotten by the first caller who did not know it
existed. So it is enforced at three levels, and each catches a different
mistake:

1. **A SQL predicate.** `latest_confirmed_version` filters
   `confirmed_at IS NOT NULL` in the query, so the unconfirmed row is never
   loaded at all. A Python check after the fetch can be skipped by the next
   caller; a row that was never selected cannot.
2. **A new import-linter contract**, `resume-internals-are-private`. This was
   a real gap: `module-privacy` only protected `identity`, so any module could
   have imported `resume.repository` and reached `list_versions`, which
   returns unconfirmed rows quite correctly for the review screen. Verified by
   adding a deliberate import to `scoring/service.py` and confirming it breaks.
3. **A build tripwire for the Day 8 mistake.**
   `test_scoring_is_not_wired_to_the_version_created_event`.

### The third one is the one worth reading

`resume.version_created` is the obvious event to recalculate a score from — it
fires whenever a resume changes, which sounds exactly right. It also fires on
every **unconfirmed** parse and every **unconfirmed** correction, so
subscribing to it bypasses the gate completely **while every other test in the
suite still passes**, because the gate function is intact and simply never
called.

Confirming therefore emits its own event, `resume.version_confirmed`, and that
is the one scoring consumes. The tripwire fails the build if anything under
`app/modules/scoring/` so much as mentions the creation event. Both tripwires
were verified by breaking them deliberately and watching them fire.

### Decisions taken inside that work

- **The chain cannot fork, and the database is what says so.** A unique index
  on `supersedes_id` (partial, `WHERE NOT NULL`, so the many chain heads are
  unaffected) means at most one version supersedes any parent. The service
  also returns a 409, but two concurrent edits would both read "not yet
  superseded" and both write — the service check is for the error message,
  the index is for the guarantee. `IntegrityError` is translated into the same
  409 so a client sees one behaviour rather than a 409 or a 500 depending on
  timing.
- **`confirmed_at` is a latch, not an assignment.** `confirmed_at IS NULL` in
  the WHERE clause of a conditional UPDATE. Confirming twice is a retry that
  returns the *original* timestamp: when a candidate took responsibility for
  scored content is a fact about them, not about how many times their phone
  lost signal. It is also the one permitted mutation of a version — content
  stays immutable, and there is still no update path for `parsed`.
- **An edit never inherits confirmation.** This is the side door the gate
  exists to close: if a correction carried the confirmation forward, editing
  would be a way to change scored content with nobody reviewing it. A
  correction is unconfirmed and goes back through review.
- **A superseded version is closed to both editing and confirming.** One pure
  predicate, two callers, so they cannot drift. Confirming a replaced version
  would make content the candidate has moved on from scorable, because the
  gate asks whether a version is confirmed, not whether it is current.
- **The last confirmed version stays scorable while a correction is in
  progress.** A candidate who starts an edit and abandons it half way still
  has the resume they approved.
- **`EDIT` is a version source, not a flag.** "Did a human assert this
  content?" is the question integrity review and score provenance both ask,
  and as a source it is one column rather than a walk up `supersedes_id`.
- **Edit provenance keeps the origin flat.** The obvious implementation nests
  the previous extractor, so a candidate who tidies their CV thirty times
  stores thirty levels of JSON and a replay has to recurse to find which
  engine read the document. Instead `origin` holds the machine extraction the
  chain started from, copied forward unchanged, and `edit_generation` counts
  the corrections — so both questions a replay asks stay one lookup deep. A
  test runs thirty generations.
- **An edit is a whole replacement, not a patch.** The merge rule for a
  partial update — what happens to an employment row the candidate deleted, or
  one the parser invented — is exactly the thing nobody would agree on later.
  `extractor` is rebuilt rather than accepted, so a client cannot post an edit
  claiming its text came from the parser.

### Polling: the 202 now leads somewhere

`resume_files` gained `parse_status` and `parse_error_code`. Before this, the
only observable signal was whether a version existed, which **cannot tell
*waiting* apart from *never going to work*** — a CV we cannot read left the
client polling an endpoint that would never change and never say why.

- **There is deliberately no RUNNING state**, and a test says so rather than
  leaving it to be added. A worker that claims a file and dies leaves RUNNING
  behind with nothing to sweep it, so the state that exists to reassure the
  candidate becomes the one that strands them. QUEUED means "not finished" and
  redelivery fixes it by itself.
- **BLOCKED and FAILED are different advice.** A file the scanner holds may be
  perfectly readable; telling the candidate to re-upload it sends them round a
  loop that ends the same way.
- **A missing object is a parse failure, not a scan one.** It used to be
  recorded on `scan_status`, which read later as "the scanner failed" — two
  different facts in one column, and the wrong one.
- A CHECK constraint holds `parse_status = FAILED` and `parse_error_code IS
  NOT NULL` in step, so a FAILED that says nothing and a DONE still carrying
  the last attempt's error are both impossible.
- Completing an upload is idempotent, so it now reports the row's real parse
  state rather than a hardcoded QUEUED — a client retrying after the worker
  ran was being told to poll for work already finished.

### Found while building

- **A test that fed in an unreadable PDF was calling AWS.** Correct parser
  behaviour — an unreadable PDF is exactly what the OCR fallback is for — but
  it made the test depend on credentials, the network and Textract's account
  state, and it would bill per page if it ever succeeded. It "passed" only
  because this account still returns `SubscriptionRequiredException`. Pinned
  to the local parser with a fixture at the `get_resume_parser` seam. **Worth
  remembering for Day 8:** anything that feeds a deliberately bad document
  into the parse chain reaches for Textract unless it is pinned.
- **Every source still requires confirmation, including MANUAL.** The argument
  for exempting it is real — the candidate typed it themselves, so there is
  nothing extracted to review. It is not exempted anyway: one gate with no
  exceptions is testable, and the confirm step is also the moment the
  candidate accepts that a number will be attached to this.

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
