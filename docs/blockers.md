# Blocker register

> ## ✅ Round 7 (2026-09-11) closed ten of these
> **A1** scoring weights (delegated to us — rubric now in `scoring/domain.py`) ·
> **B1/N2** CV text may leave India · **B2/Q12** score never explained ·
> **B3/Q13** full delete, with a financial/audit carve-out flagged ·
> **B5** dishonest-CV rules (delegated to us) · **B6/N5** pay-monthly-see-everyone
> confirmed · **B8/N6** typed referral code approved · **B9/Q10** college seat
> model approved · **D1** TRAI DLT started · **D2** Twilio started ·
> **D5** Apple Developer declared not needed.
>
> **Remaining: A2 (calibration CVs), B4 (employer lists — question returned to
> client), and the content in category C, which we are now producing as
> placeholders.** See `answers-log.md` Round 7 for the verbatim answers.

> ## ✅ 2026-09-12 — the delegated work is delivered
> **B5** dishonest-CV rules **built** (`integrity/domain.py`, 8 rules, 40 tests) ·
> **B4** employer and industry lists **confirmed and built** ·
> **C1–C8 downgraded**: every one now has a placeholder that the build runs
> against, each carrying a flag a test asserts (`PLACEHOLDER_PRICING`,
> `HAS_MEDIA`, `dlt_template_id is None`, `FORM_VERSION`).
>
> **What that changes, and what it does not.** Nothing in category C blocks code
> any more. All of it still blocks launch, because a placeholder is ours and the
> product is the client's. The flags exist so that stays visible: turning one off
> is a decision somebody has to take deliberately.
>
> **C7 (brand) is the honest exception.** A design *system* is delivered —
> colour, type, spacing, accessibility, and one rule about how the score may be
> drawn. A brand identity is not, and should not be faked.

Everything currently blocking BharatPath, in one place. Compiled 2026-09-11 from
`plan.md` §13, `questions.txt`, `resources-needed.md`, and findings from the
build itself.

**Read the categories carefully — they mean different things.** A "launch
blocker" costs nothing today and everything on the day you ship. A "build
blocker" stops work now. Mixing them is how the expensive ones get discovered
late.

| Category | Meaning | Count |
|---|---|---|
| **A** | Stops code being written **now** | 2 |
| **B** | Blocks a specific plan day | 9 |
| **C** | Blocks launch, not code | 11 |
| **D** | Long lead time — outlasts the sprint | 5 |
| **E** | Found during the build | 4 |

---

## A. Stops work now

| # | Blocker | Owner | Blocks | Status |
|---|---|---|---|---|
| **A1** | **Scoring weights and dimension definitions** | Client | **Day 8** — the next high-judgment day | Open. NDA-gated. The arithmetic sent 2026-08-27 does not close to 990 (`questions.txt` Q1). Day 8 ships `v0-placeholder` with invented weights until this lands. |
| ~~**A2**~~ | ~~**Calibration corpus — 50–100 real CVs with expected bands**~~ | Client | ~~Day 8~~ | ✅ **CLOSED 2026-09-12.** Resolved a different way than asked: rather than supplying real CVs, the client reviewed our 35 synthetic profiles with the live engine's scores and accepted all of them (*"the scores are perfect fine"*). The rubric is now agreed rather than merely consistent. **The corpus is still synthetic** — a systematic gap between these profiles and the CVs that actually arrive stays invisible, so re-run this against thirty real CVs once thirty exist. |

> Day 8 can be *built* without these — the engine is `base + bounded
> contributions, clamped` regardless. It cannot be **calibrated**, and a score
> nobody calibrated is a number, not a judgment.

---

## B. Blocks a specific plan day

