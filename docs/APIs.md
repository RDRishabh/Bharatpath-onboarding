# APIs — every route, what it does, and how the flows fit together

The companion to [how-it-all-connects.md](how-it-all-connects.md) (deployment
topology) and [plan.md](plan.md) (scope and schedule). This one is the API
surface itself: every route that exists today, what guards it, and the request
sequences a client actually walks through.

All paths below are relative to the global prefix **`/api/v1`**
(`Settings.api_v1_prefix`, applied once in `app/main.py`). There is no
versioning below v1. `app/api/router.py` mounts `app.api.health.router`
unprefixed, then walks `app.modules.ALL_MODULES` in a fixed order, mounting
each module's `get_router()` at its declared prefix, plus any
`get_extra_routers()` at their own prefixes — this is how one module serves
two surfaces (`jobs` also answers under `/candidate/jobs`, `applications`
under `/employer/applications`, `subscriptions` under both `/candidate/...`
and `/employer/...`, and `candidate` mounts the employer-facing reveal route).

**Route prefixes are for readability only.** Authorization happens in
dependencies (`require_role`, `require_active_subscription`, …), never by
matching the path — see `app/core/deps.py`.

## Auth model

There is no login/token endpoint in this service. Cognito issues the token —
candidates via phone OTP (custom-auth) or email, business accounts via
password + mandatory software-token MFA — and this service only verifies the
token and then resolves role and tenant itself:

- **`CurrentUser` / `TenantContext`** — the authenticated caller, built from a
  verified Cognito token plus a live (60s-cached) lookup of the `memberships`
  table. Carries `user_id`, `role`, `pool` (`CANDIDATE` / `BUSINESS`),
  `tenant_id`. Token claims and Cognito groups are never the authority — see
  the CLAUDE.md note on membership revocation.
- **Roles**: `CANDIDATE`, `EMPLOYER_OWNER`, `EMPLOYER_RECRUITER`,
  `EMPLOYER_VIEWER`, `COLLEGE_ADMIN`, `COLLEGE_STAFF` (the college roles have
  no routes yet).
- **`require_role(*roles)`** — 403 if the caller's role isn't in the set.
- **`require_active_subscription`** — the pay-first gate (R13). Checks
  `has_active_subscription` live, for the caller's user or tenant. 402
  `subscription_required` if lapsed. Always applied *after* a role guard, so
  a wrong-role caller gets 403, not "pay us."
- **`require_active_access_window`** — the same live check, employer-tenant
  only, used solely by the candidate reveal. Same underlying state as
  subscription, but a distinct 402 code (`access_window_expired`) — see the
  Day 14 notes in CLAUDE.md.
- **`require_kyb_approved`** — invariant 8; also enforced at the DB-trigger
  level on job publish, so this dependency is belt, not suspenders.
- **`current_business_identity`** — resolves a BUSINESS-pool token to a
  user id and optional membership *without* requiring an org yet. Used by
  exactly two routes: `GET /employer/reference` and
  `POST /employer/organisation`. Nothing else should depend on it — every
  other route is a way in that skips the membership check.
- **Dev-only routes** don't exist at all (not just 403'd) unless their flag is
  set, and `Settings` refuses to boot with the flag set outside local/CI:
  `POST /auth/dev/token` (`AUTH_ALLOW_LOCAL_TOKENS`) and
  `POST /billing/dev/payments/{payment_id}/simulate` (`PAYMENTS_PROVIDER=stub`).

---

