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
| **B3** | **Q13 — deletion vs. audit retention** | Client's counsel | Day 20 — **ask by Day 8** | Open. PRD §8 requires deletion, PRD §3.9 requires immutable audit, financial records carry statutory retention. Has a legal review cycle attached, which is why it must be asked early. |
| **B4** | ~~Employer type and industry lists~~ | Client | Day 9 | ✅ **Closed 2026-09-11.** Confirmed by the client and built as closed vocabularies — 9 types, 19 industries, `employer/reference.py`. Codes are never renamed; retirement is `active=False`. |
| **B5** | ~~Integrity-detection rules~~ | Client → us | Day 9 | ✅ **Closed 2026-09-12.** Delegated to us in Round 7.6 and built: 8 rules in `integrity/domain.py`, 40 tests. Duplicate detection stays dropped (R6). **The reviewable decision is the severity policy**, not the rules — only two rules may reach HIGH, because HIGH hides a candidate from search before a human has looked. |
| **B6** | **N5 — rescission of the unlock criteria** | Client | Day 13 | ⚠️ **Never asked.** The largest reversal in the project: R14 voids a documented flow, a lifecycle, two interface specs and **five acceptance criteria the build is graded against** (SRS §2.25.2 carries three that cannot pass as written). The build is right and the criteria are stale — which is exactly what a written rescission exists to record. |
| **B7** | **N4 — written acknowledgement of the bulk-extraction risk** | Client | Day 14 | Open. Auto-approved KYB + whole-database access + one monthly payment means anyone who can pay obtains every candidate's contact details, unverified. We are building mitigations; the residual risk needs acknowledging because the real fix is verification and the client turned it off. |
| **B8** | **N6 — referral-code consent vs. PRD rule 8** | Client | Day 17 | ⚠️ **Never asked.** PRD §3 rule 8 names the mechanism: *"invite-and-accept."* A typed referral code is arguably better consent, but it is not that mechanism, and a DPDP review will ask. One sentence closes it. |
| **B9** | **Q10 — college seat model** | Client | Day 17 | ◐ Half answered. The client asked *us* to recommend; our recommendation is one payment per period covering up to N students, mirroring the employer model. **Needs a yes.** |

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
| **C11** | **R18 duplicate-detection confirmation** | — | Provisional until it lands. |
| ~~**C12**~~ | ~~**Do seats replace a student's own subscription?**~~ | 2026-09-12 | ✅ **CLOSED — "Student does not pay if the college has paid for it."** The seat covers them entirely. College prices rebuilt on that basis (~2.7x; per-seat yield 13% → 37–47% of direct, ex-tax) and a floor test added so it cannot drift back. Entitlement for Day 15/17 is settled: **personal subscription OR active seat**. See `answers-log.md` Round 8 — which also lists three follow-on questions this opens (a student who already paid, non-renewal, and whether a seat covers the paid add-ons). |

---

## D. Long lead time — outlasts the sprint

**These are the ones that hurt.** Each is longer than the work it blocks, so
starting late cannot be recovered by working faster.

| # | Item | Lead time | Owner | Status |
|---|---|---|---|---|
| **D1** | **TRAI DLT registration** | **2–4 weeks** | Client | ✅ **Started 2026-09-11.** Binds the sender, not the gateway — neither Cognito nor Twilio removes it. Without it, SMS to Indian numbers silently fails. |
| **D2** | **Twilio account + Verify service** | Days | Client | ❌ Not started. **Blocks the three Cognito custom-auth Lambda triggers, and therefore phone OTP entirely.** Test credentials alone unblock development. |
| **D3** | **Payment gateway KYC** | 1–2 weeks | Client | ❌ Not started. Blocks all revenue. **Must be confirmed to support recurring billing** (UPI e-mandate, R17). |
| **D4** | **Legal review of the scoring model** | Weeks | Client's counsel | ❌ Not started. Selling an item that raises a three-digit consumer score is a different proposition from giving that score away free. Any sign-off obtained before 2026-08-27 no longer covers it. |
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
| **E2** | **Textract account activation** | OCR for scanned CVs | `SubscriptionRequiredException` on the new AWS account, including under `AdministratorAccess` — so it is account activation, not IAM. Usually clears within hours. Verify with `backend/scripts/verify_ocr_fallback.py`. |
| **E3** | **Legacy `.doc` (OLE2) files** | LAUNCH | Accepted at upload, refused at parse — no maintained pure-Python reader exists. Textract covers it once E2 clears. Otherwise: drop `application/msword` from accepted types. |
| **E4** | **Deployment infrastructure** | Day 20 | RDS, ElastiCache, VPC/NAT, ECS/ALB, ECR, CloudFront, ACM, Route 53 — none provisioned, deliberately. They bill while idle and are not needed until deploy. See `infra/README.md`. |
| **E5** | **Hidden text is not extracted** | The best integrity rule we have | `ResumeClaims.hidden_text` defaults to empty, so `HIDDEN_TEXT` and half of `INJECTED_INSTRUCTIONS` are **written and inert**. Populating it means a `pypdf` visitor reading font colour, size and position — white-on-white, zero-size, off-page. Until then the most widely documented CV-gaming technique goes undetected, and the rule looks like coverage without being it. |

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