| # | Blocker | Owner | Blocks | Status |
|---|---|---|---|---|
| **B1** | **N2 — may CV text leave India?** | Client | Day 8 | Open. Bedrock cannot pin inference geography, so this decides which client library Day 8 is built against. Mitigated for now: everything runs in `ap-south-1`. |
| **B2** | **Q12 — written rescission of the score-explanation criterion** | Client | Day 8 | Outstanding. "The score is never explained" contradicts PRD §4.2. Three of four confirmations received; this is the fourth. |
| **B3** | **Q13 — deletion vs. audit retention** | Client's counsel | Day 20 | ◐ **Carve-out confirmed 2026-09-15.** Personal data is fully deleted; financial and audit records (payments, `audit_events`, `candidate_view_events`) are retained as the law requires. **Still owed: the retention period**, which decides when a view-log partition may be detached. |
| **B4** | ~~Employer type and industry lists~~ | Client | Day 9 | ✅ **Closed 2026-09-11.** Confirmed by the client and built as closed vocabularies — 9 types, 19 industries, `employer/reference.py`. Codes are never renamed; retirement is `active=False`. |
| **B5** | ~~Integrity-detection rules~~ | Client → us | Day 9 | ✅ **Closed 2026-09-12.** Delegated to us in Round 7.6 and built: 8 rules in `integrity/domain.py`, 40 tests. Duplicate detection stays dropped (R6). **The reviewable decision is the severity policy**, not the rules — only two rules may reach HIGH, because HIGH hides a candidate from search before a human has looked. |
| **B6** | **N5 — rescission of the unlock criteria** | Client | Day 13 | ⚠️ **Never asked.** The largest reversal in the project: R14 voids a documented flow, a lifecycle, two interface specs and **five acceptance criteria the build is graded against** (SRS §2.25.2 carries three that cannot pass as written). The build is right and the criteria are stale — which is exactly what a written rescission exists to record. |
| ~~**B7**~~ | ~~N4 — written acknowledgement of the bulk-extraction risk~~ | Client | Day 14 | ✅ **Acknowledged 2026-09-15.** The client accepts the residual risk of auto-approved KYB plus whole-database access. The Day 14 caps, burst limit, alerts and no-export rule stay as the mitigation. |
| ~~**B8**~~ | ~~N6 — referral-code consent vs. PRD rule 8~~ | Client | Day 17 | ✅ **Closed 2026-09-11** (Round 7.9, *"do it"*) and **built 2026-09-17**, alongside invite-and-accept: entering a code is ROSTER consent only, the code is named on the consent row. |
| ~~**B9**~~ | ~~Q10 — college seat model~~ | Client | Day 17 | ✅ **Closed 2026-09-11** (Round 7.7, *"yes"*) and **built 2026-09-17**: one payment per period for up to N students; the student past N is linked and not seated. |

---

## C. Blocks launch, not code

Nothing here stops a single line being written. All of it stops shipping.

**C1–C8 and C10 now have placeholders we produced** (Round 7.10, 2026-09-12).
Each row says what exists and what is still owed. The *"still owed"* column is
the one to read: a placeholder removes the build dependency and nothing else.