## Health — unauthenticated, no module prefix

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/health` | Liveness probe |
| GET | `/api/v1/health/ready` | Readiness probe — checks DB and Redis |

---

## identity — `/auth`

Cognito linkage, sessions, "who am I."

| Method | Path | Auth | Body | Response | Notes |
|---|---|---|---|---|---|
| POST | `/auth/otp/start` | Public, rate-limited by phone/IP | `{phone}` | `{retry_after_seconds}` (202) | Sits in front of Cognito's custom-auth flow; response is identical whether the phone is known or not — no enumeration |
| GET | `/auth/me` | Any authenticated user | — | `{user_id, role, pool, tenant_id}` | Smallest possible proof the auth chain works end to end |
| POST | `/auth/dev/token` | Dev-only, flag-gated | `{subject, pool, phone?, email?}` | `{access_token, subject, expires_in}` | Only exists when `AUTH_ALLOW_LOCAL_TOKENS=true`; mints a real RS256 token locally |

## candidate — `/candidate` (+ extra router at `/employer/discovery`)

Candidate's own profile, and — co-located because it needs the display score
— the employer's "open a profile" reveal route.

| Method | Path | Auth | Body/Params | Response | Notes |
|---|---|---|---|---|---|
| GET | `/candidate/profile` | CANDIDATE | — | `CandidateProfileResponse` | |
| PUT | `/candidate/profile/location` | CANDIDATE | `{city?, state?}` | `CandidateProfileResponse` | Shown on masked employer cards; city rejects digits/`@` |
| PUT | `/candidate/profile/name` | CANDIDATE | `{full_name}` | `CandidateProfileResponse` | Only ever shown to an employer who reveals the profile; never guessed from a CV |
| GET | `/employer/discovery/candidates/{candidate_id}` | OWNER/RECRUITER + `require_active_access_window` | path | `RevealedCandidate` | **The reveal.** Name, contact, display score. Every call — including re-opens — writes an audit row and a view event in the same transaction. 402 `access_window_expired`, 403 `kyb_required`, 429 rate/view-cap, 404 not visible |

## resume — `/candidate/resume`

Upload → parse → review → **confirm gate**. Every route is CANDIDATE-only.

| Method | Path | Body/Params | Response | Notes |
|---|---|---|---|---|
| POST | `/candidate/resume/uploads` | — | `{upload_id, url, expires_in_seconds, max_bytes, accepted_types}` (201) | Presigned S3 PUT ticket; nothing written to the DB yet |
| POST | `/candidate/resume/uploads/{upload_id}/complete` | path | `{resume_file_id, scan_status, parse_status}` (202) | Server re-derives key/size/type itself; queues async parse (pypdf/docx first, Textract only on a length-floor miss) |
| GET | `/candidate/resume/files/{resume_file_id}` | path | `ResumeFileStatusResponse` | Poll until scan/parse hits a terminal state; 404 (not 403) for someone else's file |
| POST | `/candidate/resume/text` | `{text}` | `ResumeVersionResponse` (201) | Pasted-text CV — no file, no scan, no OCR |
| POST | `/candidate/resume/manual` | `ManualResumeRequest` | `ResumeVersionResponse` (201) | Structured-form CV; no DOB/age field exists anywhere in it (invariant 5) |
| GET | `/candidate/resume/versions` | — | `list[ResumeVersionSummary]` | The version chain, no content |
| GET | `/candidate/resume/versions/{id}` | path | `ResumeVersionDetailResponse` | Full parsed content — the review screen |
| POST | `/candidate/resume/versions/{id}/edit` | path + `ResumeEditRequest` | `ResumeVersionResponse` (201) | A correction creates a **new** unconfirmed version chained by `supersedes_id`; never inherits confirmation; 409 if the source was already superseded |
| POST | `/candidate/resume/versions/{id}/confirm` | path | `{resume_version_id, confirmed_at, already_confirmed}` | **The only door to scoring** (SRS 1.4.4). Idempotent — 200 on a repeat call |

## scoring — `/candidate/score`

One route, deliberately.

| Method | Path | Auth | Response | Notes |
|---|---|---|---|---|
| GET | `/candidate/score/me` | CANDIDATE + active subscription | `{status: PENDING\|READY, value?, band?, computed_at?}` | 200 `PENDING` while unscored, not 404. Never a breakdown — the score is never explained, by dedicated test. Lapsed subscriber gets 402 |

Scoring itself has no other HTTP surface: it fires on the
`resume.version_confirmed` event, never `version_created`, and
`replay(score_id)` (internal, not a route) re-derives a historical score from
the stored model extraction without ever calling the model again.

## integrity — `/integrity`

Stub. No routes yet — signal severity, search suppression are wired
internally (`integrity-never-imports-scoring`) but there's no HTTP surface for
review actions (blocked on platform-staff accounts, `docs/blockers.md` E10).

## questionnaire — `/candidate/questionnaire`

Worth **zero points** — its event routes to nothing in scoring. Every route:
CANDIDATE + active subscription.

| Method | Path | Body | Response | Notes |
|---|---|---|---|---|
| GET | `/candidate/questionnaire` | — | `QuestionnaireView` | Bank + saved answers |
| PUT | `/candidate/questionnaire/answers` | `{answers}` | `QuestionnaireView` | Merge-save; 422 lists every invalid answer |
| POST | `/candidate/questionnaire/submit` | — | `QuestionnaireView` | Shares the saved answers with employers |
| GET | `/candidate/questionnaire/report` | — | `QuestionnaireReportResponse` | What was shared, by section |

## interview — `/candidate/interview`

Mock interview, bought like a one-off, not an entitlement. Every route needs
an active subscription; a session additionally needs its own purchase.

| Method | Path | Body/Params | Response | Notes |
|---|---|---|---|---|
| GET | `/candidate/interview/offer` | — | `OfferResponse` | Price, device-check status, whether a session would move the score |
| POST | `/candidate/interview/device-checks` | `{mic_ok, audio_out_ok, network_kbps, storage_mb, quiet_env_ok}` | `DeviceCheckResponse` (201) | 201 whether it passes or fails |
| POST | `/candidate/interview/checkout` | `{acknowledge_no_score_increase}` | `CheckoutResponse` (201) | 409 without a passed device check in the last hour, or without the acknowledgement once 3 sessions are already held; grants nothing until the payment callback lands |
| POST | `/candidate/interview/sessions` | — | `SessionResponse` (201) | Returns the already-open session if there is one — that's the recovery path, there's no abandon |
| GET | `/candidate/interview/sessions` | — | `list[SessionSummary]` | Newest first |
| GET | `/candidate/interview/sessions/{id}` | path | `SessionResponse` | Session + answer manifest |
| POST | `/candidate/interview/sessions/{id}/answers/{q}/upload` | path | `AnswerUploadResponse` (201) | Presigned URL for one audio answer |
| POST | `/candidate/interview/sessions/{id}/answers/{q}/complete` | path + `{duration_ms}` | `AnswerResponse` | A STORED answer never changes afterward |
| POST | `/candidate/interview/sessions/{id}/complete` | path | `SessionResponse` | Needs every question answered; +20 per completed session, a fourth included, +60 cap enforced by scoring alone |

## courses — `/candidate/courses`

Catalogue + purchase only. **No completion route** — completion isn't
self-reported; it's written server-side by `courses.service.record_completion`
and routes to `rescore_for_addons`, not `score_resume` (which is idempotent
per version and would silently no-op).

| Method | Path | Body/Params | Response | Notes |
|---|---|---|---|---|
| GET | `/candidate/courses` | — | `list[CourseResponse]` | Catalogue with purchased/completed flags |
| POST | `/candidate/courses/{course_id}/checkout` | path | `CheckoutResponse` (201) | Nothing granted until the payment callback settles |

## employer — `/employer`

Org and team. Only `GET /employer/reference` and `POST /employer/organisation`
are reachable before an org exists.

| Method | Path | Auth | Body/Params | Response | Notes |
|---|---|---|---|---|
| GET | `/employer/reference` | business account, no org needed | — | `{employer_types, industries}` | Vocab for the org-creation form |
| POST | `/employer/organisation` | business account, no org needed | `CreateOrganisationRequest` | `OrganisationResponse` (201) | Caller becomes owner; 409 if the account is already in an org, including a suspended one |
| GET | `/employer/organisation` | any employer role | — | `OrganisationResponse` | |
| PATCH | `/employer/organisation` | OWNER only | `UpdateOrganisationRequest` | `OrganisationResponse` | Name/type/industry only — **not** KYB status (invariant 8; that's `kyb.service.set_kyb_status` alone) |
| GET | `/employer/team` | any employer role | — | `list[TeamMemberResponse]` | |
| POST | `/employer/team` | OWNER only | `{email, role}` | `TeamMemberResponse` (201) | Access granted on that person's next sign-in |
| PATCH | `/employer/team/{user_id}` | OWNER only | path + `{role}` | `TeamMemberResponse` | 404 outside the org; 409 if it would leave the org ownerless |
| DELETE | `/employer/team/{user_id}` | OWNER only | path | 204 | Revoked, not deleted |

## kyb — `/employer/kyb`

Every route: OWNER only.

| Method | Path | Body/Params | Response | Notes |
|---|---|---|---|---|
| GET | `/employer/kyb/form` | — | `KybFormResponse` | Definition/options; server validates independently of what the client shows |
| GET | `/employer/kyb` | — | `KybSubmissionResponse` | Current submission |
| PUT | `/employer/kyb/answers` | `SaveAnswersRequest` | `KybSubmissionResponse` | Merge-save; 422 lists malformed fields |
| POST | `/employer/kyb/documents` | `{doc_type}` | `DocumentTicketResponse` (201) | Presigned upload URL |
| POST | `/employer/kyb/documents/{upload_id}/complete` | path + `{doc_type}` | `KybSubmissionResponse` | Key rebuilt from the caller's own org; 404 for someone else's upload |
| POST | `/employer/kyb/submit` | — | `KybSubmissionResponse` | Auto-approves under the default config row, or queues for review (R15 — `kyb.require_approval`); 422 lists missing items. No reviewer-action route exists yet — no platform-staff account can exist (`docs/blockers.md` E10) |

## jobs — `/employer/jobs` (+ extra router at `/candidate/jobs`)

Employer composer and the candidate board. `/threshold-preview` is declared
ahead of `/{job_id}` to avoid a path collision.

| Method | Path | Auth | Body/Params | Response | Notes |
|---|---|---|---|---|
| POST | `/employer/jobs` | OWNER/RECRUITER + active subscription | `CreateJobRequest` | `JobResponse` (201) | Draft |
| GET | `/employer/jobs` | any employer role + active subscription | `status` | `list[JobResponse]` | Newest first |
| GET | `/employer/jobs/threshold-preview` | OWNER/RECRUITER + active subscription | `min_score` (700–990, stepped, rate-limited per org) | `ThresholdPreviewResponse` | Rounded/coarse count only, floored under ten — never exact, so a threshold can't be used to binary-search one candidate's score |
| GET | `/employer/jobs/{job_id}` | any employer role + active subscription | path | `JobResponse` | 404 cross-org |
| PATCH | `/employer/jobs/{job_id}` | OWNER/RECRUITER + active subscription | path + `UpdateJobRequest` | `JobResponse` | 409 once published/closed — pause first |
| POST | `/employer/jobs/{job_id}/publish` | OWNER/RECRUITER + active subscription | path | `JobResponse` | 403 `kyb_required` without approved KYB — invariant 8, also enforced by a DB trigger |
| POST | `/employer/jobs/{job_id}/pause` | OWNER/RECRUITER + active subscription | path | `JobResponse` | |
| POST | `/employer/jobs/{job_id}/close` | OWNER/RECRUITER + active subscription | path | `JobResponse` | Terminal |
| GET | `/candidate/jobs` | CANDIDATE + active subscription | `q, location, work_mode, skill, min_salary_minor, eligible_only, cursor, limit` | `Page[BoardJobSummary]` | Published jobs only; `eligibility` is computed against the candidate's **stored** score — the threshold number itself is never shown |
| GET | `/candidate/jobs/{job_id}` | CANDIDATE + active subscription | path | `BoardJobDetail` | 404 for anything not currently on the board |

## applications — `/candidate/applications` (+ extra router at `/employer/applications`)

The pipeline. Stage machine lives in `applications.domain` and is mirrored by
a DB guard (`guard_application_write`) that no writer, including the
migrator, can bypass.

| Method | Path | Auth | Body/Params | Response | Notes |
|---|---|---|---|---|
| POST | `/candidate/applications` | CANDIDATE + active subscription | `{job_id}` | `ApplicationResponse` (201 new / 200 repeat) | 404 job not on the board, 409 `score_pending`/`application_unavailable`, 403 `eligibility_below_threshold` — no gap or number given |
| GET | `/candidate/applications` | CANDIDATE | `cursor, limit` | `Page[ApplicationResponse]` | Not paywalled — reading your own data is always allowed |
| GET | `/candidate/applications/{id}` | CANDIDATE | path | `ApplicationDetailResponse` | With stage history |
| POST | `/candidate/applications/{id}/withdraw` | CANDIDATE | path | `ApplicationResponse` | Any pre-outcome stage; 409 once hired/rejected/expired |
| POST | `/candidate/applications/{id}/hire/confirm` | CANDIDATE | path | `ApplicationResponse` | Finalizes a hire the employer proposed; the candidate's confirmation, not the employer's, is what writes HIRED; 409 `hire_confirmation_not_pending` |
| POST | `/candidate/applications/{id}/hire/dispute` | CANDIDATE | path | `ApplicationResponse` | |
| GET | `/employer/applications` | OWNER/RECRUITER/VIEWER + active subscription | `job_id` (required), `stage, cursor, limit` | `Page[EmployerApplicationSummary]` | Oldest first |
| GET | `/employer/applications/{id}` | OWNER/RECRUITER/VIEWER + active subscription | path | `EmployerApplicationDetail` | Opening a SUBMITTED application auto-moves it to VIEWED, once |
| POST | `/employer/applications/{id}/stage` | OWNER/RECRUITER + active subscription | path + `{stage, note}` | `EmployerApplicationDetail` | One stage forward, or REJECTED; 409 otherwise |
| PUT | `/employer/applications/{id}/interview` | OWNER/RECRUITER + active subscription | path + `{interview_at, meeting_url}` | `EmployerApplicationDetail` | Book/rebook, only at INTERVIEW stage (409 otherwise); 422 for a non-https link or a time over a year out |
| POST | `/employer/applications/{id}/hire` | OWNER/RECRUITER + active subscription | path | `EmployerApplicationDetail` | *Proposes* a hire (`employer_confirmed_at`) — HIRED itself is never the employer's to write. Only from DECISION stage (409 `hire_not_allowed`); idempotent |

## discovery — `/employer/discovery`

Masked search. The reveal route is mounted here too but lives in the
`candidate` module (see above) because it needs `display_value`, and
`discovery` may not import `scoring`.

| Method | Path | Auth | Body/Params | Response | Notes |
|---|---|---|---|---|
| GET | `/employer/discovery/candidates` | OWNER/RECRUITER + active subscription | `band[], skill[] (all must match), badge[], min_experience_years, state, city, q, cursor, limit` | `Page[MaskedCandidate]` | No name/phone/email/score on the card, ever — only band. Built entirely on `VISIBLE_CANDIDATES_CTE`, so a suppressed candidate never appears even though their search document still exists |

## billing — `/billing`

Payments and the gateway callback. **The only route that actually grants
anything** across subscriptions, courses, and interview purchases.

| Method | Path | Auth | Body/Params | Response | Notes |
|---|---|---|---|---|
| GET | `/billing/payments/{payment_id}` | any authenticated user | path | `PaymentResponse` | Own payments only; someone else's is 404 |
| POST | `/billing/callbacks/{provider}` | **Public** — HMAC-SHA256 (`X-Payment-Signature`) over the raw body, not a bearer token | path + raw body | `{received, duplicate}` | Unsigned or mis-signed → 401, nothing stored. This is where `process_callback` actually settles a payment and grants the entitlement |
| POST | `/billing/dev/payments/{payment_id}/simulate` | any authenticated user, dev-only (`PAYMENTS_PROVIDER=stub`) | path + `{outcome, failure_code?}` | `PaymentResponse` | Signs and runs the exact same callback code path a real gateway would |

## subscriptions — mounted twice: `/candidate/subscription` and `/employer/subscription`

`get_router()` returns `None` on purpose — nothing is mounted at a bare
`/subscriptions`; the same five routes are mounted once per audience with
different guards.

| Method | Path | Candidate guard | Employer guard | Body | Response | Notes |
|---|---|---|---|---|---|---|
| GET | `.../plans` | CANDIDATE | OWNER/RECRUITER/VIEWER | — | `list[PlanResponse]` | Plans on sale for that audience |
| GET | `.../` | CANDIDATE | OWNER/RECRUITER/VIEWER | — | `SubscriptionResponse` | Current state; anyone in the org can read |
| POST | `.../checkout` | CANDIDATE | OWNER only | `{plan_code}` | `CheckoutResponse` (201) | First purchase or manual renewal; grants nothing until the callback |
| POST | `.../cancel` | CANDIDATE | OWNER only | — | `SubscriptionResponse` | Stops auto-renew at period end; idempotent |
| POST | `.../mandate` | CANDIDATE | OWNER only | — | `{state, max_amount_minor, valid_until, authorisation_url}` (201) | Sets up UPI AutoPay; stays manual until the payer approves in the UPI app; a debit still needs a NOTIFIED `mandate_debit_notices` row ≥24h ahead |

## engagement — `/candidate/streak`

Daily check-in points. Deliberately **not** behind `require_active_subscription`
— a lapsed subscriber shouldn't lose a streak for not paying — and
structurally unable to touch the score: `engagement` and `scoring` are kept
independent by import-linter.

| Method | Path | Auth | Body/Params | Response | Notes |
|---|---|---|---|---|
| GET | `/candidate/streak/me` | CANDIDATE | — | `StreakResponse` | Current streak, points, milestones; never counts "today" on its own |
| POST | `/candidate/streak/me/check-in` | CANDIDATE | — | `{counted, streak, changes[]}` | Idempotent per IST calendar day; call on every app open/foreground |
| GET | `/candidate/streak/me/points` | CANDIDATE | `limit` (1–200, default 50) | `list[StreakPointsChangeResponse]` | Newest first |

## Stub modules — registered, no routes yet

These are in `ALL_MODULES` (so they show up in the OpenAPI schema) but have
zero callable routes today:

| Module | Prefix | What's planned |
|---|---|---|
| integrity | `/integrity` | Signal review actions — blocked on a platform-staff account (blockers E10) |
| college | `/college` | Institution tenant, roster, invites, consent, referral codes |
| analytics | `/college/analytics` | Cohort aggregates, placement tracking |
| admin | `/admin` | Queues, drill-downs, disputes, suspensions |
| notifications | `/notifications` | Event→channel fan-out; templates exist (`notifications/templates.py`) but every `dlt_template_id` is still `None`, so nothing can send |
| privacy | `/privacy` | Export/deletion requests, DSR tracking |

---

## Major flows

### 1. Candidate onboarding → score

```
POST /auth/otp/start
  → Cognito custom-auth (external, not this API)
