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
| **Tests** | 2324 on 2026-09-17 (Day 20), not yet pushed. 2247 (Day 19). 2079 (Day 18), **all five CI jobs green on PR #11** (`e1f3a97`), first push. 2018 (Day 17), **all five CI jobs green on PR #11** (`f65fa3d`) — the first push failed one test that relied on the catalogue seed, which CI never runs. Day 16: 1898. Day 15: 1820. Day 14: 1714. Day 13: 1663 — first push failed CI on a flaky test of ours, fixed (see Day 13). Day 12 (`65ba18e`): 1591, **all five CI jobs green on PR #8**. |
| **Coverage** | 84% |
| **Days done** | 1, 2, 5, 7, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20 complete · 3, 4, 6, 8, 9 partial |
| **Next** | **The twenty days are done.** What is outstanding is external or unscheduled rather than unbuilt: the sweeps' schedules (E4), a payment gateway (D3), DLT and Twilio (D1, D2), AWS service activation (E2), a model choice, and the client and counsel decisions in `blockers.md`. |

> **Run the suite as CI does**, and `source .test-env.sh` first. Without it the
> four RLS tests fail for an environmental reason that looks exactly like a
> regression: the app connects as a role that is not subject to RLS, so
> `test_scores_are_insert_only` reports `DID NOT RAISE` rather than a
> permissions error. Same family as the `.env`-masking bug below.

### Deferred by decision — revisit before launch

| Item | Decided | Why deferred | What it takes to land |
|---|---|---|---|

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

## 2026-09-18 — AI providers: OpenAI (CV reading, interview feedback) + Sarvam (speech)

Decision: **no Bedrock for AI**. `bedrock.py` stays selectable
(`SCORING_EXTRACTION_PROVIDER`) but the default is `openai`.

### Built

- `app/core/openai_responses.py` — one Responses API call, strict JSON schema
  built from our own types, `store: false`, no sampling params, plain `httpx`
  (no SDK dependency). Strict mode refuses `maxLength`/`default`, so they are
  stripped for the request and enforced by `model_validate` afterwards.
- `scoring/openai_extractor.py` — `ResumeExtractor` on OpenAI. Same prompt,
  schema, cache key and failure semantics as Bedrock. Reasoning effort
  `medium`; changing it is a `PROMPT_VERSION` bump (a re-score).
- `interview/sarvam.py` — Sarvam `saaras:v3`, mode `codemix`, language
  auto-detect. **Batch job API, not REST**: REST takes < 30 s of audio and an
  answer runs to 120 s. Our key never goes to the signed blob URLs.
- `interview/openai_evaluator.py` — rubric feedback; per-call strict schema
  (question codes as enum, every dimension required 0–4); instructions forbid
  judging accent, fluency, vocabulary, pace, filler words, and forbid numbers in
  comments.
- Settings: `OPENAI_API_KEY`, `SARVAM_API_KEY`, `INTERVIEW_TRANSCRIPTION_PROVIDER`,
  `INTERVIEW_EVALUATION_MODEL_ID`; boot refuses a selected provider without its
  key/model. `tests/conftest.py` now *forces* every provider off, so a
  developer's `.env` can never make the suite call a model.
- `scripts/verify_ai_providers.py` — live check (costs a few rupees).
- 23 unit tests on a mock transport (`test_openai_sarvam_providers.py`).

### Model choice

`gpt-5.4-mini-2026-03-17` for both. $0.75 / $4.50 per 1M tokens; a CV is read
once ever (extraction cache), roughly ₹1–2 each. `gpt-5.4` is ~3× the price;
run the verify script with `--compare gpt-5.4` on real CVs before switching.

### Live-tested (same day, real keys)

- **The live run caught a bug the mocked tests could not**: stripping the
  `title` *keyword* from the schema also deleted the role's `title` *field*,
  so the model was never asked for a job title and every real CV came back
  `schema_validation`. Fixed; regression test holds every model field in the
  strict schema.
- Sample CV: mini 13 s, ~₹0.78; `gpt-5.4` 22 s, ~₹2.55. Roles, dates,
  education, skills agree. Differences: mini put `total_experience_months` =
  the CV's own "7+ years" (84) where `gpt-5.4` computed 100 — **harmless for
  the score**, which sums the dated roles' months (`scoring/domain.py`).
- Sarvam batch (Hinglish, generated with `bulbul:v3` TTS): 4.9 s, `hi-IN`,
  accurate, rendered in Devanagari. OpenAI feedback fit the rubric exactly.
- Suite: 2348 passed. All CI checks green.

### Open

- **N2**: OpenAI processes in the US, so CV text and transcripts leave India.
  **Client approved this on 2026-09-18.** Sarvam stays in India.
- Evaluator must still be tested on real recordings in each supported
  language before launch (`interview/evaluation.py`).

---

## 2026-09-17 (night) — Day 20: privacy, rate limits, index review, handover · **Week 4 gate**

**2247 -> 2324 tests**, all passing locally as CI runs them. Local CI chain
green: age, vocabulary, ruff, format, mypy, 10 import contracts, modules. **Rebuild with
`reset_local_db.sh`** — `erase_candidate`, `guard_dsr_request_write`, a
relaxed `ck_users_has_identifier`, a new column on `scores`, and eight new
indexes.

### What landed

| | |
|---|---|
| **The deletion policy, written down** | `privacy.domain.ERASURE_PLAN` classifies **every table in the schema**: ERASE, RETAIN under the carve-out, NOT_PERSONAL, or SELF_EXPIRING, each with the sentence justifying it. `tests/invariants/test_erasure_plan.py` reads the **live database**, so a table added next month without a decision fails the build rather than quietly surviving erasures. |
| **The cascade** | `erase_candidate(uuid, text)` — one SECURITY DEFINER function, one transaction, returning a manifest of rows destroyed per table, recorded on the request and in the audit row. |
| **Export** | `POST /privacy/requests/export` → outbox → `privacy.build_export` → a zip of JSON per section in S3 (server-side encrypted), behind a 10-minute presigned link minted and **audited per call**. Expires after 48h, and an erasure destroys it at once whatever the sweep is doing. |
| **Deletion** | `POST /privacy/requests/deletion`, a 24h cooling-off period, withdrawable, then `privacy.erase_due`. Objects first, rows second. |
| **Rate limits** | One table (`app/core/ratelimit.py`), three scopes, two tiers: global per IP / user / tenant (fail open), specific per route (fail closed). 429 now carries `Retry-After`. Includes the analytics limit Day 18 left owed. |
| **Index review** | `tests/integration/test_index_review.py` — 39 hot query shapes planned with `enable_seqscan = off`, plus every foreign key on a growing table indexed or exempted in writing. |
| **Invariant suite** | `test_all_ten_invariants_are_covered.py` names the file proving each of the ten and fails if one is renamed away or emptied. |
| **Handover** | `openapi.json` (141 paths), a generated Postman collection (157 requests, 10 folders), [`integration-notes.md`](integration-notes.md), and a README that matches how the stack actually starts. |

### Decisions worth knowing

**The cascade is SQL because the app role must stay unable to delete a score.**
Invariant 3 is proved by `test_scores_are_insert_only` reading the grant, not
by trusting the code. An erasure task running as the app role would have needed
DELETE on `scores`, `course_completions`, `device_checks` and
`application_events` — trading one legal requirement for another. It runs as
its owner instead, and it is the only thing on the platform that may destroy a
score.

**`users` is emptied, not deleted, and `cognito_sub` is hashed rather than
cleared.** The row anchors every retained payment and audit row; emptied, its
id identifies nobody, which is the pseudonymisation of answers-log 7.4 done
once instead of rewritten across an append-only trail we are forbidden to
touch. The hash is the half that was nearly wrong: **the test asserting a 401
after erasure got a 200.** With `cognito_sub` NULL, a token issued before the
erasure matches no row, so sign-in treats it as a first sign-in and **creates a
fresh account from the erased person's credential**. Storing the subject's
SHA-256 lets `_by_subject` recognise it and return the DELETED row, which
`_authenticate` refuses. Deleting the Cognito user is still owed (**E32**), and
until it is, an erased person signing in again with the same phone is refused
rather than starting fresh.