| # | Blocker | Placeholder built | Still owed by the client |
|---|---|---|---|
| **C1** | **Course content** | Syllabus: 6 modules, 18 lessons, ~2h20, each with a stated outcome (`courses/catalogue.py`) | **The recordings.** Every `asset_key` is `None` and `HAS_MEDIA` is False, so the course cannot be listed or sold. Also still open: what counts as completing it, which is a scoring rule wearing a progress tracker's clothes. |
| **C2** | **N8 — plans, prices, catalogue** | Full price list, 11 plans + 2 one-off products (`subscriptions/catalogue.py`) | **Real prices.** Ours are benchmarked against the Indian market, not against a margin — the per-candidate cost figure that would set one does not exist (`scoring-approach.md` §12). `PLACEHOLDER_PRICING` is the flag to flip. |
| **C3** | **Questionnaire bank** | 12 questions, 4 sections, all skippable (`questionnaire/bank.py`) | Review. **Note what we excluded and why**: marital status, gender, religion, caste, photograph. Re-adding any of them is a client decision with counsel, not a field somebody adds. |
| **C4** | **Interview bank + rubric** | 3 sets × 6 questions, 5-dimension rubric with anchors (`interview/bank.py`) | Review. Accent, fluency, pace and pitch are deliberately not assessed. |
| **C5** | **N9 — locale strings** | 8 locales × 32 core strings (`app/core/i18n/`) | **A native-speaker pass on all seven non-English bundles**, and the rest of the string set. Ours are good enough to build and demo on; shipping unchecked machine-quality translation to this audience is the thing that makes a product look untrustworthy. |
| **C6** | **Notification templates** | 21 drafted, 17 SMS (`notifications/templates.py`) | **DLT registration** (D1, 2–4 weeks). Every `dlt_template_id` is `None` and sending is gated on it — an unregistered body is dropped silently by the operator. The drafts exist so registration can start now. |
| **C7** | **Brand identity and design** | Design *system* only: colour, type, spacing, states, accessibility, and one rule on drawing the score (`docs/design-system.md`) | **A designer.** Logo, wordmark, illustration and photographic direction, iconography, the score screen. Deliberately not faked — a competent-looking placeholder logo gets shipped and then defended. |
| **C8** | **Onboarding form fields** | KYB 27 fields, college 20 (`kyb/forms.py`, `college/forms.py`) | Review, plus the Indian states reference list the `state` fields point at. |
| **C9** | **Production API contracts and data schemas** | — | Reconciliation. NDA-gated (PRD §10). |
| **C10** | **Eligibility message copy** | `eligibility.below_threshold` in all 8 locales, with a test asserting it contains no digits | Sign-off on the wording. It says the requirement is not met and nothing else — the score is never explained. |
| ~~**C11**~~ | ~~R18 duplicate-detection confirmation~~ | — | ✅ **Confirmed dropped 2026-09-15.** No duplicate-CV detection. |
| ~~**C13**~~ | ~~Application expiry period~~ | 30 days of employer silence | ✅ **Accepted 2026-09-15** as the client's number. `config_values` `applications.expiry` still changes it without a deploy. |
| ~~**C12**~~ | ~~**Do seats replace a student's own subscription?**~~ | 2026-09-12 | ✅ **CLOSED — "Student does not pay if the college has paid for it."** The seat covers them entirely. College prices rebuilt on that basis (~2.7x; per-seat yield 13% → 37–47% of direct, ex-tax) and a floor test added so it cannot drift back. Entitlement for Day 15/17 is settled: **personal subscription OR active seat**. See `answers-log.md` Round 8 — which also lists three follow-on questions this opens (a student who already paid, non-renewal, and whether a seat covers the paid add-ons). |

---

## D. Long lead time — outlasts the sprint

**These are the ones that hurt.** Each is longer than the work it blocks, so
starting late cannot be recovered by working faster.

| # | Item | Lead time | Owner | Status |
|---|---|---|---|---|
| **D1** | **TRAI DLT registration** | **2–4 weeks** | Client | ✅ **Started 2026-09-11.** Binds the sender, not the gateway — neither Cognito nor Twilio removes it. Without it, SMS to Indian numbers silently fails. |
| **D2** | **Twilio account + Verify service** | Days | Client | ❌ Not started. **Blocks the three Cognito custom-auth Lambda triggers, and therefore phone OTP entirely.** Test credentials alone unblock development. |
| **D3** | **Payment gateway KYC** | 1–2 weeks | Client | ❌ Not started. Blocks all revenue. **Must be confirmed to support recurring billing** (UPI e-mandate, R17). Day 15 built both renewal paths behind `PaymentProvider` with a stub; the real gateway is one adapter, plus its callback format in `billing.domain.parse_callback`. |
| **D4** | **Legal review of the scoring model** | Weeks | Client's counsel | ❌ Not started — confirmed by the client 2026-09-15. Selling an item that raises a three-digit consumer score is a different proposition from giving that score away free. |
| **D5** | **Apple Developer (organisation)** | 1–3 weeks | Client | ❌ Not started. Needs a D-U-N-S number, which is its own separate application. |

Also pending, shorter: **SES production access** (3–7 days, AWS reviews manually
and rejects vague requests) and **Google OAuth client** (hours — blocks Google
federation on the candidate pool).

---

## E. Found during the build

Technical, ours to fix, recorded so they are not rediscovered.