GET  /auth/me

POST /candidate/resume/uploads              (presigned S3 ticket)
  → client PUTs the file straight to S3
POST /candidate/resume/uploads/{id}/complete   (queues async parse)
GET  /candidate/resume/files/{id}            (poll until terminal)
GET  /candidate/resume/versions/{id}         (review what was extracted)
POST /candidate/resume/versions/{id}/edit    (optional — makes a NEW version, back to review)
POST /candidate/resume/versions/{id}/confirm (the gate — nothing scores before this)
  → async: resume.version_confirmed → scoring
GET  /candidate/score/me                     (needs active subscription; PENDING until ready)
```

`POST /candidate/resume/text` and `POST /candidate/resume/manual` are
alternate entry points that skip file upload/scanning entirely but still land
at the same confirm gate before scoring will touch them.

### 2. Candidate job search → hire

```
GET  /candidate/jobs                         (eligibility computed from the STORED score)
GET  /candidate/jobs/{id}
POST /candidate/applications                 (403 if below threshold — no number given)
GET  /candidate/applications/{id}            (poll for stage changes)
  ... employer moves stage / books interview / proposes hire ...
POST /candidate/applications/{id}/hire/confirm   (or /hire/dispute)
```

### 3. Employer onboarding → publish a job

```
(Cognito business-pool sign-in, admin-provisioned account)
GET  /employer/reference
POST /employer/organisation                  (caller becomes owner)