**Deletion waits, and the account stays usable while it waits.** Erasure has no
undo, so there is a 24h window and a withdraw route. Locking the account during
the window was the first design and it was wrong — it would have locked the
person out of withdrawing. Nothing escapes by being written late: the cascade
runs in one transaction over whatever exists when it runs.

**The extraction cache needed a link to a person, and had none.**
`resume_extractions` is content-addressed on CV text and holds the model's
account of a career, with no user column by design. Without a handle, the
model's reading of an erased candidate's CV would survive them. `scores` now
stores `extraction_cache_key`, and the erasure deletes a cache row **only when
no other candidate's score still names it** — two people with identical CV text
share the entry, and one leaving must not take the other's with them.

**The seat is released, then deleted.** `seats_used` only ever moves through
`guard_college_seat_assignment`; deleting an assignment row directly would
leave a college one seat short forever. The erasure releases it the ordinary
way, so the college gets its seat back — which is also the fair answer.

**Two judgment calls flagged for counsel rather than taken quietly.** An
erasure deletes the candidate's `applications` and their stage history, which
removes something from an employer's workspace, and it deletes `disputes` they
raised, which is also our record of how a case was handled. Neither is a
financial record nor an audit row, so the carve-out does not reach them.
**`roster_entries` are not reached at all**: a college's own record of a
contact it supplied carries no link to an account — deliberately, because a
college must never learn who has one — so finding it would require exactly the
match the design forbids. All three are recorded in **B3**.

**The global rate limits fail open; the specific ones fail closed.** A Redis
blip that took the whole API down would be a worse outage than the runaway
client the global tier guards against. An unenforced throttle in front of a
paid SMS gateway is somebody else's bill. `test_rate_limit_policies.py` also
holds OTP and the threshold preview as the tightest limits on the platform —
which immediately caught the DSR route being set tighter than either, on no
reasoning at all. The real guard there is one open request of each kind per
person, held by a partial unique index.

**An export a person already took is destroyed by their erasure.** Found while
re-reading the cascade rather than by a test: the archive is that person's
whole record in one object, and it was being left to the 48-hour expiry sweep
— which has no schedule (**E4**), so in practice it would have been left
indefinitely, a complete copy of somebody we had just erased. The erasure now
collects those keys beside the CV and the interview audio, and clears the
pointers on the retained request rows afterwards. Done in Python rather than in
`erase_candidate` because `dsr_requests` is a retained table and the cascade
may not touch one — which the invariant test enforces.

### Found on the way

- **Four unindexed foreign keys the erasure would have scanned**:
  `integrity_signals.candidate_id`, `integrity_checks.candidate_id`,
  `college_seat_assignments.candidate_id` and `entitlements.user_id`. Each had
  only a *partial* index — HIGH-and-open signals, the live seat, unconsumed
  entitlements — which an erasure's predicate cannot use. Four more were added
  where the erasure now deletes a parent (`resume_files`, `scores`,
  `device_checks`, `student_consents`, `roster_entries`).
- **One false alarm worth recording.** The review first flagged `subscriptions`
  as unindexed for `require_active_subscription`, the hottest read on the
  platform. It is not: `ix_subscription_active_window` is partial on
  `state IN ('ACTIVE','GRACE')`, and the test's query had omitted the state
  predicate the real query carries. The test was wrong, not the schema.
- **The blocker register's E count had been stale since Day 6** — it said 4
  while the section held 33 items. It is counted from the section now.

### Owed

| | |
|---|---|
| **The retention period** | B3. Counsel's, never arrived. `RETENTION_POLICY_VERSION` starts `placeholder-`, a test asserts the prefix, and retained rows are kept indefinitely rather than on a guess. |
| **Both sweeps are unscheduled** | E4. `privacy.erase_due` and `privacy.expire_exports` exist and nothing runs them. A deletion is accepted, tracked and shown with its due date, and **nothing is destroyed** — safe, but a promise not being kept. Hourly is enough. |
| **Cognito user deletion** | E32. |
| **Business accounts cannot erase themselves** | E33 — refused in the route *and* in the function; what happens to an organisation whose last owner leaves is nobody's decision yet. |
| **No S3 lifecycle rule on exports** | E34, same family as E22. |
| **Week 4 gate: schemathesis fuzzing** | Still ☐, carried from the Week 3 gate. |

---

## 2026-09-17 (evening) — Day 19: admin console, suspension, disputes, notifications, nudges

**2079 -> 2247 tests**, all passing locally as CI runs them. Local CI chain
green: age, vocabulary, ruff, format, mypy, **10** import contracts, modules.
Not yet pushed. **Rebuild with `reset_local_db.sh`** — five new tables, four
triggers, three policies on `disputes`, `platform_tenant_bound()`, and a changed
job-board policy and `job_accepts_applications`.

### What landed

| | |
|---|---|
| **Staff tenancy (E10 closed)** | One PLATFORM tenant (`uq_tenants_one_platform`). `guard_membership_tenant_type`, generated from `identity.domain.ROLE_TENANT_TYPE`, keeps staff roles in it and customer roles out of it, for every writer. `scripts/create_platform_staff.py`; no route. |
| **Console** (`/admin`) | KYB submissions (a record while approval is automatic; open with answers, decide), integrity queue (open with evidence, clear or confirm), organisations, suspend / reinstate / history, college seats (E23 closed), candidate / employer / college drill-downs, notification suppression, dispute queue (open, assign, resolve), audit search by actor, action, target, tenant and time. Permission table `admin.domain.CONSOLE_ROLES`. |
| **Every look recorded** | `admin.service._reveal`: the audit row is written on the request's transaction, then the **read-only** bypass session is opened. A failed audit write opens nothing (tested). Drill-downs show the display score and band, masked contacts, and counts — never a CV. |
| **Suspension** | A `tenant_suspensions` row, one open per tenant, lifted by latch, never deleted. `guard_tenant_suspension_write` mirrors it onto `tenants.status`; `guard_tenant_status` refuses the reverse. **Bites on the next request** despite the 60s membership cache (`membership.mark_tenant_changed`), answered 403 `tenant_suspended`. Jobs leave the board and refuse applications; a college's seats stop (E29). PLATFORM cannot be suspended. |
| **Disputes** | `POST/GET /disputes` for candidates, employers and colleges (HIRE needs a visible application; colleges cannot dispute a hire; 5/day). Staff work them in `/admin/disputes`, cross-linked to the application's two sides and the candidate's live integrity signals. `guard_dispute_write`: what was raised never changes, and only a PLATFORM-bound transaction moves state. A candidate's hire dispute is filed automatically (E12 now has a queue, still no remedy). |
| **Relay (E15, in code)** | `_publish` enqueues every subscribed task with `routing.TASK_ARGUMENTS`, raising on a broker failure. |
| **Notifications** | `plan_for` (15 events), `delivery_decision` (account, opt-out, suppression, contact, DLT, provider — in that order), one row per message **including every skipped one**, deduplicated, decide-then-send in separate transactions. Inbox, read, preferences (language and channels). SMS via Twilio Messaging, email via SES, both `none` by default with a stub for tests. 17 new templates (13 in-app). |
| **Nudges (R9)** | `notifications.nudge_incomplete_profiles`: candidates older than 24h with no upload, paste or form; every 72h, three at most, 09:00–21:00 IST; `nudges_enabled` stops them; config `notifications.nudges` (strict, cannot go daily or past six). The nudge number is the cap and the concurrency guard. |