| # | Item | Blocks | Status |
|---|---|---|---|
| **E1** | **No malware scanning** | LAUNCH | `app/modules/resume/scanner.py` is a seam with nothing behind it. It records `PENDING`, never `CLEAN` — recording CLEAN from something that scans nothing would be a lie told to whoever later decides a file is safe to parse. **GuardDuty Malware Protection for S3** is the intended implementation. |
| **E2** | **AWS service activation (Textract, GuardDuty, Bedrock)** | OCR for scanned CVs, malware scanning, scoring | **Still blocked on 2026-09-13, checked live.** Textract and GuardDuty return `SubscriptionRequiredException`, in two regions. Bedrock no longer says the account is being verified, but every model, Amazon Nova included, returns `Operation not allowed`. Claude additionally shows `NOT_AUTHORIZED`, and the Anthropic use-case form is unsubmitted. The Health dashboard does not show per-account activation. **Action: AWS support case (Account and billing → Service activation), plus the use-case form for the chosen model.** Verify with `backend/scripts/verify_ocr_fallback.py`. |
| ~~**E3**~~ | ~~Legacy `.doc` (OLE2) files~~ | — | ✅ **Closed 2026-09-15 — no longer accepted.** Refused at upload as `upload_legacy_doc_unsupported` so the app can say "save as PDF or .docx"; the parser keeps its refusal for any file accepted earlier. |
| **E4** | **Deployment infrastructure** | Day 20 | RDS, ElastiCache, VPC/NAT, ECS/ALB, ECR, CloudFront, ACM, Route 53 — none provisioned, deliberately. They bill while idle and are not needed until deploy. See `infra/README.md`. |
| **E5** | **Hidden text is not extracted** | The best integrity rule we have | `ResumeClaims.hidden_text` defaults to empty, so `HIDDEN_TEXT` and half of `INJECTED_INSTRUCTIONS` are **written and inert**. Populating it means a `pypdf` visitor reading font colour, size and position — white-on-white, zero-size, off-page. Until then the most widely documented CV-gaming technique goes undetected, and the rule looks like coverage without being it. |
| ~~**E6**~~ | ~~**Manual-form resumes are never scored**~~ | — | ✅ **Fixed in code 2026-09-13.** A structured version is rendered to text, without the name or the graduation year, and goes through Layer 1 like an upload. Scoring the form directly was rejected: it would give zero for the three judgments only the model makes. Scores still wait on E2 and a model choice. |
| **E7** | **Business sign-up is admin-only; R15 says employers sign up** | Employer onboarding at launch | The business Cognito pool has `allow_admin_create_user_only = true`, set so an employer could not bypass KYB. R15 later made KYB auto-approve and payment the gate. The API already supports self-serve through `current_business_identity`; opening it is one Terraform flag and a client decision. |
| **E8** | **One address cannot be both a candidate and employer staff** | Recruiters who are also job-hunting | `users.email` is unique across both pools, so a recruiter who is also a candidate needs two addresses. Deliberate for now: merging identities across pools with different assurance (the business pool requires MFA) is a design of its own. |
| **E9** | **Adding a team member still reveals that an address exists** | Privacy | Candidate and other-employer addresses get one identical refusal, so *which* is never revealed. That a refusal differs from success still is. Closing it needs accept-by-link invitations. |
| ~~**E11**~~ | ~~Interview links go to candidates from any https host~~ | — | ✅ **Decided 2026-09-15: do not limit.** Any https meeting link stays allowed; the Day 12 checks (https, a real host, no credentials, no `javascript:`) remain. |
| **E12** | **A disputed hire has no reviewer** | Hire disputes | A dispute is recorded and the hire stays unconfirmed; it closes if the candidate confirms, the employer rejects, or the candidate withdraws. Nobody adjudicates, for the same reason as E10. Placement analytics count only confirmed hires, so an unresolved dispute counts as no hire. |
| **E10** | **No platform-staff account can exist** | KYB review and integrity review routes | `memberships.tenant_id` is NOT NULL and `tenants.type` allows only EMPLOYER or COLLEGE, so `PLATFORM_ADMIN`, `KYB_REVIEWER`, `INTEGRITY_REVIEWER` and `SUPPORT_AGENT` cannot be held by anyone. Review actions for both are built and tested in their services, with no routes. **Recommendation: a single PLATFORM tenant for our own staff** — one tenant type, no RLS change for the non-tenant-scoped tables reviewers read. Needs a decision. |
| ~~**E13**~~ | ~~A revealed profile has no name unless the candidate used the form~~ | — | ✅ **Built 2026-09-15.** The client chose to ask the name at sign-up: `PUT /candidate/profile/name` stores `candidate_profiles.full_name` (letters, spaces, `. ' -`, any script). The reveal shows it, falling back to the structured form's name; a masked card never can. **The app's sign-up screen must ask for it** — the API does not refuse other actions without one. |
| **E15** | **Verified payment callbacks are stored and not processed in a running API** | Every sale, and course re-scores | Day 15 settles a payment in a task triggered through the outbox, and the outbox relay has no broker until Day 19 (`app/tasks/outbox_relay.py`). Until then a genuine callback is verified, stored and acknowledged, and nobody gets what they paid for; a completion likewise never re-scores. Tests call the task's service; the app teams can use `POST /billing/dev/payments/{id}/simulate` with the stub. **Must land before any real gateway is switched on.** |
| **E16** | **Plans above ₹15,000 cannot renew automatically** | R17 for employers and colleges | A UPI mandate may debit without per-debit approval only up to RBI's limit, so registration refuses a plan priced above `mandate_max_amount_minor` (config, ₹15,000). That excludes employer annual (₹47,999) and every college plan. Our reading of the rule; **confirm with the chosen gateway** (D3), which may offer card or net-banking e-mandates with other limits. |
| **E17** | **Resume upload and confirmation are open to non-payers** | Model spend, and R13's reading | The score is paywalled; parsing a CV is not, by decision, because uploading before paying is where a candidate is converted. But confirming triggers a Layer 1 model call, so every non-paying sign-up can cost a model call. **Needs a client decision**: keep it (acquisition cost), or put confirmation behind the subscription. |
| **E18** | **No refund flow** | Customer support, disputes | REFUNDED exists as a payment status and nothing writes it. Cancellation stops renewal at period end with no refund. The refund policy (pro rata, none, within N days) is the client's to set. |
| **E14** | **View-anomaly alerts are written, and nobody can read them** | The abuse controls' human half | Day 14 records each velocity or cap crossing as a `candidate_view_anomaly_flagged` audit row and an outbox event. The admin console that reads them needs a platform-staff account, which cannot exist (**E10**). Until then the caps block and the alerts only accumulate. Notifications (Day 19) are the other consumer. |
| **E19** | **An interview session earns +20 on completion, before anyone has heard it** | Interview points at launch | Day 16 follows the plan: six answers stored is a completed session and +20. The server checks each answer is real audio of 1 KB+ and 1–125 s, and nothing more, so six seconds of silence earns the same as six real answers. Transcription and evaluation (Day 17) could hold the points until a transcript shows speech, but that moves the score hours later and makes a failed transcription a lost +20. **Client decision: points on completion (today) or on evaluation.** **Day 17 makes it visible**: a session with no speech in any answer is evaluated FAILED `no_speech`, and still keeps its +20. |
| **E20** | **An interrupted session can only be resumed, never abandoned** | Support | A session stays open until completed; starting again returns it, which is the recovery path. There is no route or sweep to abandon one, so a candidate who wants to give up cannot free the purchase, and nothing ever moves a session to ABANDONED. Needs a policy first: does abandoning refund the purchase, return it, or spend it? |
| **E21** | **Questionnaire answers reach no employer yet** | The questionnaire's value | Day 16 stores, validates and reports them to the candidate. Employer search does not filter on them and a masked card does not show them; `ACCESSIBILITY_ADJUSTMENTS` is meant to reach only an employer the candidate applied to, and that sharing is not built. Deliberately **no badge**: a badge means an add-on folded into the score (`discovery/domain.py`). Filters are a discovery change (search document and trigger). |
| **E23** | **Seat allocation has no route** | Every college's seats, in a running API | `college.service.allocate_seats` is built, capped by the live plan and audited, and is callable only as PLATFORM_ADMIN or SYSTEM — which no account can be (**E10**). Until Day 19's console, no college has seats outside tests, so every linked student is linked and not seated. |
| **E24** | **No speech model or evaluator is chosen** | Interview feedback | Day 17 built the interfaces, the contract a real implementation must satisfy (`interview/evaluation.py`), the storage and the report. The default provider raises, so every session stays COMPLETED with its report PENDING. Needs: a model choice, a prompt that excludes accent, fluency and pace, and a test on recordings in each supported language. Transcripts are the candidate's words and inherit **E22**'s retention question. |
| **E25** | **What a student loses when their college stops paying** | Round 8 follow-ons | Built as a hard cutoff: the next request after the college's period ends is refused, seat and link kept. No grace period, no notice (Round 8 question 2). A student with their own subscription keeps it alongside a seat (question 1). A seat covers the subscription gate only; courses and interviews are still bought (question 3). All three need the client's answer before the first college contract. |
| **E22** | **No retention period for interview audio** | DPDP, S3 cost | Recordings of a candidate's voice are kept indefinitely in `bharatpath-interview-audio`, with no lifecycle rule. Rejected uploads are deleted at once; accepted ones are needed for Day 17's transcription and for disputes. **Counsel and client: how long after evaluation?** Then one lifecycle rule in `infra/terraform/s3.tf`. |
| **E26** | **Cohort filters have nothing to filter on** | SRS 2.10.4 filters (cohort, course, branch, graduation year) | Day 18 analytics describe the whole linked cohort. No table holds a student's course, branch or year: the roster reads contact and a name only, deliberately, and a referral code carries no label. **Two questions first**: who declares the dimension (the college on a roster column or a code, or the student), and what floor applies per filtered cohort -- every filter is a new way to subtract one student from another, so each filtered cohort gets the same floor and suppression, and a college with small branches will see mostly `null`. |
| **E27** | **What a college sees of a consenting student, and the words for it, are ours** | Counsel, client | `GET /college/students/{id}` returns a name, the display score and band, application and interview counts, and platform hires with the employer's name -- our choice, fixed by an invariant test and named in `INDIVIDUAL_CONSENT_TEXT`, which is a placeholder like the roster text. The analytics floors (10 students, 5 per cell, median to 10) are ours too. **Counsel: the INDIVIDUAL words. Client: the field list and the floors.** Widening the view means new words and a new version. |
| **E28** | **A dashboard read before and after one named student links can show their band** | DPDP, college trust | A college knows from its own roster who accepted an invitation. Reading the overview before and after that student links (or revokes) shows which band moved, unless the cell is suppressed. Cell suppression narrows this; only delaying additions (e.g. a daily snapshot, with revocations still immediate) or adding noise removes it. **Built as floors and suppression only**, and the college-facing revocation message (Day 19) must not name the student. Counsel to accept the residual, or the client to pay for a snapshot. |