GET/PUT /employer/kyb/*                      (form, answers)
POST /employer/kyb/documents (+ .../complete)
POST /employer/kyb/submit                    (auto-approves under default config, or queues)

POST /employer/subscription/checkout
  → gateway → POST /billing/callbacks/{provider}   (signed; this is what actually grants the subscription)
  (dev: POST /billing/dev/payments/{id}/simulate runs the same signed path locally)
GET  /billing/payments/{id}                   (poll for outcome)

POST /employer/jobs                          (draft; needs active subscription)
POST /employer/jobs/{id}/publish             (needs approved KYB — 403 kyb_required otherwise)
```

### 4. Employer discovery → reveal

```
GET /employer/discovery/candidates                       (masked search, band only)
GET /employer/discovery/candidates/{candidate_id}         (= candidate module's reveal route)
```
The reveal needs `require_active_access_window` (a live subscription check,
distinct 402 from search's `require_active_subscription`), approved KYB, and
is rate- and view-capped per organisation. Every call, including a re-open of
the same candidate, writes an `audit_events` row and a `candidate_view_events`
row in the same transaction.

### 5. Payment / entitlement flow (shared shape across subscriptions, courses, interview sessions)

```
POST <surface>/checkout          (subscriptions, courses, interview — same shape)
  → creates a Payment row, grants NOTHING yet
  → client is sent to the gateway
gateway → POST /billing/callbacks/{provider}   (HMAC-signed, public, no bearer token)
  → billing.service.process_callback verifies the signature and settles the
    payment — THIS is what grants the subscription / course ownership /
    interview session credit
client → GET /billing/payments/{payment_id}    (poll for outcome)
```
In non-prod, `POST /billing/dev/payments/{id}/simulate` signs and runs the
exact same callback path in place of a real gateway.

### 6. Add-on flows

**Questionnaire** (worth zero score points, by design):
```
GET /candidate/questionnaire
PUT /candidate/questionnaire/answers   (repeatable)
POST /candidate/questionnaire/submit
GET /candidate/questionnaire/report
```

**Mock interview** (bought per-session, not an entitlement):
```
GET  /candidate/interview/offer
POST /candidate/interview/device-checks
POST /candidate/interview/checkout          (needs a passed device check + acknowledgement past 3 sessions)
  → payment callback settles it
POST /candidate/interview/sessions
  for each question:
    POST .../answers/{i}/upload
    POST .../answers/{i}/complete
POST /candidate/interview/sessions/{id}/complete   (+20 to score, capped at +60 total)
```

**Courses** (completion is never a client call):
```
GET  /candidate/courses
POST /candidate/courses/{course_id}/checkout
  → payment callback grants ownership
  → courses.service.record_completion (internal only) → scoring.rescore_for_addons
```

---

## Implementation status

Fully implemented with routes: identity, candidate, resume, scoring,
questionnaire, interview, courses, employer, kyb, jobs, applications,
discovery, billing, subscriptions, engagement.

Registered but empty (`router = APIRouter()`, no routes): admin, analytics,
college, integrity, notifications, privacy. See `docs/blockers.md` and
`docs/plan.md` §14 for what's gating each.