### One failure seen once and not reproduced

`test_with_approval_on_a_reviewer_opens_and_decides_a_submission` failed once,
in a full run that took 68 minutes instead of the usual 8 (the machine was
very likely asleep partway through), and the traceback was lost to a `tail`.
It passed in isolation, after `test_kyb.py`, twice alone, and in the next full
run. A likely cause is a one-hour local token expiring during the pause, but
that is a guess. **If it recurs in CI, capture the traceback before changing
anything.**

### Found and fixed on the way

- **The worker registered no tasks.** `include=["app.tasks"]` imports the
  package, whose `__init__` imports nothing, so a real worker would have
  received every event the relay sends and known none of them. Invisible until
  today because `_publish` only logged. The worker now includes
  `routing.TASK_MODULES`, and a test checks every routed task is registered and
  takes exactly the arguments it is sent.
- **KYB built its event names in an f-string expression**
  (`f"{MODULE}.{'approved' if approved else 'submitted'}"`), so no search for
  `kyb.approved` found the emitter. The new drift test (every notifying event
  must be emitted somewhere) caught it; KYB now has named constants.
- **FastAPI nests included routers in `app.routes`**, so enumerating console
  endpoints from it finds none. The console invariant reads operation ids from
  the schema instead.

### Decisions worth knowing

- **`/admin` left `TENANT_SURFACES`** in `test_cross_tenant_routes.py`, with the
  reason beside it. A console route crosses tenants by design; the replacement
  (`tests/invariants/test_admin_console.py`) asserts no candidate, employer or
  college reaches any console route and each staff role reaches exactly its
  capabilities.
- **Staff writes go through the owning module.** The bypass role stays
  SELECT-only, as `init_db_roles.sql` asked Day 19 to confirm.
- **A resolved dispute changes nothing else.** Confirming or voiding a hire,
  or refunding, is a rule in another module and a client decision (E12, E18).
- **The college revocation notice names nobody** (E28), and says only which
  scope ended.
- **The nudge SMS is registered as SERVICE_EXPLICIT**, which needs recorded
  consent at sign-up (E31).
- **VIEWED does not notify.** A message for every glance at an application
  teaches people to ignore the ones that matter.

### Owed

- Schedules for the relay and the nudge sweep (E4); an orphaned-PENDING sweep,
  bounce feeds, email unsubscribe links, translations of the new keys (E30).
- Client: seats during a college's suspension (E29); what a resolved hire
  dispute may do (E12).
- REVOKED state on roster rows (Day 18, still owed).
- DLT registration of the two new SMS bodies (D1).

---

## 2026-09-17 (later) — Day 18: consent scopes, cohort analytics, invariant 9

**2018 -> 2079 tests**, all passing locally as CI runs them. Local CI chain
green: age, vocabulary, ruff, format, mypy, 9 import contracts, modules.
Pushed to PR #11 as `e1f3a97`: **all five CI jobs green on the first push**.
**Rebuild with `reset_local_db.sh`** — a new CHECK on
`student_consents`, five policies, two triggers and seven functions.

### What landed

| | |
|---|---|
| **INDIVIDUAL consent** | `POST /candidate/colleges/{college_id}/individual-visibility` with the INDIVIDUAL terms' version (`GET .../consent-terms?scope=INDIVIDUAL`, versioned apart from the roster words). Needs a live link (404 `college_link_not_found`); idempotent; audited; `college.individual_visibility_granted`. `granted_via = DIRECT`. |
| **Revocation** | `POST /candidate/colleges/{college_id}/revoke {scope}`. INDIVIDUAL keeps the link and the seat. **ROSTER disconnects**: the seat is released and INDIVIDUAL revoked by trigger, in the same UPDATE, at the same instant. Never paywalled; idempotent; 404 for a college never linked. One audit row per scope ended and one `college.consent_revoked` event (consent id, tenant, scopes — no student id). |
| **The database's copy** | `ck_student_consents_scope_via` (INDIVIDUAL ⇔ DIRECT); `guard_student_consent_insert` (INDIVIDUAL needs a live ROSTER link, locked FOR SHARE against a racing disconnect; a consent starts live); `revoke_individual_with_roster`; a candidate UPDATE policy for revoking their own live rows; and **two RESTRICTIVE policies** so only the student a consent names can insert or revoke it. |
| **Analytics** | `GET /college/analytics/overview`: connected and individually visible counts, score distribution by band, median, applicants, applications, interviews, platform hires. `GET /college/analytics/placements`: confirmed platform hires by IST month (12) and by job location, `source: PLATFORM`. Both for admin and staff, behind payment, never cached. |
| **Floors** | `analytics.domain`, config `analytics.privacy` (strict; bad row = 500 `analytics_floors_invalid`). Under 10 connected students only the counts show. A band or month under 5 is `null`, with a complementary cell withheld beside it. Median rounded to 10. Locations under 5 hires pooled as `OTHER`. A row may raise a floor, never set one below 5 / 3. |
| **Reads** | Six SECURITY DEFINER functions (`COLLEGE_STUDENT_READS`) over two consent CTEs, keyed on `bound_college_tenant()` — the tenant bound from the membership, which must be an ACTIVE COLLEGE. No tenant parameter. The three aggregate functions return no identifier. |
| **Individual view** | `GET /college/students` (keyset page) and `GET /college/students/{candidate_id}`: name (sign-up, else structured form), display score and band, application and interview counts, confirmed platform hires with job title and employer. **404 unless the INDIVIDUAL consent is live now.** Every page and every open writes an audit row in the transaction (`college_students_listed` with the ids shown; `college_student_viewed` with the consent id). |
| **Invariant 9** | `tests/invariants/test_invariant_09_consent.py` — see *Guarantees* below. Plus a cross-tenant case for `/college/students/{candidate_id}`. |

### Guarantees and where they live

- **Analytics inner-joins consent in the query**: `pg_proc` is read back, and
  every `college_*` function must be listed with the consent CTE it joins,
  be SECURITY DEFINER, take no tenant and read the bound college. The college
  and analytics repositories are scanned for any student table.
- **Removing consent makes rows disappear on the next read** — from the
  overview (10 connected → 9, below the floor), from `college_cohort_scores()`,
  and from the individual view.
- **ROSTER never implies INDIVIDUAL**; a college cannot write or revoke a
  consent, one student cannot revoke another's, INDIVIDUAL cannot exist
  without a live link — for the migrator too.
- **Every reveal audited**; a failed audit write returns nothing.
- **Shapes**: `CollegeStudentResponse`'s field list is fixed, and the
  INDIVIDUAL words must name what it shows (content-placeholder test); no
  analytics schema has a field that could name a person.

### Decisions worth knowing

- **One Day 17 test was narrowed, by name.** `test_no_college_facing_schema_names_a_score`
  said no college schema may carry a score, which was true while ROSTER was the
  only scope. `CollegeStudentResponse` now does, deliberately, behind INDIVIDUAL
  consent; it alone is exempted, and invariant 9 fixes its field list.

