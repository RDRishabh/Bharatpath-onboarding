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
| **A2** | **Calibration corpus — 50–100 real CVs with expected bands** | Client | **Day 8**, and the golden-corpus CI gate | Open. Without it the weights are invented rather than calibrated, and the replay gate has nothing to gate against. Realistically one working session with whoever owns product judgment. |

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
| **B4** | **Employer type and industry lists** | Client | Day 9 | ⏳ Deferred by client. Config-seeded enums, so no rework if they arrive within two weeks. |
| **B5** | **Integrity-detection rules** | Client | Day 9 | Open. One illustrative rule remains; duplicate detection was dropped (R6). |
| **B6** | **N5 — rescission of the unlock criteria** | Client | Day 13 | ⚠️ **Never asked.** The largest reversal in the project: R14 voids a documented flow, a lifecycle, two interface specs and **five acceptance criteria the build is graded against** (SRS §2.25.2 carries three that cannot pass as written). The build is right and the criteria are stale — which is exactly what a written rescission exists to record. |
| **B7** | **N4 — written acknowledgement of the bulk-extraction risk** | Client | Day 14 | Open. Auto-approved KYB + whole-database access + one monthly payment means anyone who can pay obtains every candidate's contact details, unverified. We are building mitigations; the residual risk needs acknowledging because the real fix is verification and the client turned it off. |
| **B8** | **N6 — referral-code consent vs. PRD rule 8** | Client | Day 17 | ⚠️ **Never asked.** PRD §3 rule 8 names the mechanism: *"invite-and-accept."* A typed referral code is arguably better consent, but it is not that mechanism, and a DPDP review will ask. One sentence closes it. |
| **B9** | **Q10 — college seat model** | Client | Day 17 | ◐ Half answered. The client asked *us* to recommend; our recommendation is one payment per period covering up to N students, mirroring the employer model. **Needs a yes.** |

---

## C. Blocks launch, not code

Nothing here stops a single line being written. All of it stops shipping.

| # | Blocker | Owner | Needed by |
|---|---|---|---|
| **C1** | **Course content — videos, materials, structure** | Client | Day 15 to seed, LAUNCH to matter |
| **C2** | **N8 — subscription plans, prices, course catalogue** | Client | Day 15 |
| **C3** | **Questionnaire question bank** | Client | Day 16 |
| **C4** | **Interview question bank + evaluation rubric** | Client | Day 16–17 |
| **C5** | **N9 — locale strings, 6–8 languages, and who funds translation** | Client | Day 19 plumbing, LAUNCH content |
| **C6** | **Notification templates** — every SMS body also needs a DLT template | Client | Day 19 |
| **C7** | **Brand identity, design system, Figma files** | Client | LAUNCH — or an explicit agreement that design is a separate line item |
| **C8** | **Onboarding form fields** (employer, KYB, college) | Client | Day 9 onward, soft |
| **C9** | **Production API contracts and data schemas** | Client | Reconciliation. NDA-gated (PRD §10). |
| **C10** | **Eligibility message copy** — *"your score does not meet this employer's requirement"*, no reasoning | Client | Day 11, in 6–8 languages |
| **C11** | **R18 duplicate-detection confirmation** | Client | Provisional until it lands |

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
