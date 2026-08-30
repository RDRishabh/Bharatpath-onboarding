# BharatPath — Resources Needed

> **Version 3** · 2026-08-30 · Companion to `plan.md` v6.1, `questions.txt` and `scoring-approach.md`.
>
> **v3 is a correctness pass, not new scope.** v2 carried a v4-era body under a v6 header. Fixed:
> §4 described Bedrock as "parsing only" and the judged band as "possibly" AI (both settled on
> 27 Aug) and told you to pin **`temperature 0`**, which `scoring-approach.md` §2 says is now
> *rejected* by the model API — two of our own documents gave opposite instructions; §8 still
> asked the client for improvement-suggestion copy that R11 deleted; §9's decision table showed
> nine answered questions as blocking; and §12's checklist listed the same. **N5–N9 are new asks**
> that had been sitting in this file, or in nobody's file, without ever reaching the client —
> most importantly **N7, course content.**
>
> Everything the build depends on that the build cannot produce itself: AWS services, third-party
> accounts, credentials, regulatory registrations, content, and decisions. One row per thing, with
> **who owns it**, **when it is needed**, and **what happens if it is late**.
>
> **Read the two tables in [§1](#1-start-these-today) first.** Everything else can be worked
> around for a while; those cannot.

---

## Contents

1. [Start these today](#1-start-these-today)
2. [Ownership and how to read this](#2-ownership-and-how-to-read-this)
3. [AWS account and organisation](#3-aws-account-and-organisation)
4. [AWS services — the full list](#4-aws-services--the-full-list)
5. [Third-party vendors and accounts](#5-third-party-vendors-and-accounts)
6. [Regulatory and legal](#6-regulatory-and-legal)
7. [Business identity documents](#7-business-identity-documents)
8. [Content the client must supply](#8-content-the-client-must-supply)
9. [Decisions owed](#9-decisions-owed)
10. [How to hand over credentials](#10-how-to-hand-over-credentials)
11. [Cost](#11-cost)
12. [Master checklist](#12-master-checklist)

---

## 1. Start these today

### Longest lead times — these outlast the sprint

| Resource | Lead time | Owner | Why it cannot wait |
|---|---|---|---|
| **TRAI DLT registration** | **2–4 weeks** | Client | Longer than the entire build. Without it, SMS to Indian numbers silently fails. Twilio does **not** remove this — DLT binds the sender, not the gateway. |
| **Apple Developer (organisation)** | 1–3 weeks | Client | Needs a D-U-N-S number, which is itself a separate application. |
| **Payment gateway KYC** | 1–2 weeks | Client | Blocks all revenue. **Must be confirmed to support recurring billing** — see [§5](#5-third-party-vendors-and-accounts). |
| **SES production access** | 3–7 days, can bounce | Infra | AWS reviews the request manually and rejects vague ones. Apply early and describe real use. |
| **Legal review of the score** | Weeks | Client's counsel | See [§6](#6-regulatory-and-legal). The product changed on 27 August; any earlier sign-off no longer covers it. |
| **Course content** | Unknown — **nobody has scoped this** | Client | New in v4. See [§8](#8-content-the-client-must-supply). This may be the largest unlisted dependency in the project. |

### Blocking Day 1 — the build cannot start without these

| Resource | Owner | Needed by |
|---|---|---|
| AWS account, with an IAM role for the build team | Client + Infra | Day 1 |
| Postgres endpoint + two DB roles | Infra | Day 2 |
| Redis endpoint | Infra | Day 1 |
| S3 buckets (six — see [§4](#4-aws-services--the-full-list)) | Infra | Day 2 |
| SQS queues + IAM for the workers | Infra | Day 1 |
| Secrets Manager paths and a read policy | Infra | Day 1 |
| **Cognito: two user pools + app clients** | Infra | Day 3 |
| **Cognito custom-auth Lambda triggers** (three) | Infra | Day 3 |
| **Twilio test credentials** | Client | Day 3 |
| Google IdP configured on the candidate pool | Infra | Day 3 |
| CI/CD pipeline and image registry | Infra | Day 1 |

> **A twenty-day sprint has no slack.** Each of these arriving a day late costs a day of the
> build, and the days do not come back.

---

## 2. Ownership and how to read this

| Tag | Who |
|---|---|
| **CLIENT** | Only the client can obtain it — it needs their business identity, their money, or their decision. |
| **INFRA** | Whoever provisions and owns the AWS environment. Per `plan.md` §12 this is not the application build team. |
| **BUILD** | Us. Listed only where we depend on something being agreed, not supplied. |

**Blocking levels:**

- **HARD** — work stops.
- **SOFT** — we build against a stub and swap later. A stub that never gets replaced is a launch
  blocker in disguise, so every soft item still needs a swap-in date.
- **LAUNCH** — does not block the build at all, but the product cannot go live without it.

---

## 3. AWS account and organisation

| Item | Owner | Notes |
|---|---|---|
| **AWS account owned and billed by the client** | CLIENT | **Non-negotiable.** Client infrastructure must never run on a contractor's card. It creates a hostage situation on both sides and makes handover messy. |
| Three accounts under an AWS Organization: `dev`, `staging`, `prod` | INFRA | Separate accounts, not separate VPCs. Blast-radius isolation is the point. |
| IAM role for the build team, cross-account assume | CLIENT → INFRA | Least privilege. We do not need or want root, or long-lived access keys. |
| **Region: `ap-south-1` (Mumbai)** | INFRA | Data residency under the DPDP Act 2023, plus latency. **Everything stays in-region unless the client agrees otherwise in writing.** See the Bedrock caveat in [§4](#4-aws-services--the-full-list) — it is the one place this rule is at risk. |
| Budget alarms and cost anomaly detection | INFRA | Set on day one. Textract, Transcribe and Bedrock are consumption-priced and scale directly with sign-ups. |
| CloudTrail on, in all regions, logging to a locked bucket | INFRA | Also a compliance artefact, not just an ops one. |

---

## 4. AWS services — the full list

### Compute and delivery

| Service | What for | Owner | Needed | Notes |
|---|---|---|---|---|
| **ECS Fargate + ALB** | The API | INFRA | Day 1 | Chosen over Lambda: no cold starts on the scoring path, simpler local dev. |
| **ECS Fargate (worker service)** | Celery workers | INFRA | Day 1 | Same image as the API, different command — so worker and API can never drift on model definitions. |
| **ECR** | Image registry | INFRA | Day 1 | |
| **CloudFront** | Three web consoles, static | INFRA | LAUNCH | |
| **CloudFront (second distribution)** | **Course video delivery** | INFRA | Day 15 | **New in v4.** Courses imply video. Signed URLs or signed cookies so paid content is not freely shareable. |
| **ACM certificates** | TLS | INFRA | LAUNCH | Must be issued in `us-east-1` for CloudFront, `ap-south-1` for the ALB. Easy to get wrong. |
| **Route 53** | DNS | CLIENT + INFRA | LAUNCH | |

### Data

| Service | What for | Owner | Needed | Notes |
|---|---|---|---|---|
| **RDS PostgreSQL, Multi-AZ** | Primary database | INFRA | Day 2 | **Two roles required:** an application role *without* `BYPASSRLS` and not the table owner, plus a separate admin-bypass role. Row-Level Security is the second line of tenant isolation and it does not work if the app connects as owner. |
| **ElastiCache Redis** | Membership cache, OTP throttles, idempotency, locks | INFRA | Day 1 | |
| **S3 — six buckets** | See below | INFRA | Day 2 | All private, SSE-KMS, no public access at any level, ever. |
| **S3 Object Lock (compliance mode)** | Audit archive only | INFRA | Day 2 | Tamper-evidence for the audit trail. Note: **do not use QLDB** — AWS deprecated it. |

**The six buckets**, each with its own lifecycle policy:

1. `resumes` — candidate CV files
2. `kyb-documents` — employer registration and tax documents
3. `interview-audio` — mock interview recordings
4. `exports` — data-export archives for DSR requests, short retention
5. `audit-archive` — Object Lock, compliance mode, long retention
6. **`course-media`** — *new in v4*, course video and materials, served via CloudFront

### Async and scheduling

| Service | What for | Owner | Needed | Notes |
|---|---|---|---|---|
| **SQS** | Celery broker | INFRA | Day 1 | Plus dead-letter queues. |
| **EventBridge Scheduler** | Application expiry, DSR sweeps, **subscription renewals**, **incomplete-profile nudges** | INFRA | Day 12 | SQS has no native ETA/countdown, so periodic work hits a trigger endpoint rather than using Celery Beat. Two of these four jobs are new in v4. |
| **Step Functions** | Interview evaluation pipeline | INFRA | Day 17 | Optional at MVP; the pipeline is short enough to live in Celery if this slips. |

### Identity

| Service | What for | Owner | Needed | Notes |
|---|---|---|---|---|
| **Cognito — candidate pool** | Phone OTP, Google, email | INFRA | Day 3 | Custom auth flow. |
| **Cognito — business/admin pool** | Password + TOTP MFA | INFRA | Day 3 | Software-token MFA, native. We store no password hashes and no TOTP secrets. |
| **Three Lambda triggers** — `DefineAuthChallenge`, `CreateAuthChallenge`, `VerifyAuthChallenge` | Candidate phone OTP via Twilio Verify | INFRA | Day 3 | **This is the sprint's most likely cross-team stall.** These are infrastructure, not application code, and they hold the Twilio credentials. Confirm on Day 1 who deploys them. |
| **Google IdP on the candidate pool** | Google Sign-In | INFRA | Day 3 | Needs the OAuth client IDs from [§5](#5-third-party-vendors-and-accounts). |

### AI and document processing

| Service | What for | Owner | Needed | Notes |
|---|---|---|---|---|
| **Textract** | CV text extraction from scanned PDFs | INFRA | Day 6 | Native-PDF-only extraction via Tika/pdfplumber is far cheaper — use Textract as the fallback path, not the default. |
| **Bedrock** | Turning extracted text into structured fields | INFRA | Day 6 | Parsing only in the original design. **Settled in v5/v6:** the same extraction call now also produces the schema-validated facts and bounded ordinal ratings the rubric scores from (`scoring-approach.md` §4). One call, two uses — it is no longer "parsing only". |
| **Bedrock — model access request** | Both uses above | INFRA | Day 6 | Model access is **request-gated per account and per model**, and it is not instant. Raise it in week one, not on Day 6. |
| **Bedrock — region check** | — | INFRA | **Day 1 — verify** | ⚠️ **Verify which models are actually available in `ap-south-1` before designing around them.** If the model you need requires cross-region inference, candidate CV text leaves the region, and that collides directly with the DPDP residency position in [§3](#3-aws-account-and-organisation). This is a decision for the client's counsel, not for us to make quietly. |
| **Bedrock — scoring extraction** | The 200-point judged band | INFRA | Day 8 | **No longer conditional — Q2 was answered on 27 Aug and the design is in `scoring-approach.md`.** Reproducibility-critical: **pinned `model_id`**, `prompt_version` and `prompt_hash`, and `raw_model_response` stored verbatim on every score row. ⚠️ **Do not specify `temperature`** — it has been removed from current Claude models and a request setting it is **rejected**. Determinism comes from the content-addressed extraction cache plus stored responses, never from sampling parameters (`scoring-approach.md` §2, §6). Structured outputs (`messages.parse()`) and prompt caching are both supported on Bedrock; the **Message Batches API is not** — relevant only if a mass re-score is ever authorised. Quota (tokens per minute) matters and must be raised. |
| **Transcribe** | Mock interview speech-to-text | INFRA | Day 17 | Needs Indian English and Hindi. Verify both are supported for the audio format we settled on (Opus/AAC mono 16 kHz). |

### Messaging

| Service | What for | Owner | Needed | Notes |
|---|---|---|---|---|
| **SES** | Transactional email | INFRA | Day 19 | Needs **domain verification** (DKIM/SPF/DMARC) **and a production-access request** to leave the sandbox. The request is manually reviewed and gets rejected for vague answers. Start it early. |
| **SNS / Pinpoint, or FCM + APNs direct** | Push notifications | INFRA | Day 19 | FCM and APNs directly is simpler if there are only two apps. Needs the developer accounts from [§5](#5-third-party-vendors-and-accounts). |
| **SMS** | — | — | — | **Not AWS.** SNS is not used for Indian SMS. See Twilio in [§5](#5-third-party-vendors-and-accounts). |

### Security and operations

| Service | What for | Owner | Needed |
|---|---|---|---|
| **Secrets Manager** | All credentials, read once at boot | INFRA | Day 1 |
| **KMS** | Bucket encryption, DB encryption, secret encryption | INFRA | Day 2 |
| **WAF on the ALB** | Rate limiting, common exploit rules | INFRA | LAUNCH |
| **GuardDuty** | Threat detection | INFRA | LAUNCH |
| **CloudTrail** | API audit | INFRA | Day 1 |
| **CloudWatch** | Logs, metrics, alarms | INFRA | Day 1 |
| **X-Ray** or an OTel collector endpoint | Traces | INFRA | Day 1 |
| **Sentry** (not AWS) | Error tracking | INFRA | Day 1 |

### Infrastructure as code

| Item | Owner | Notes |
|---|---|---|
| **Terraform or AWS CDK** | INFRA | **Insist on this.** It is how the engagement hands over cleanly. Click-ops infrastructure cannot be handed over, only re-documented. |
| **GitHub Actions → ECR → ECS** | INFRA | Per-account deploy roles via OIDC, not stored keys. |

---

## 5. Third-party vendors and accounts

| Vendor | What for | Owner | Blocking | Lead time |
|---|---|---|---|---|
| **Twilio account** | Verify (OTP) + Messaging (notifications) | CLIENT | HARD (live), none (dev) | Days. **Test credentials are available immediately and unblock Day 3.** |
| ↳ Twilio Verify Service SID | Candidate login OTP | CLIENT | HARD for live | — |
| ↳ Twilio Account SID + Auth Token | Both | CLIENT | HARD for live | Must be readable **by the Cognito Lambdas**, which sit outside our codebase. Flag this handoff on Day 1. |
| **Payment gateway** — Razorpay, Cashfree or PhonePe | Subscriptions, courses, mock interview, employer access periods | CLIENT | SOFT (stub), LAUNCH | KYC 1–2 weeks |
| ↳ **Recurring billing + UPI AutoPay** | Candidate subscriptions | CLIENT | — | ⚠️ **Confirmed in scope 27 Aug** — the client wants manual renewal *and* UPI AutoPay, user's choice. That is two billing flows. The gateway account must be explicitly enabled for **UPI AutoPay e-mandates**: per-subscriber registration, an amount ceiling fixed at registration, and pre-debit notification before every charge. Confirm with the gateway before Day 15. |
| ~~**KYB / GSTIN verification**~~ | ~~Business verification~~ | — | — | **Still dropped (confirmed 27 Aug).** The KYB *form* stays and the approval mechanism is built, but approval is automatic and no third-party vendor is used. Removes a 1–2 week lead time. ⚠️ **Re-instate immediately** if the client responds to the bulk-extraction risk in `questions.txt` §1A by switching verification back on — which is the option we recommended. |
| **Google Cloud project** | OAuth client IDs for web, Android, iOS | CLIENT | HARD (Day 3) | 1 day |
| **Google Play Developer** | Android distribution | CLIENT | LAUNCH | 2–5 days. $25 one-time, under the client's business identity. |
| **Apple Developer (organisation)** | iOS distribution | CLIENT | LAUNCH | **1–3 weeks.** $99/year. An organisation account requires a **D-U-N-S number**, which is its own application with its own wait. Start now. |
| **FCM project / APNs key** | Push notifications | CLIENT | LAUNCH | Falls out of the two above. |
| **Domains** | Product domain + a separate sending domain for SES | CLIENT | LAUNCH | 1–2 days |
| **Speech-to-text / evaluation vendor** | If not Bedrock + Transcribe | CLIENT | SOFT | 1–2 weeks, or written confirmation to use AWS |
| ~~**Telephony provider**~~ | ~~Live interview calls~~ | — | — | **Not needed** — confirmed twice that the interview is recorded, not a live call. |
| **Video hosting / encoding for courses** | Course delivery | CLIENT + INFRA | LAUNCH | ⚠️ **Unscoped.** S3 + CloudFront with signed URLs covers basic delivery. Adaptive bitrate for low-end Android on 2G would need MediaConvert and is a real piece of work nobody has estimated. See [§8](#8-content-the-client-must-supply). |

---

## 6. Regulatory and legal

| Item | Owner | Blocking | Lead time |
|---|---|---|---|
| **TRAI DLT registration** — Principal Entity, sender ID (header), and **every SMS template** | CLIENT | **LAUNCH, hard** | **2–4 weeks** |
| ↳ Link the DLT entity and template IDs to the Twilio account | CLIENT | LAUNCH | Days, after DLT completes |
| ↳ **Ask Twilio directly:** are Verify's India templates pre-registered under Twilio's own entity, or must they be registered under the client's? | CLIENT | — | The answer moves the lead time materially. Do not assume in either direction. |
| ↳ DLT templates for the **new v4 nudge notifications** | CLIENT | LAUNCH | Every distinct SMS body needs its own registered template. Adding a message type after registration means going back. |
| **Privacy Policy, Terms of Service** | CLIENT's counsel | LAUNCH | — |
| **Employer agreement, college agreement** | CLIENT's counsel | LAUNCH | — |
| **DPDP Act 2023 compliance review** | CLIENT's counsel | LAUNCH | — |
| **Data retention and deletion policy** | CLIENT's counsel | **Day 20** | Has a review cycle. `questions.txt` Q13. **Ask this week.** |
| **Consent copy and consent versioning** | CLIENT's counsel | Day 18 | Consent is stored with scope, timestamp, version and status. The *text* of each version is theirs. |
| **⚠️ Written sign-off on the score, re-obtained** | CLIENT's counsel | **Before Day 8** | A three-digit score shown to Indian consumers resembles a credit bureau score — this is why the "no financial framing" rule exists. **v4 changed the risk:** the product now sells items that provably raise the number, and the number sits behind a paid subscription. Any sign-off given before 27 August was given against a different product. |

---

## 7. Business identity documents

All **CLIENT**. Needed for the accounts in [§5](#5-third-party-vendors-and-accounts) — mostly for
payment gateway KYC and the app stores.

| Document | Needed for |
|---|---|
| Business PAN | Payment gateway KYC |
| GST certificate | Payment gateway KYC, DLT |
| Certificate of incorporation | Payment gateway KYC, DLT |
| Company bank account | Payment gateway settlement |
| Authorised signatory ID | KYC across the board |
| **D-U-N-S number** | Apple Developer organisation account — **apply early, it is a separate wait** |
| Registered business address proof | DLT, gateway |

---

## 8. Content the client must supply

We build the machine. The client supplies what goes in it. **Nothing here blocks the code, and
all of it blocks the launch.**

| Content | Needed by | Notes |
|---|---|---|
| **⚠️ Course content — videos, materials, structure** | Day 15 to seed, LAUNCH to matter | 🔴 **The largest unlisted dependency in the project.** v4 introduced paid courses that add 30 points to a candidate's score. Nobody has said who produces them, how many there are, how long they run, what format they are in, or how completion is determined. Producing course content is a content-production project in its own right, entirely outside the software build. **Raise this explicitly — it is not in any estimate.** |
| **Course catalogue and prices** | Day 15 | Seeds the `courses` table. Each course carries its own point value, versioned. |
| **Subscription plans and prices** | Day 15 | Four candidate periods (monthly, quarterly, semester, annual), employer tier definitions, college seat pricing. |
| **Onboarding form fields — employer, KYB, and college** | The three forms; Day 9 onward | ⏳ **Deferred by the client 27 Aug.** Not blocking — fields are config-driven data, not code. No rework if they arrive within 2 weeks; minor rework at 2–4 weeks; real rework after that; blocking at launch. |
| **Employer type and industry lists** | Day 9 | Must be enumerated, not free text. No longer affects pricing now that employer tiers are dropped. |
| **Scoring algorithm** — dimensions, weights, category definitions | **Day 8, blocking** | NDA-gated. Replaces `v0-placeholder`. The arithmetic sent on 27 August does not close — `questions.txt` Q1. |
| **Integrity-detection rules** | Day 9 | Replaces the one remaining illustrative rule. Duplicate detection was dropped in v4. |
| **Questionnaire question bank** | Day 16 | |
| **Interview question bank + evaluation rubric** | Day 16–17 | |
| ~~**Improvement-suggestion copy** shown beside scores~~ | — | **Dropped in v5 (R11).** The client confirmed the score is never explained, so there is no breakdown screen and nothing to suggest. Not needed. **One replacement string is:** the generic eligibility message shown when a candidate misses a job's threshold — *"your score does not meet this employer's requirement"*, with no reasoning. That is user-facing copy in 6–8 languages and it does need writing. |
| **Notification templates**, including the new nudge messages | Day 19 | Every SMS body also needs a DLT template. |
| **Brand identity, design system, Figma files** | LAUNCH | Or an explicit agreement that design is in scope as a separate line item. |
| **Locale strings — 6–8 vernacular languages** | Day 19 plumbing, LAUNCH content | We supply the i18n plumbing; the client supplies the strings and funds translation. English and Hindi at launch, architecture supports the rest from day one. |
| **Production API contracts and data schemas** | Reconciliation | NDA-gated (PRD §10). |

---

## 9. Decisions owed

Not resources, but they block work exactly as hard. Full plain-language versions in
**`questions.txt`**.

> **Rewritten in v6.1.** The table below was still the v4 list and showed nine answered questions
> as blocking. The client answered Q1–Q8 and Q11 on 27 August. What is genuinely outstanding:

**Still open**

| Ref | Decision | Blocks | Owner |
|---|---|---|---|
| N1 | Approve `scoring-approach.md` | **Day 8** | Client |
| N2 | Data residency — may CV text be processed outside India? | **Day 8** | Client's counsel |
| N3 | Calibration corpus — 50–100 real CVs plus expected bands | **Day 8** | Client, one working session |
| N4 | ⚠️ Written acknowledgement of the bulk-extraction risk | **Day 14** | Client decision |
| N5 | Rescission of the unlock criteria (SRS §2.25.2 ×3 and others) | Day 13 | Client, one sentence |
| N6 | Referral-code consent vs. PRD rule 8's "invite-and-accept" | Day 17 | Client, one sentence |
| **N7** | 🔴 **Course content — producer, format, timeline, and what counts as completion** | **Now / Day 15** | Client |
| N8 | Plans, prices, course catalogue | Day 15 | Client |
| N9 | Language list and translation funding | Day 19 | Client |
| Q9 | Employer type and industry lists, plus the three onboarding form specs | Day 9, soft | Client — deferred, impact answered |
| Q10 | College seat behaviour at the limit (we recommend: block) | Day 17 | Client |
| Q12 | Score-explanation rescission — the fourth of four, still missing | Day 8 | Client, one sentence |
| Q13 | Deletion vs. audit retention *(legal)* — **we need a date, not just an answer** | Day 20 | Client's counsel |

**Answered 27 August — kept here only so nobody re-asks**

| Ref | Decision | Answer |
|---|---|---|
| Q1 | Score arithmetic | 700 + 200 + 30 + 60 = 990 exactly (R10) |
| Q2 | Is the 200-point band AI-judged? | Yes — our approach is `scoring-approach.md` (R12) |
| Q3 | Is the score explained? | Never (R11) — *but the rescission is still owed, see Q12* |
| Q4 / Q5 | Add-on points: per item or lifetime? Do they clip? | One course +30 once; interviews +20 to a +60 cap; cannot exceed 990 (R10) |
| Q6 | Is the score behind the subscription? | Yes, pay-first for all three audiences (R13) |
| Q7 | KYB automatic or manual? | Form stays, auto-approve, switchable (R15) |
| Q8 | What does an employer tier include? | No tiers — one payment, whole database, per period (R14) |
| Q11 | Subscriptions auto-renew or manual? | Both, user's choice (R17) |
| — | **Named decision-maker and an agreed review cadence** | Everything |
| — | **Expected year-one scale**, for infrastructure sizing | Day 20 |
| — | **Milestone and payment schedule**; which surface ships first | — |
| — | **Pilot partners** — at least one college, a handful of employers | LAUNCH |

> Three-sided marketplaces fail on slow decisions more often than on slow engineering. A named
> person who can answer within a day is worth more to this project than an extra developer.

---

## 10. How to hand over credentials

Practical, and routinely got wrong.

**Do:**

- Put every secret in **AWS Secrets Manager** in the target account, and send us the **path**, not
  the value. The application reads secrets once at boot and never logs them.
- Give the build team a **cross-account IAM role to assume**. No long-lived access keys.
- Use each vendor's **team or sub-account invitations** — invite us as a user on the Twilio and
  gateway accounts rather than sharing the owner login.
- Send anything that genuinely must be sent directly through a **one-time secret link** that
  expires.
- Rotate every credential that has ever been in a chat message before going live.

**Do not:**

- Paste credentials into WhatsApp, email, or a shared document. Anything sent this way must be
  treated as compromised and rotated.
- Share root account credentials with anyone, including us. We do not want them.
- Send `.env` files. They end up in backups, sync folders and screenshots.

**Secrets the application expects to read at boot:**

```
/bharatpath/<env>/db/url
/bharatpath/<env>/redis/url
/bharatpath/<env>/cognito/candidate_pool_id
/bharatpath/<env>/cognito/business_pool_id
/bharatpath/<env>/cognito/app_client_ids
/bharatpath/<env>/twilio/account_sid          # also readable by the Cognito Lambdas
/bharatpath/<env>/twilio/auth_token           # also readable by the Cognito Lambdas
/bharatpath/<env>/twilio/verify_service_sid   # also readable by the Cognito Lambdas
/bharatpath/<env>/twilio/messaging_sid
/bharatpath/<env>/payments/key_id
/bharatpath/<env>/payments/key_secret
/bharatpath/<env>/payments/webhook_secret
/bharatpath/<env>/google/oauth_client_ids
/bharatpath/<env>/sentry/dsn
```

> The three Twilio entries must be readable by a Lambda function **we do not own**. That
> cross-boundary permission is the kind of thing that surfaces on Day 3 and costs a day. Confirm
> it on Day 1.

---

## 11. Cost

### Running, per month, at MVP scale

| Line | Estimate | Notes |
|---|---|---|
| RDS PostgreSQL Multi-AZ | Largest single line | Multi-AZ roughly doubles a single instance. Non-negotiable for production. |
| ECS Fargate (API + workers) | Moderate | Scales with traffic. |
| ElastiCache Redis | Small | |
| S3 + CloudFront | Small at MVP | **Rises with course video** — video is an order of magnitude more egress than anything else here. |
| CloudWatch, WAF, GuardDuty | Small | Log retention is the variable; set it deliberately. |
| **Subtotal** | **~$300–600/month** | Before consumption-priced services below. |

### Consumption-priced — these scale directly with sign-ups

| Service | Driver | Watch for |
|---|---|---|
| **Textract** | CVs uploaded | Use native-PDF extraction first; Textract only for scanned files. This is the single biggest lever. |
| **Bedrock** | CVs parsed, **plus every score if the judged band is model-based** | If `questions.txt` Q2 comes back "AI", this moves from a parsing cost to a per-score cost. Model it before committing. |
| **Transcribe** | Interview minutes | Paid product, so it self-funds — but check the margin against the interview price. |
| **Twilio Verify** | Logins | **Priced per verification, roughly an order of magnitude above raw SMS.** Immaterial in dev; a real number at volume. The cheaper fallback (generate the code ourselves, send via Twilio Messaging on a DLT template) is a swap inside the Lambdas and does not touch application code. |
| **Twilio Messaging** | Notifications **+ the new v4 nudges** | Nudge campaigns to non-uploaders can be high-volume by design. Cap the cadence. |
| **CloudFront egress** | **Course video** | New in v4 and potentially the largest consumption line of all, depending on video length and resolution. |

### One-time

| Item | Cost |
|---|---|
| Google Play Developer | $25 one-time |
| Apple Developer | $99/year |
| D-U-N-S number | Free, but takes time |
| Domains | Nominal |
| DLT registration | Nominal fee, significant time |

> **The honest note on cost:** v4 made two changes that move the running-cost picture. Course video
> adds egress, and a model-judged score adds a per-score inference cost. Both are worth modelling
> against expected volume **before** committing to the pricing in the subscription plans — the
> margin on a monthly subscription is set by these numbers.

---

## 12. Master checklist

Tick as they land. Anything unticked on Day 1 is a day at risk.

### Blocking Day 1

- [ ] AWS account created, owned and billed by the client
- [ ] Three accounts under an Organization (`dev`, `staging`, `prod`)
- [ ] Cross-account IAM role for the build team
- [ ] Region confirmed as `ap-south-1`
- [ ] Redis endpoint
- [ ] SQS queues + IAM for workers
- [ ] Secrets Manager paths and read policy
- [ ] CI/CD pipeline and image registry
- [ ] CloudWatch + trace collector endpoints
- [ ] Sentry project
- [ ] **Confirmed: who deploys the Cognito Lambda triggers**
- [ ] **Confirmed: Bedrock model availability in `ap-south-1`** (residency implications)

### Blocking Day 2–3

- [ ] Postgres endpoint + app role (no `BYPASSRLS`, not owner) + admin-bypass role
- [ ] Six S3 buckets, private, SSE-KMS, Object Lock on the audit archive
- [ ] KMS keys
- [ ] Cognito candidate pool + app client
- [ ] Cognito business/admin pool + app client
- [ ] Three custom-auth Lambda triggers deployed
- [ ] Twilio account opened
- [ ] Twilio **test** credentials in hand
- [ ] Twilio credentials readable by the Lambdas
- [ ] Google Cloud project + OAuth client IDs (web, Android, iOS)
- [ ] Google IdP configured on the candidate pool

### Started today, needed later

- [ ] **TRAI DLT — Principal Entity registration**
- [ ] **TRAI DLT — sender ID (header)**
- [ ] **TRAI DLT — every SMS template, including v4 nudges**
- [ ] Twilio asked: are Verify's India templates under their entity or ours?
- [ ] Payment gateway account + KYC submitted
- [ ] **Payment gateway confirmed for recurring billing / UPI AutoPay**
- [ ] D-U-N-S number applied for
- [ ] Apple Developer organisation account
- [ ] Google Play Developer account
- [ ] Domains registered + SES sending domain
- [ ] SES domain verification (DKIM/SPF/DMARC)
- [ ] SES production access requested
- [ ] Bedrock model access requested
- [ ] **Counsel re-engaged on the score** (see [§6](#6-regulatory-and-legal))
- [ ] Data retention and deletion policy requested from counsel

### Content and decisions

- [ ] 🔴 **Course content — producer, format, timeline** *(`questions.txt` §3I1 — N7)*
- [ ] 🔴 **What counts as course completion** — this is a rule we have to code, not just content
- [ ] Course catalogue and price *(N8)*
- [ ] Subscription and employer-access prices; college seat pricing *(N8)*
- [ ] Employer type and industry lists, plus the three onboarding form specs *(Q9)*
- [ ] **Approve `scoring-approach.md`** *(N1)*
- [ ] **Data-residency decision — may CV text leave India?** *(N2, counsel)*
- [ ] **Calibration corpus: 50–100 CVs with expected bands** *(N3, working session)*
- [ ] Scoring weights and dimension importance — falls out of the calibration session
- [ ] Integrity-detection rules
- [ ] Questionnaire question bank
- [ ] Interview question bank + rubric
- [ ] Generic eligibility-message copy *(replaces the dropped improvement suggestions)*
- [ ] Notification templates
- [ ] ⚠️ **Written acknowledgement of the bulk-extraction risk** *(N4)*
- [ ] Unlock-criteria rescission *(N5)* · Referral-code consent confirmation *(N6)*
- [ ] Score-explanation rescission — the fourth of four *(Q12)*
- [ ] Duplicate-detection re-confirmation *(client said they would confirm once more)*
- [ ] College seat-limit behaviour *(Q10 — we recommend: block at the limit)*
- [ ] **A date** for the deletion/retention policy *(Q13, counsel)*

~~Score arithmetic reconciled~~ · ~~Judged band: AI or fixed rules~~ · ~~Employer tier contents~~
— **all answered 27 August (R10, R12, R14).**
- [ ] Brand identity and design files, or design agreed as a separate line item
- [ ] Language list confirmed; translation funded
- [ ] Named decision-maker and review cadence agreed
- [ ] Expected year-one scale
- [ ] Milestone and payment schedule
- [ ] Pilot partners identified

### Before launch

- [ ] WAF, GuardDuty, CloudTrail all on
- [ ] ACM certificates (`us-east-1` for CloudFront, `ap-south-1` for the ALB)
- [ ] Route 53 configured
- [ ] CloudFront distributions (consoles + course media)
- [ ] Push: FCM project / APNs key
- [ ] Privacy Policy, Terms of Service
- [ ] Employer and college agreements
- [ ] DPDP compliance review complete
- [ ] Budget alarms and cost anomaly detection
- [ ] Every credential that has ever been in a chat message rotated

---

*Companion to `plan.md` v6.1 and `questions.txt`. Derived from `plan.md` §12, the build brief's AWS
architecture and client-dependency sections, and the client's changes of 2026-08-24 and
2026-08-27. Items marked ⚠️ or 🔴 are new in v4 or later and are not reflected in any estimate
given before 27 August. **Course content (N7) is not reflected in any estimate at all.***
