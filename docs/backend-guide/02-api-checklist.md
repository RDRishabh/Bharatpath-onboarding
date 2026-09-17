# 02 — The full API checklist

**Purpose of this doc: nothing gets missed.** Every HTTP endpoint in the
backend is listed below, grouped by which surface calls it (Candidate app /
Employer console / College console / shared). Pulled directly from every
module's `router.py` — not from `openapi.json`, which is stale (only 5 paths)
because nobody has regenerated it recently.

**Status key:** ✅ fully walked through in conversation · 🟡 mentioned in
passing, not walked through in detail · ⬜ not covered yet.

Total: **121 endpoints** across 18 modules. Four modules — `admin`,
`integrity`, `notifications`, `privacy` — currently expose **no** HTTP
endpoints at all; they only run internally (background tasks, or triggered by
other modules' events). That's not a gap in this doc — it's genuinely how the
code is today.

---

## Login / accounts (`identity`, prefix `/auth`)

| Status | Method | Path | What it's for |
|---|---|---|---|
| ✅ | POST | `/auth/otp/start` | Candidate: request an OTP (outer throttle only — Cognito+Twilio actually send it) |
| ✅ | GET | `/auth/me` | Anyone: "who does the server think I am" |
| ✅ | POST | `/auth/dev/token` | Local dev/test only — mints a fake-but-real token, skips Cognito entirely |

## Employer — organisation & team (`employer`, prefix `/employer`)

| Status | Method | Path | What it's for |
|---|---|---|---|
| ✅ | GET | `/employer/reference` | Employer types / industries for the signup form |
| ✅ | POST | `/employer/organisation` | Create the company, caller becomes Owner |
| ✅ | GET | `/employer/organisation` | Read the caller's own company |
| ✅ | PATCH | `/employer/organisation` | Owner edits company name/type/industry |
| ✅ | GET | `/employer/team` | List active team members |
| ✅ | POST | `/employer/team` | Owner invites someone by email |
| ✅ | PATCH | `/employer/team/{user_id}` | Owner changes someone's role |
| ✅ | DELETE | `/employer/team/{user_id}` | Owner removes someone |

## College — organisation & team (`college`, prefix `/college`)

| Status | Method | Path |
|---|---|---|
| ✅ | POST | `/college/organisation` |
| ✅ | GET | `/college/organisation` |
| ✅ | PATCH | `/college/organisation` |
| ✅ | GET | `/college/team` |
| ✅ | POST | `/college/team` |
| ✅ | PATCH | `/college/team/{user_id}` |
| ✅ | DELETE | `/college/team/{user_id}` |

## Employer — KYB verification (`kyb`, prefix `/employer/kyb`)

| Status | Method | Path |
|---|---|---|
| ✅ | GET | `/employer/kyb/form` |
| ✅ | GET | `/employer/kyb` |
| ✅ | PUT | `/employer/kyb/answers` |
| ✅ | POST | `/employer/kyb/documents` |
| ✅ | POST | `/employer/kyb/documents/{upload_id}/complete` |
| ✅ | POST | `/employer/kyb/submit` |

## Candidate — resume intake (`resume`, prefix `/candidate/resume`)

| Status | Method | Path |
|---|---|---|
| ✅ | POST | `/candidate/resume/uploads` |
| ✅ | POST | `/candidate/resume/uploads/{upload_id}/complete` |
| ✅ | GET | `/candidate/resume/files/{resume_file_id}` |
| ✅ | POST | `/candidate/resume/text` |
| ✅ | POST | `/candidate/resume/manual` |
| ✅ | GET | `/candidate/resume/versions` |
| ✅ | GET | `/candidate/resume/versions/{resume_version_id}` |
| ✅ | POST | `/candidate/resume/versions/{resume_version_id}/edit` |
| ✅ | POST | `/candidate/resume/versions/{resume_version_id}/confirm` |

## Candidate — score (`scoring`, prefix `/candidate/score`)

| Status | Method | Path |
|---|---|---|
| ✅ | GET | `/candidate/score/me` |

## Candidate — profile (`candidate`, prefix `/candidate`)

| Status | Method | Path |
|---|---|---|
| ⬜ | GET | `/candidate/profile` |
| ⬜ | PUT | `/candidate/profile/location` |
| ⬜ | PUT | `/candidate/profile/name` |

## Employer — masked search & reveal (`discovery` + `candidate`, prefix `/employer/discovery`)

| Status | Method | Path |
|---|---|---|
| ✅ | GET | `/employer/discovery/candidates` | masked search results |
| ✅ | GET | `/employer/discovery/candidates/{candidate_id}` | the reveal — full profile |

## Employer — jobs (`jobs`, prefix `/employer/jobs`)

| Status | Method | Path |
|---|---|---|
| ✅ | POST | `/employer/jobs` |
| ✅ | GET | `/employer/jobs` |
| ✅ | GET | `/employer/jobs/threshold-preview` |
| ✅ | GET | `/employer/jobs/{job_id}` |
| ✅ | PATCH | `/employer/jobs/{job_id}` |
| ✅ | POST | `/employer/jobs/{job_id}/publish` |
| ✅ | POST | `/employer/jobs/{job_id}/pause` |
| ✅ | POST | `/employer/jobs/{job_id}/close` |

## Candidate — job board (`jobs`, prefix `/candidate/jobs`)

| Status | Method | Path |
|---|---|---|
| ✅ | GET | `/candidate/jobs` |
| ✅ | GET | `/candidate/jobs/{job_id}` |

## Candidate — applying (`applications`, prefix `/candidate/applications`)

| Status | Method | Path |
|---|---|---|
| ✅ | POST | `/candidate/applications` |
| ✅ | GET | `/candidate/applications` |
| ✅ | GET | `/candidate/applications/{application_id}` |
| ✅ | POST | `/candidate/applications/{application_id}/withdraw` |
| ✅ | POST | `/candidate/applications/{application_id}/hire/confirm` |
| ✅ | POST | `/candidate/applications/{application_id}/hire/dispute` |

## Employer — the hiring pipeline (`applications`, prefix `/employer/applications`)

| Status | Method | Path |
|---|---|---|
| ✅ | GET | `/employer/applications` |
| ✅ | GET | `/employer/applications/{application_id}` |
| ✅ | POST | `/employer/applications/{application_id}/stage` |
| ✅ | PUT | `/employer/applications/{application_id}/interview` |
| ✅ | POST | `/employer/applications/{application_id}/hire` |

## Payments (`billing`, prefix `/billing`)

| Status | Method | Path |
|---|---|---|
| ✅ | GET | `/billing/payments/{payment_id}` |
| ✅ | POST | `/billing/callbacks/{provider}` |
| ✅ | POST | `/billing/dev/payments/{payment_id}/simulate` |

## Subscriptions — same 5 routes, 3 audiences (`subscriptions`)

| Status | Method | Candidate path | Employer path | College path |
|---|---|---|---|---|
| ✅ | GET | `/candidate/subscription/plans` | `/employer/subscription/plans` | `/college/subscription/plans` |
| ✅ | GET | `/candidate/subscription` | `/employer/subscription` | `/college/subscription` |
| ✅ | POST | `/candidate/subscription/checkout` | `/employer/subscription/checkout` | `/college/subscription/checkout` |
| ✅ | POST | `/candidate/subscription/cancel` | `/employer/subscription/cancel` | `/college/subscription/cancel` |
| ✅ | POST | `/candidate/subscription/mandate` | `/employer/subscription/mandate` | `/college/subscription/mandate` |

## Candidate — courses (`courses`, prefix `/candidate/courses`)

| Status | Method | Path |
|---|---|---|
| ✅ | GET | `/candidate/courses` |
| ✅ | POST | `/candidate/courses/{course_id}/checkout` |

## Candidate — questionnaire, worth zero score (`questionnaire`, prefix `/candidate/questionnaire`)

| Status | Method | Path |
|---|---|---|
| ✅ | GET | `/candidate/questionnaire` |
| ✅ | PUT | `/candidate/questionnaire/answers` |
| ✅ | POST | `/candidate/questionnaire/submit` |
| ✅ | GET | `/candidate/questionnaire/report` |

## Candidate — mock interview (`interview`, prefix `/candidate/interview`)

| Status | Method | Path |
|---|---|---|
| ✅ | GET | `/candidate/interview/offer` |
| ✅ | POST | `/candidate/interview/device-checks` |
| ✅ | POST | `/candidate/interview/checkout` |
| ✅ | POST | `/candidate/interview/sessions` |
| ✅ | GET | `/candidate/interview/sessions` |
| ✅ | GET | `/candidate/interview/sessions/{session_id}` |
| ✅ | POST | `/candidate/interview/sessions/{session_id}/answers/{question_index}/upload` |
| ✅ | POST | `/candidate/interview/sessions/{session_id}/answers/{question_index}/complete` |
| ✅ | POST | `/candidate/interview/sessions/{session_id}/complete` |
| ✅ | GET | `/candidate/interview/sessions/{session_id}/report` |

## Candidate — daily streaks (`engagement`, prefix `/candidate/streak`)

| Status | Method | Path |
|---|---|---|
| ⬜ | GET | `/candidate/streak/me` |
| ⬜ | POST | `/candidate/streak/me/check-in` |
| ⬜ | GET | `/candidate/streak/me/points` |

## Candidate — linking to a college (`college`, prefix `/candidate/colleges`)

| Status | Method | Path |
|---|---|---|
| ✅ | GET | `/candidate/colleges/consent-terms` |
| ✅ | GET | `/candidate/colleges` |
| ✅ | POST | `/candidate/colleges/link` |
| ✅ | GET | `/candidate/colleges/invitations` |
| ✅ | POST | `/candidate/colleges/invitations/{invitation_id}/accept` |
| ✅ | POST | `/candidate/colleges/invitations/{invitation_id}/decline` |
| ✅ | POST | `/candidate/colleges/{college_id}/individual-visibility` |
| ✅ | POST | `/candidate/colleges/{college_id}/revoke` |

## College — onboarding, seats, roster, students (`college`, prefix `/college`)

| Status | Method | Path |
|---|---|---|
| ✅ | GET | `/college/onboarding` |
| ✅ | PUT | `/college/onboarding/answers` |
| ✅ | POST | `/college/onboarding/submit` |
| ✅ | GET | `/college/seats` |
| ✅ | POST | `/college/referral-codes` |
| ✅ | GET | `/college/referral-codes` |
| ✅ | POST | `/college/referral-codes/{code_id}/revoke` |
| ✅ | POST | `/college/roster-imports` |
| ✅ | GET | `/college/roster-imports` |
| ✅ | GET | `/college/roster-imports/{import_id}` |
| ✅ | GET | `/college/roster-imports/{import_id}/rows` |
| ✅ | POST | `/college/roster-imports/{import_id}/commit` |
| ✅ | POST | `/college/roster-imports/{import_id}/discard` |
| ✅ | POST | `/college/roster-imports/{import_id}/invitations/send` |
| ✅ | GET | `/college/students` |
| ✅ | GET | `/college/students/{candidate_id}` |

## College — analytics (`analytics`, prefix `/college/analytics`)

| Status | Method | Path |
|---|---|---|
| ⬜ | GET | `/college/analytics/overview` |
| ⬜ | GET | `/college/analytics/placements` |

## System

| Status | Method | Path |
|---|---|---|
| ⬜ | GET | `/api/v1/health` |
| ⬜ | GET | `/api/v1/health/ready` |

## No HTTP endpoints (internal-only)

- **`admin`** — no platform-staff console exists yet (`docs/blockers.md`).
- **`integrity`** — runs as a background task after scoring; never called directly.
- **`notifications`** — sends SMS/emails triggered by other modules' events.
- **`privacy`** — data-handling logic invoked internally, not a direct route.

---

**Running tally:** 111 ✅ · 0 🟡 · 10 ⬜ (of 121)