---

## What is *not* blocked

Worth stating, because it is most of the build:

- Days 7, 9–14, 16–20 can all be built against placeholder content and seeded
  config. Only **Days 8 and 15** have hard content dependencies.
- `openapi.json` publishes on every green build, so the **mobile and three web
  teams are not blocked** — they generate clients against real endpoints today.
- Email/password authentication works on both Cognito pools **now**. Only phone
  OTP waits on D2.

---

## The three to move this week

1. **D2 — Twilio.** Days, not weeks, and it unblocks phone OTP plus the three
   Lambda triggers. The cheapest large unblock available.
2. **B6 and B8 — the two rescissions never asked for.** Both are one sentence
   from the client and both are gaps in our own process, not theirs.
3. **A2 — book the calibration session.** One working session, and Day 8 is
   flagged as uncompressible in the plan.

**Two more that are now cheap, because the work either side of them is done:**

4. **Take the SMS drafts to the DLT portal.** 17 bodies are written
   (`sms_templates()`). Registration is 2–4 weeks and it has not started on the
   template side, only the entity side. Nothing else about it gets faster later.
5. ~~**C12 — does a college seat cover the student's own subscription?**~~
   ✅ **Answered 2026-09-12: it does.** The one open item that changed a
   revenue number rather than a date, and it changed it by 2.7x. Three
   follow-on questions replace it, none blocking the build — see
   `answers-log.md` Round 8.