- **Found and closed: a college could write a student's consent.** Permissive
  RLS policies OR together, so the tenant policy on `student_consents` let a
  college-bound transaction INSERT a consent naming any student (with the
  college's own code) or revoke one. Only the service stood in the way. SRS
  1.15.3 prohibits institution-side bypass, so it is now RESTRICTIVE policy.
- **Disconnecting ends individual visibility.** A college cannot see as a
  person someone it may not even count. Revoking only INDIVIDUAL keeps the link
  and the seat — the student's access is not the price of their privacy.
- **Cross-tenant reads by function, not by widened policy.** Applications live
  under each employer's tenant. Rather than teach the application policies
  about colleges, the college reads six narrow functions, each joining consent.
- **Aggregates are not audited; the individual view is, list included.** A
  masked card was not a reveal on Day 13 and an aggregate over the floor is
  not one now. A list of names is.
- **Suppression found its own bug.** The exhaustive test over every
  four-cell combination of 0–7 caught the case the first version missed: one
  small cell and every other cell zero, which had no partner to withhold. The
  partner is now a zero cell when nothing else is available.
- **Interviews** means applications that reached INTERVIEW (from
  `application_events`), not mock interviews. **Hires** means HIRED, both
  confirmations; a disputed hire counts as none (E12).
- **What the college sees of a named student is ours** (E27): no contact
  details — the college has the roster it uploaded, and contacts collected by
  us are not ours to pass on — no CV, no integrity signal, no employer notes.
- **Residual risk, recorded rather than hidden** (E28): reading the overview
  before and after one named student links shows their band unless the cell
  is suppressed. A daily snapshot for additions would close it at the cost of
  freshness; not built.

### Owed

- **Cohort filters** (course, branch, graduation year) — no data holds them,
  and each is a new subtraction surface (E26).
- **Counsel's INDIVIDUAL words; the client's field list and floors** (E27).
- **REVOKED state on roster rows** (SRS 2.10.3): an accepted invitation whose
  consent was later revoked still reads ACCEPTED.
- **The college-facing notice of a revocation** (Day 19) — without the
  student's name for ROSTER (E28).
- ~~A rate limit on analytics reads~~ ✅ **done Day 20** — `analytics.read`, 120/hour per organisation. Not a leak control (the aggregates are already floored and suppressed) but a cost one: an overview is several joins over every consenting student, and a dashboard left open in a tab should not run them continuously.

---

## 2026-09-17 — Day 17: interview evaluation, colleges, seats, referral codes, rosters

**1898 -> 2018 tests**, all passing locally as CI runs them. Local CI
chain green: age, vocabulary, ruff, format, mypy, 9 import contracts, modules.
Pushed as PR #11. The first CI run failed
`test_a_college_pays_as_its_organisation_and_only_its_admin_buys`: **CI never
runs `seed_catalogue.py`**, and the only thing syncing plans was
`test_payments.py`'s autouse fixture, which runs after `test_college.py`. A
test that reads catalogue plans must call `sync_plans` itself. **Rebuild with `reset_local_db.sh`** — new tables, four
candidate policies, nine functions and four triggers.

Both decisions this day needed were already in hand: the seat model (Round 7.7,
*"yes"*) and the typed referral code as consent (Round 7.9, *"do it"*). The
plan's §14 still listed Q10 and N6 as open; it no longer does.

### What landed

| | |
|---|---|
| **Evaluation interfaces** | `interview/evaluation.py`: `TranscriptionProvider` and `EvaluationProvider`, each with an **unconfigured default that raises** and a stub (`INTERVIEW_EVALUATION_PROVIDER=stub`, refused in staging/prod). The module docstring is the contract a real implementation must meet. |
| **Evaluation** | `interview.evaluate_session` task on `interview.session_completed`, beside the re-score. Transcribes each stored answer once (`interview_transcripts`, idempotent by answer, own transaction because it is paid per minute), then rates spoken answers against the rubric (`interview_evaluations`: ratings, raw response, provider, model, prompt and rubric versions). Session → EVALUATED, or FAILED with `no_speech` / `evaluation_invalid`. Both tables insert-only. |
| **Report** | `GET /candidate/interview/sessions/{id}/report`: PENDING / READY / FAILED. Per dimension a **level in words** (STRONG, DEVELOPING, FOCUS_AREA) and what good looks like; per question the transcript, `looking_for` and the evaluator's comment. Assembled from stored rows on every read. |
| **College tenant** | `POST /college/organisation` (business identity), `GET/PATCH` it, team under `/college/team` with COLLEGE_ADMIN / COLLEGE_STAFF (identity's team functions now take the role set). Onboarding against the versioned form: `GET /college/onboarding`, `PUT .../answers`, `POST .../submit`. |
| **College subscription** | `/college/subscription` (plans, current, checkout, cancel, mandate) — the same five routes as employers; the admin buys, staff read. |
| **Seats** | `college_seat_assignments`, one live seat per student platform-wide. `guard_college_seat_assignment` holds the cap and **moves `seats_used` itself** (the app role cannot write it). `allocate_seats` (PLATFORM_ADMIN / SYSTEM, audited, **no route** — E10): never below seats in use, never above the live plan's allowance, and growing it seats waiting students, longest-linked first. `GET /college/seats` shows counts only. |
| **The seat limb** | `require_active_subscription` for a candidate is now **personal subscription OR `candidate_has_college_seat`**: a live seat, live ROSTER consent, ACTIVE college, college subscription in period — read live. |
| **Referral codes** | `POST/GET /college/referral-codes`, `POST .../{id}/revoke`. 12 characters of Crockford base32 (60 bits, CSPRNG), always expiring (default 90 days, max 365), optional use cap, printed `ABCD-EFGH-JKMN`. The code never enters the audit log. |
| **Linking** | `/candidate/colleges`: `GET /consent-terms`, `POST /link`, `GET` (links), invitations. **Entering the code is the consent, ROSTER scope only** (`student_consents`, `granted_via = REFERRAL_CODE`, the code named). Every bad code is one `referral_code_invalid`; 10 attempts an hour per student and 30 per address; a stale `consent_version` is refused. A free seat is taken at once. |
| **Roster import** | `POST /college/roster-imports` (CSV in the body, ≤1 MB / 5,000 rows) previews every row with its issues — malformed phone or email, no contact, duplicate in the file, already on the roster — and invites nobody. Same file again returns the same import. `GET .../{id}`, `.../rows` (keyset), `.../commit` (duplicates re-checked under a roster lock; rows that will never be invited are deleted), `.../discard` (rows deleted). |
| **Invitations** | `POST .../invitations/send` marks pending rows SENT and emits one `college.invitation_sent` per row, ids only. A student sees invitations **matched on their own verified phone or email** and accepts (INVITE consent, ROSTER only, seat taken) or declines; 30 days, expiry read from the clock. Tracking counts per import. |

### Decisions worth knowing

- **Evaluation is feedback and cannot move a score.** The +20 was frozen at
  completion and the guard refuses any change to it; the guard now also refuses
  EVALUATED or FAILED without the evaluation row that records it. The report has
  **no number about the candidate** — ratings are stored for disputes and turned
  into words before they leave the service, because a 0–4 average beside a
  three-digit score is a second, unexplained score (R11).
- **No fallback evaluator**, for the reason there is no fallback CV extractor:
  invented feedback is feedback nobody gave. Unconfigured, a session stays
  COMPLETED and the report PENDING. Evaluator output that does not fit the
  rubric exactly — including a dimension the rubric forbids, such as accent — is
  recorded FAILED, never repaired. The evaluator is given the question, what a
  good answer contains and the transcript, and nothing about the person.
- **Silence is now visible (E19), and still earns its +20.** All-silent sessions
  are FAILED `no_speech` without calling the evaluator. Whether that should cost
  the points remains the client's decision.
- **A student never binds a college's tenant.** Codes and invitations name a
  tenant, and binding it would be a tenant id from a request body (SRS 2.24.7)
  that opens every row of that college to the transaction. Instead the candidate
  binds `app.user_id`, and nine narrow SECURITY DEFINER functions each answer
  one question. The consent INSERT policy re-checks that the code or invitation
  named is live and this college's, so a direct write cannot put a student on a
  roster, confer INDIVIDUAL scope, or use a revoked code.
- **A college never learns who has an account.** No roster column says whether a
  contact matched a user; a student finds their invitation from their own
  verified contact. A college sees counts: seats used, codes' uses, invitations
  by state.
- **Seats follow consent.** Revoking ROSTER consent releases the seat in the same
  statement (trigger), so Day 18's revocation route is correct the day it lands.
  A student linked while the college was full is seated when the allowance grows,
  or on retrying the link.
- **The 501st student is linked, not seated** — blocking, as recommended, is the
  only option that cannot surprise anyone with an invoice.
- **A college that stops paying locks its students out on the next request**,
  with seats and links kept. No grace period — that is Round 8's open question 2.
  A student who already paid keeps their own subscription alongside a seat
  (Round 8 question 1, built as "no money moves"). A seat covers the subscription
  gate only; courses and interviews are still bought (Round 8 question 3).
- **Two deviations from the plan's wording, deliberately.** The roster preview is
  synchronous rather than a 202 job: bounded at 5,000 rows it takes milliseconds,
  and a job with no broker (E15) would never run in a running API. Delivery is the
  asynchronous part. And the CSV is sent in the request body and never stored in
  S3: staged rows hold exactly what is needed, rows the college discards or will
  never invite are deleted, and there is no roster bucket to provision.
- **Revoking a code and discarding a preview are not paywalled.** Stopping
  something must never wait on a payment. Issuing, importing, committing and
  sending are.
- **A student's college routes are not paywalled**: linking is how a seated
  student gets access at all.

### Owed

- **A speech model and an evaluator** — the interfaces and the contract are in
  `interview/evaluation.py`; the choice, the prompt, and testing it on each
  supported language are not. Until then no feedback exists outside tests.
- **Seat allocation has no route** (E10, Day 19's console) — so in a running API
  no college has seats yet. Neither does releasing one student's seat by hand.
- **Consent revocation** (Day 18) — the database side is built; the route is not.
- **Invitation delivery**: SMS is DLT-gated (D1), email waits on SES production
  access, and the events need the relay's broker (E15). The evaluation task needs
  the broker too.
- **Round 8 follow-ons**: grace for students when a college lapses; confirming a
  seat excludes add-ons; what happens to a student who paid before being seated.
- Counsel's consent text (`college/domain.py`, flagged placeholder).

---

## 2026-09-16 — Day 16: questionnaire and mock interview

**1820 -> 1898 tests**, all passing locally as CI runs them. Local CI chain
green: age, vocabulary, ruff, format, mypy, 9 import contracts, modules. Not
yet pushed. **Rebuild with `reset_local_db.sh`** — new tables, guards, and the
interview price in the seeded catalogue.

### What landed

| | |
|---|---|
| **Questionnaire** | `GET /candidate/questionnaire` (bank + saved answers), `PUT .../answers` (merge; `null` clears; one bad answer refuses the whole request with every issue listed), `POST .../submit`, `GET .../report` (by section, labels read back, 404 until submitted). `questionnaire_responses`, one row per candidate. Paywalled. |
| **Device check** | `POST /candidate/interview/device-checks`: the app reports readings, `interview.domain.evaluate_device_check` decides, every failure listed, `rule_version` stored. Valid for 60 minutes. No camera, no lighting. |
| **Offer and checkout** | `GET .../offer` (price, `will_increase_score`, `requires_acknowledgement`, check status, unstarted purchases, open session). `POST .../checkout` → billing, purpose `INTERVIEW_SESSION`, refused **before a payment exists** without a fresh passed check or, from the fourth session, without `acknowledge_no_score_increase`. |
| **Purchase** | Granted by `billing._grant` after a verified callback into `interview_purchases`; `guard_interview_purchase` refuses anything else. Versioned `interview_products` seeded from `INTERVIEW_SESSION_PRODUCT` (placeholder ₹349). |
| **Sessions** | `POST .../sessions` consumes the oldest purchase behind a fresh check, or returns the open session (recovery). Set 1, 2, 3 by session number. `GET .../sessions`, `GET .../sessions/{id}` — the answer manifest, one slot per question, `looking_for` only once that answer is stored. |
| **Answers** | `POST .../answers/{i}/upload` (presigned PUT, key derived server-side; the first starts the session), `POST .../answers/{i}/complete` (size from S3, format sniffed — Ogg/WebM Opus, ADTS/MP4 AAC — duration bounded; rejected objects deleted; idempotent). |
| **Completion** | `POST .../sessions/{id}/complete`: all six stored → COMPLETED, +20 and `contribution_version` frozen, audit `interview_completion_recorded`, outbox `interview.session_completed` → `rescore_for_addons`. Idempotent. |
| **Scoring** | `addons_for` lists every completed session as an `interview` event; the +60 cap stays in `scoring/domain.py`. The `MOCK_INTERVIEW_COMPLETED` badge now appears. |

### Decisions worth knowing

- **Sessions are bought like the course, not through `entitlements`.** The plan's
  data model has `interview_sessions.entitlement_id`; Day 15 kept courses in
  their own module with their own guard, and interviews follow that, so the
  purchase, what the candidate was told, and the session sit together. The
  `entitlements` table is now written by nothing (its docstring says so).
- **The fourth-session warning is enforced, not just shown.** Checkout refuses
  with `interview_no_score_increase_unacknowledged` until the app sends the
  acknowledgement, and a CHECK refuses a notice row that is neither
  "will increase" nor acknowledged. Sessions "held" counts completed, open and
  unstarted purchases, so buying three at once warns on the fourth.
- **A fourth completion records +20 and scoring counts none of it.** Recording
  0 in the interview module would have put the cap in two places.
- **The candidate completes their own session**, unlike a course completion.
  What earns the points is finishing, and "finished" is decided from stored,
  validated audio — in the service and again in the database trigger. The
  weakness is that silence is valid audio (**E19**).
- **Every passed or failed device check is kept**, insert-only: it is the
  evidence when a candidate says they paid and could not record.
- **An abandoned session does not use a place under the cap** for the warning,
  but nothing can abandon one yet (**E20**).
- **The questionnaire has no employer surface and no badge** (**E21**). Submit
  shares nothing further today; it marks the answers as the candidate's to
  share once filters exist.

### Owed

- **Evaluation** (Day 17): transcription and rubric feedback; EVALUATED/FAILED
  are in the machine and unreachable.
- **E19** points on completion vs. evaluation, **E20** abandon policy, **E21**
  questionnaire filters, **E22** audio retention.
- The outbox relay still has no broker (E15): a completion re-scores in tests,
  not in a running API.

---

## 2026-09-15 — Day 15: payments, subscriptions, courses

**1732 -> 1820 tests** (62 unit, 26 integration), all passing locally as CI
runs them. Local CI chain green: age, vocabulary, ruff, format, mypy, 9 import
contracts, modules. Not yet pushed. **Rebuild with `reset_local_db.sh`** — it
now seeds the price list and the course too.

### What landed

| | |
|---|---|
| **Gateway interface** | `billing/provider.py`: `PaymentProvider` for both renewal paths (order, mandate registration, pre-debit notice, debit, revocation). **Default `none` sells nothing** (checkout 503). `stub` signs callbacks with a real HMAC; `Settings` refuses it in staging and prod. |
| **Checkout** | `POST /candidate/subscription/checkout`, `POST /employer/subscription/checkout` (owner only), `POST /candidate/courses/{id}/checkout`. PENDING payment + gateway order; a second checkout for the same item within 30 min returns the first. `GET /billing/payments/{id}` to poll (someone else's is 404). |
| **Signed callbacks** | `POST /billing/callbacks/{provider}`, public. Signature over the raw body checked **before** parsing or writing — a forgery is a 401 and leaves no row. Verified payload stored verbatim in `payment_callbacks`, replay refused by `(provider, event_id)`, 200 at once, outbox `billing.callback_received` → task `billing.process_callback`. |
| **Subscriptions** | Purchase, early renewal (extends from the end), cancel at period end, GRACE (mandate only), LAPSED, CANCELLED; every change in `subscription_events` + outbox. `GET .../subscription`, `/plans`, `/cancel`. Sweep task `subscriptions.renewals`. |
| **UPI AutoPay** | `POST .../subscription/mandate` → PENDING until the gateway's `mandate.activated`. Sweep: notice → wait ≥24h → debit of the notified amount → callback renews from the paid end. Retries each get a fresh notice; exhausted, over-ceiling or `MANDATE_REVOKED`-style failures fall back to manual with `subscriptions.fell_back_to_manual`. `mandate_debit_notices` table. |
| **Courses** | Catalogue and checkout behind the subscription; purchase recorded on a verified payment; `courses.service.record_completion` (SYSTEM / PLATFORM_ADMIN only, audited, outbox). **No completion route.** |
| **Add-ons re-score** | `scoring.service.addons_for` reads completions; `rescore_for_addons` runs Layers 2–3 over the stored extraction (no model call) and appends a score that replays exactly. Routed from `courses.completion_recorded`. |
| **Pay-first** | `/candidate/score/me` now needs an active subscription (the Day 8 TODO). |
| **Catalogue** | `scripts/seed_catalogue.py` replaces `seed_placeholder_course.py`: 11 plans and the course, versioned — a changed price is a new row, never an edit. The course is written inactive while lessons have no media, so nothing is on sale. |

### Decisions worth knowing

- **The database holds the gate, not only the service.** `guard_payment_write`
  refuses a payment inserted as anything but PENDING, any change to what was
  charged, an un-latched verification, and any status move off
  `billing.domain.PAYMENT_TRANSITIONS` (generated into the trigger).
  `ck_payments_settled_only_when_verified` refuses SUCCEEDED without
  `signature_verified_at`. `guard_course_purchase` refuses a purchase without
  that user's verified payment for that course, and a completion has a foreign
  key to its purchase. So a forged callback cannot produce a score change even
  through a direct repository call.
- **Callbacks are evidence.** The app role may insert them and update only
  `processed_at` and `outcome` (column grant); payments cannot be deleted.
- **A late success counts; a late failure does not.** FAILED → SUCCEEDED is
  allowed because UPI reports late successes; SUCCEEDED → FAILED is refused.
  A signed callback for the wrong amount grants nothing (`AMOUNT_MISMATCH`).
- **Grace exists only for auto-renew.** A manual subscriber has nothing
  outstanding at the end of a period, so they lapse and repurchase restores
  them at once. Entering GRACE moves `current_period_end` (access reads it) and
  keeps the paid end in `grace_from`, so a late debit renews from the paid end.
- **A LAPSED or CANCELLED row is never revived by a purchase** — buying again
  opens a new tenure, so each row's events are one run of payments. The one
  exception is a mandate debit that settles after grace ran out: it was paid.
- **Nothing debits a payer who was not told.** Every attempt has its own notice
  and waits the full period (≥24h, refused below that in config); the debit is
  for the amount in the notice, never a price changed since.
- **The mandate ceiling is the plan price at registration**, capped at
  ₹15,000 (RBI's limit for debits without per-debit approval). A price rise past
  it falls back to manual while days remain. **Employer annual and every college
  plan are over the cap, so they cannot auto-renew** — ours to verify with the
  gateway (blockers E16).
- **An organisation's money is its owner's.** Recruiters and viewers read the
  subscription; only the owner buys, cancels or registers a mandate.
- **A completion re-scores through a new task, not `score_resume`.** The Day 8
  routing sent completions to `scoring.score_resume`, which is idempotent by
  resume version — it would have found the version scored and done nothing, so
  a course would never have moved a score. Fixed and tested.
- **No schema says what a course is worth to the score** (R11, and the
  "points for sale" reading). Copy is the client's.
- **The dev simulate route is not a bypass**: it signs the stub's callback and
  runs the ordinary receive and process path, and exists only with the stub.
- **Resume intake stays open to non-payers**, by decision: uploading and
  confirming before paying is the conversion moment. It has a cost — confirming
  triggers a model call — so it is a client question (blockers E17).

### Owed

- **A real gateway** (D3) — nothing can be sold until one is chosen and its
  adapter written behind `PaymentProvider`.
- **The outbox relay has no broker** (Day 19). In a running API a callback is
  verified and stored and then **not processed**, and a completion does not
  re-score. Tests call the task's service directly; app teams can use
  `POST /billing/dev/payments/{id}/simulate` (blockers E15).
- **The renewal sweep's schedule** (E4). Access is unaffected: it is read
  from the clock.
- **A completion route** needs the assessment bank and the recorded lessons
  (C1). The Week 3 gate's schemathesis fuzzing is not run yet.
- **Refunds** — no flow; REFUNDED exists as a status only (E18). Pre-debit and
  lapse messages wait on notifications (Day 19) and DLT (D1).

---

## 2026-09-15 — Client answers after Day 14, and two changes they asked for

Recorded in `answers-log.md` Round 10.

- **E3 — legacy `.doc` is no longer accepted.** Removed from
  `resume_allowed_mime_types`; an OLE2 upload is refused as
  `upload_legacy_doc_unsupported`. Removed from *Deferred by decision* above.
- **E13 — the candidate's name is asked at sign-up.** `PUT
  /candidate/profile/name` → `candidate_profiles.full_name`; the reveal prefers
  it over the structured form's name. Never selected by masked search.
  **Rebuild with `reset_local_db.sh`.** The app's sign-up screen must ask for
  it; the API does not block anything without one.
- **Closed or confirmed:** N4/B7 acknowledged, C11 dropped, C13 30 days
  accepted, E11 not limited, discovery limits accepted as defaults. B3's
  carve-out confirmed (retention period still owed). D4 still not started.
- **E7 left as it is** pending a clearer answer on opening employer self
  sign-up.

---

## 2026-09-15 — Day 14: access windows, the reveal audit, abuse controls

**1663 -> 1714 tests**, all passing locally as CI runs them (bare `pytest --cov=app`), coverage 85%. Local CI chain green: age,
vocabulary, ruff, format, mypy, 9 import contracts, modules. **Invariants 7
and 7′ are green.** Not yet pushed, so not yet CI-verified.

### What landed

| | |
|---|---|
| **The reveal** | `GET /employer/discovery/candidates/{candidate_id}` → `RevealedCandidate`: phone, email, the display score, band, experience, skills, badges, location, and `full_name` only from the structured form. Owners and recruiters; mounted by `candidate` (it needs `display_value`), decided by `discovery.service.open_candidate`. |
| **Access window** | `require_active_access_window` is real: the tenant's subscription, read live, `402 access_window_expired`. |
| **Audit (7′)** | One `audit_events` row (`candidate_profile_viewed`, ids only) and one `candidate_view_events` row per open, same transaction, re-opens included. |
| **Abuse controls** | Per-organisation caps on distinct candidates per rolling hour and day (`429 view_cap_reached`), a per-person burst limit, search pages per hour, and two alerts (`ACTOR_VELOCITY`, `DAILY_CAP_REACHED`) as audit rows plus `discovery.view_anomaly_flagged`. All in `config_values` `discovery.limits`. |
| **R15** | `require_active_subscription` on every employer jobs, pipeline and search route. Organisation, team and KYB stay open. |
| **Schema** | `candidate_view_events` partitioned by month (key `(id, viewed_at)`), 15 partitions + DEFAULT, `ensure_candidate_view_partitions()`; task `discovery.ensure_view_partitions`. **Rebuild with `reset_local_db.sh`.** |

### Decisions worth knowing

- **The partitioning the docstrings promised did not exist.** The model and
  the migration both said "partitioned by month"; the table was an ordinary
  one. It is now, and a test reads `pg_partitioned_table` rather than a
  comment.
- **Partitions are closed to the app role.** Default privileges grant it DML
  on every new table, and RLS on a partitioned parent does not apply to a
  query that names a partition. So the app goes through the parent or
  nowhere, tested by trying.
- **The DEFAULT partition is a safety net.** An unscheduled month lands there
  rather than refusing a reveal and losing its audit row. Creating that month
  later refuses while DEFAULT holds its rows, which is loud on purpose.
- **Caps count distinct candidates and a re-open costs nothing**, but every
  re-open is still audited. Charging for re-reading one profile would push
  recruiters to copy details out of the product, which is worse.
- **Caps are checked before the lookup**, so a capped organisation cannot
  probe which ids exist. **Rolling windows, not calendar days**, so a cap
  cannot be doubled across midnight. **Under an advisory lock per
  organisation**, so fifty concurrent requests cannot each read the same
  count.
- **The view event is inserted from the visibility CTE**, so it cannot name a
  candidate the reveal would not show, and a candidate suppressed between
  search and click is a 404 with no trace.
- **Alerts fire on the crossing, not the level**, once per burst, and block
  nothing; the caps block. **No limit is the client's**: 60/hour, 300/day,
  20 opens/minute per person, 40 distinct in 10 minutes flags. A malformed
  row is a 500, never the defaults.
- **The reveal route lives in `candidate`, the decisions in `discovery`.**
  `discovery` may not import `scoring` (an invariant test), and the response
  needs `display_value`. Everything that decides the reveal happens before
  anything reads the candidate.
- **`test_discovery_suppression.py` was refined, not relaxed.** The rule "every
  discovery query uses the visibility CTE" now names four functions that read
  no candidate (config, a lock, the view log's own counts, partition upkeep),
  each with a reason, and **fails if any of them mentions a candidate table**.
  Worth a second look in review.
- **No name is guessed.** Only the structured form stores one; uploaded CVs
  reveal contact details and no name (blockers E13).
- **R15 landed here, not Day 15**, because Day 14 lists it and the employer's
  subscription is the access window anyway. Existing employer test helpers
  now seed one (`subscribe_tenant`).

### Owed

- **N4 / B7** — the client's written acknowledgement of the bulk-extraction
  risk is still not in. These controls are mitigation; verification is the fix.
- **Someone to read the alerts** (E14, blocked on E10), and the partition
  schedule (E4).
- **Per-organisation overrides of the limits**: one global row today.
- **Load**: caps and the reveal query are indexed, not measured (Week 5).

---

## 2026-09-15 — Day 13: masked candidate search

**1591 -> 1663 tests.** Local CI chain green: age, vocabulary, ruff, format,
mypy, 9 import contracts, modules. Coverage 85%.

**The first push (`c10f20f`) failed CI on a flaky test of ours**:
`test_a_newer_score_replaces_what_search_knows`, about one run in ten locally
too. The product was right: the test's random skill was hex, and a hex token
sometimes holds eight digits in a row, which `CONTACT_LIKE_PATTERN` drops as a
phone number. Test tokens are now letters only. The contact filter's cost is
the same for real data: a skill containing eight or more digits in a row is
not indexed.

- `test_pipeline.py::test_a_smuggled_field_is_refused` (Day 12) failed once in
  the long local run and passes alone and with its file. It passed in CI.
- **The full local run took 1h40m; the CI tests job takes about 2.5 minutes**,
  so the slowness is this machine, not Day 13.

### What landed

| | |
|---|---|
| **Employer search** | `GET /employer/discovery/candidates`: filters `band` (repeatable), `skill` (up to 5, all must match, case-insensitive), `badge`, `min_experience_years`, `state`, `city` (contains), `q` (words in a skill); keyset `cursor`, `limit`. Owners and recruiters of a **KYB-approved** employer; 300 pages/hour per organisation. |
| **The card** | `MaskedCandidate`: `candidate_id`, `band`, `experience_years`, `skills` (≤20), `badges`, `city`, `state_code`. Nothing else, and an invariant test holds the list. |
| **Candidate location** | `GET /candidate/profile`, `PUT /candidate/profile/location`. Not paywalled. |
| **Schema** | `candidate_search_documents` (trigger-written), `candidate_profiles`, trigger `project_candidate_search_document` on `scores`, index `ix_scores_user_latest`. **Rebuild with `reset_local_db.sh`.** |

### Decisions worth knowing

- **The search document is a trigger's, not a task's.** An `AFTER INSERT` on
  `scores` writes it in the transaction that wrote the score; the app role has
  no INSERT/UPDATE/DELETE on it. So it cannot miss an event, lag a re-score, or
  carry something the score does not support. An older score arriving late
  never overwrites a newer document.
- **Generated, not hand-copied.** The trigger's band CASE comes from
  `scoring.domain.BANDS`, badges from `BADGE_FOR_ADDON_KIND`, the contact
  filter from `CONTACT_LIKE_PATTERN`, as the application guard comes from
  `allowed_transitions()`. `discovery` still imports nothing from `scoring`;
  the migration and the tests do the joining.
- **Experience is summed in SQL**, and a parametrised test holds it equal to
  `features_from_extraction` over malformed roles too (strings, floats,
  booleans, negatives, non-lists).
- **Visibility is still only the Day 9 CTE.** Search joins the document on
  `(user_id, resume_version_id)`, so a suppressed or unchecked candidate keeps a
  document and never appears, and a stale document matches nothing.
- **Band, never score, and ordering by band only.** Within a band the order is
  by id, which means nothing. No total: a count over a narrow filter says
  whether one person is in the pool.
- **Skills are CV text and can carry contact details.** Anything email- or
  phone-shaped is dropped from the document, so it can't be searched for
  either, and dropped again at the card. The pattern spares "ISO 9001:2015",
  "IEC 61131-3", "Python 3.12".
- **Location did not exist anywhere**, so it is new, and it is **ours, not the
  client's**: optional, declared by the candidate, city plus state, no address
  or PIN code (with a band and skills, a PIN narrows a card to a handful of
  people). A city refuses digits and `@`. Layer 1 was not asked to extract a
  location, since that changes the prompt version and so every score.
- **Viewers cannot search.** SRS 1.14.1 names recruiter and owner. Widening it
  is one dependency.
- **No audit row for a search.** A card holds nothing PRD rule 9 calls private.
  The audit belongs to the Day 14 reveal.
- **Only the filters asked for are in the SQL.** A single statement of
  `(:x IS NULL OR ...)` terms gets a generic plan that can use none of the GIN
  indexes. Every value is still a bind parameter.
- **Indexes:** GIN on `skill_keys`, `badges`, `search_vector` (`simple`
  config: skills are proper nouns); btree `(band_rank DESC, user_id)` for the
  keyset; trigram on `candidate_profiles.city`; and `ix_scores_user_latest`
  matching the CTE's `DISTINCT ON` order, which the old index could not serve.
  **Not verified under load**; that is Week 5 (plan §9, target < 600 ms).

### Owed

- **Questionnaire badges**: no questionnaire tables until Day 16.
- **Configurable caps, the access window, anomaly detection** (Day 14). The
  hourly page limit here is a constant floor.
- **The employer subscription gate** (Day 15).
- **N5**, the unlock-criteria rescission, is still unasked (blockers B6). It
  does not block the build.

---

## 2026-09-15 — Day 12: the pipeline, interviews, the two-sided hire, expiry

**1455 -> 1591 tests**, full local CI chain green (age, vocabulary, ruff,
mypy, 9 import contracts, modules, pytest at 85%).

### What landed

| | |
|---|---|
| **Employer pipeline** | `/employer/applications`: list a job's applications (oldest first, by stage, keyset), open one, `POST /{id}/stage`, `PUT /{id}/interview`, `POST /{id}/hire`. Owners and recruiters act; viewers read. |
| **Candidate side** | `GET /candidate/applications/{id}` now carries the history; `POST /{id}/hire/confirm` and `/hire/dispute`. Not paywalled. |
| **Expiry** | `applications.service.expire_for_tenant` and the `applications.expire` task (`app/tasks/expire_applications.py`). |
| **Schema** | `applications.expires_at` replaced by `employer_active_at`; `hire_disputed_at`; five CHECKs; `application_events.kind` and `actor_type`; trigger `guard_application_write`. **Rebuild with `reset_local_db.sh`.** |

### Decisions worth knowing

- **One stage forward, or rejected.** SRS 1.9.2's "next permitted stage".
  Acting on a SUBMITTED application records VIEWED first, and opening one
  records VIEWED once, for any role — so a candidate's board never shows a
  decision about something nobody opened. Moving to the current stage is a
  no-op, not a 409, so a retried drag is harmless.
- **HIRED is nobody's alone.** The employer proposes (`employer_confirmed_at`);
  the candidate's confirmation is the transition, written in one statement with
  the stage because a CHECK refuses either without the other. Both are latches.
  `applications.hire_confirmed` is the final hire event; **nothing is billed on
  it** (client deferred, `answers-log.md` 0.8).
- **A dispute adjudicates nothing.** It is recorded and the hire stays
  unconfirmed; it closes by the candidate confirming, the employer rejecting,
  or the candidate withdrawing. Nobody can review it yet (blockers E12, E10).
- **The database holds the pipeline too**, as the publish trigger holds
  invariant 8. `guard_application_write` enforces the transition graph (built
  from `domain.allowed_transitions()`, so the two cannot drift), the latches,
  filing at SUBMITTED, and **which party may write which columns** — a tenant
  transaction cannot withdraw, confirm or dispute; a candidate transaction can
  do nothing else. Tested on app-role sessions with the service out of the way.
- **Expiry is measured, not stamped.** `employer_active_at` moves on every
  employer action and the sweep compares it with the configured period, so
  changing the period applies to every open application at once. A booked
  interview holds an application open; a proposed hire never expires.
  **The 30-day default is ours** (blockers C13). A malformed config row stops
  the sweep rather than defaulting.
- **The sweep binds each employer tenant from `tenants`** — the one place a
  tenant id does not come from a membership. It is the system acting, with no
  caller to supply one, and binding keeps it under the same RLS as a request,
  one transaction per tenant, `SKIP LOCKED` so it never waits on an employer.
- **The employer's notes, and which recruiter acted, never reach the
  candidate.** The board shows who moved it as a party. A unit test fails if a
  candidate schema grows `note` or `actor_id`.
- **The meeting link stays off the outbox.** The candidate reads it behind
  their own authentication. Links must be `https` with a real host and no
  credentials; **which host is not restricted** (blockers E11).
- **The pipeline is not a profile.** `candidate_id` and nothing about who they
  are — that is the Day 13–14 reveal, behind the access window and its audit.
- `application_events.occurred_at` is `clock_timestamp()`: VIEWED and
  SHORTLISTED written in one transaction sort in the order they happened.

### Owed

- **The EventBridge schedule** for the sweep (E4). Until then nothing expires
  on its own — the safe direction.
- **Notifications** for stage changes, interviews and hires (Day 19; SMS
  gated on DLT). The events are emitted with ids only.
- **The employer subscription gate** on these routes (Day 15, with the rest).
- **Whether a HIGH integrity signal raised after applying should hide the
  application from the pipeline.** Today it does not: the pipeline shows no CV
  content, and the Day 14 reveal is where the visibility rule should apply.

---

## 2026-09-15 — Day 11: the job board, eligibility, apply and withdraw

**1406 -> 1455 tests.** Before starting, Days 1–10 were re-verified
against a rebuilt database: 1406 passing, with the partial days (3, 4, 6, 8, 9)
still partial for the external reasons already recorded (Twilio, AWS service
activation, E10).

### What landed

| | |
|---|---|
| **Job board** | `GET /candidate/jobs` (search: words, location, work mode, skill, salary, eligible-only; keyset cursor) and `GET /candidate/jobs/{id}`. Every employer's published jobs with the employer's name. |
| **Applications** | `POST /candidate/applications`, `GET` list and one, `POST /{id}/withdraw`. |
| **Pay-first (R13)** | `require_active_subscription` stops being an unconditional 402. It reads `subscriptions` on every request, never cached, and the clock decides: a period that ended a second ago grants nothing, sweep or no sweep. |

### Decisions worth knowing

- **A candidate has no tenant, so the board needed its own RLS identity.**
  Binding `app.tenant_id` to each employer in turn would take the tenant from
  somewhere other than a membership, which SRS 2.24.7 forbids. Candidate
  services bind `app.user_id` instead, and five new policies read it through
  `current_candidate_id()`, which is NULL unless **no tenant is bound** and the
  id is an **active candidate account**. So an employer transaction can never
  see another employer's jobs through them, a business user bound as a user
  sees nothing, and a transaction that binds nothing still reads no jobs.
  17 policies, up from 12.
- **The threshold is never shown to a candidate.** Beside their own score it is
  the gap, and the gap is the explanation R11 rules out. They get
  `ELIGIBLE / BELOW_THRESHOLD / SCORE_PENDING`, judged on the stored score. A
  score in the query string is ignored, and a test says so.
- **Applying follows the discovery rule.** Applying puts a candidate in front of
  an employer, so it uses the same `is_candidate_visible` CTE as search.
  Without it a CV held back by a HIGH integrity signal reaches employers
  through the apply button: the bypass Day 9 closed for search. The refusal
  (`application_unavailable`) does not say why, because naming an integrity
  review tells someone gaming a CV that they were caught.
- **Idempotent by the index, not by a read.** `ON CONFLICT DO NOTHING` against
  `uq_application_active`; three simultaneous applies give one 201 and two 200s
  with the same id. A retry is checked first, so it gets the same answer
  whatever changed in between.
- **An application's tenant is its job's tenant, by a key.** A candidate writes
  the row and has no tenant to bind, so a single-column key on `job_id` would
  let the row claim any tenant and land in the wrong employer's pipeline.
  `fk_applications_job_tenant` on `(job_id, tenant_id)` holds it even for the
  migrator.
- **The database refuses what the service refuses.** A candidate session cannot
  apply as someone else, apply to a job that is not live, read or withdraw
  another candidate's application, or change a job. Tested on an app-role
  session with the service out of the way.
- **Reading and withdrawing are not paywalled.** A lapsed subscriber keeps their
  applications and can withdraw them; they cannot search or apply. An
  application nobody can withdraw without paying is their data held in an
  employer's pipeline for a fee.
- **A job off the board is a 404 everywhere**, for the detail and for applying:
  draft, paused, closed and nonexistent look the same.
- **The Application Board still names a job that closed.** The board policy
  also shows jobs the candidate applied to, so board queries filter on status
  themselves.
- **`published_at` is stamped by a trigger** and held by a CHECK, because the
  cursor is `(published_at, id)` and fixtures insert PUBLISHED rows directly.

### Owed

- **The seat limb of the entitlement check** (Day 17). `college_seats` is one
  allowance row per college with no per-student assignment, so there is
  nothing to ask. A seated student is refused until then; no seat has been
  sold.
- **The gate on the score, resume and employer routes** (Day 15). The
  dependency works; nobody can buy a subscription yet, so adding it to routes
  that exist today would lock every account out of them.
- **GRACE semantics** (Day 15): a GRACE row grants access only while
  `current_period_end` is in the future, so entering GRACE must move that date.
- `IDEMPOTENT_OPERATIONS` lists `application_create`; apply is idempotent by
  the unique index and does not read an `Idempotency-Key` header.

---

## 2026-09-13 (evening) — Day 10: KYB and jobs; Bedrock connected; Week 1 gate closed

**1237 -> 1406 tests.** `59e9edc` carries the Bedrock connection, integrity
thresholds as config and the cross-tenant suite; `4115c6a` is Day 10. Both are
green on CI.

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
