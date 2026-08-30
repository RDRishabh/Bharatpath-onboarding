# BharatPath — Questions and Answers Log

> **The complete record.** Every question put to the client, their answer verbatim, the date, and
> what we did about it. Nothing is summarised away — where an answer was ambiguous or was later
> contradicted, both versions are here.
>
> **Still-open questions live in [`questions.txt`](questions.txt)**, written in plain language and
> ready to send. This file is the archive; that file is the ask.
>
> Last updated 30 August 2026 — Round 6 added (raised by us on review, not client answers).

---

## Status at a glance

| Round | Source | Asked | Answered | Still open |
|---|---|---|---|---|
| 0 | Build brief open questions | 8 | 6 | 2 |
| 1 | Document comments, 24 Aug | 9 | 9 | 0 |
| 2 | Client note, 27 Aug | 6 | 6 | 0 |
| 3 | Our questions Q1–Q5, answered 27 Aug eve | 5 | 5 | 0 |
| 4 | Our questions Q6–Q13, answered 27 Aug late | 8 | 6 | 2 partial |
| 5 | Raised by us after their answers | 4 | 0 | 4 |
| 6 | **Raised by us on review, 30 Aug** | **4** | **0** | **4** |
| | **Total** | **44** | **32** | **12** |

**Nothing is blocking Day 1.** Four items block Day 8 (all scoring-related), one needs a written
answer before Day 14, and one has a legal review cycle attached and needs starting now.

**New on 30 August.** A review of this log against the PRD and SRS found **three questions that
had never been put to the client at all** — course content, the unlock rescission, and prices —
plus one wording confirmation. They are Round 6. **6.1 (course content) is the one with a lead
time we do not control**, and 6.2 is a gap in our own process: we chased a one-sentence rescission
twice while the largest reversal in the project went unrecorded.

---

## Round 0 — Open questions from the original build brief

Raised by us in `BharatPath_Build_Brief.docx` before any client contact.

### 0.1 Audio-only or video? · was a BLOCKER

**Asked:** The PRD says candidates record responses as "audio/video" and lists camera and lighting
in the device check. The SRS says in bold these are "phone-based audio interviews only… There is
no camera, video capture, or video-based interview experience."

**Answer — client, 2026-08-24:** Audio only. No video.

**What we did:** Device check drops camera and lighting. No camera permission. Opus/AAC mono at
16 kHz, ~20 KB per 30-second answer, which is what makes progressive upload viable on 2G. Storage
and evaluation costs fall by roughly an order of magnitude.
→ `plan.md` §3, §6, §11, Day 16.

> The SRS's own device-check table still lists "Lighting". That row is dead — flag it to whoever
> maintains the SRS.

---

### 0.2 "Phone-based" — a real call, or in-app recording? · was a BLOCKER

**Asked:** SRS §1.10.4 describes the system asking questions live and the candidate answering
"over the phone", which reads as a real PSTN call. But §1.10.5 describes local storage, per-question
upload, a retry queue and offline recovery — which only makes sense for in-app recording. These are
different builds, four to six weeks apart in estimate.

**Answer — client, 2026-08-24:** In-app recording.

> *"Recorded, not real time conversation."* — comment on open question 2

**What we did:** No telephony vendor, no Amazon Connect, no Exotel, no real-time streaming
speech-to-text, no voice DLT. Removed the largest single unknown from the estimate.
→ `plan.md` §13 Q1, Day 16.

**Re-confirmed** in the 24 August document comments, so this can be treated as settled.

---

### 0.3 After unlock, does the employer see the real score or the floored one? · was a BLOCKER

**Asked:** Rule 2 floors displayed scores at 680. Rule 6 says unlock reveals "the exact score". So
a candidate with a true score of 540 sees 680 while a paying employer sees 540 — a trust problem
and arguably a disclosure one. Neither document resolved it.

**Answer — client, 2026-08-24:**

> *"No real score ever"* — comment on open question 3

**What we did:** "Exact score" means the exact *displayed* score. The raw value is still computed
and stored for reproducibility, never serialized to anyone. Invariant 7 strengthened with a schema
test asserting no employer-facing response model has a `raw_value` field.
→ `plan.md` invariant 7, Days 10 and 14.

**Superseded in effect by Round 3.** Once the base became 700 and everyone receives it, no score
can fall below 700 — so stored and displayed values are now always identical and there is no
hidden number left to protect. The invariant stays anyway.

---

### 0.4 Job thresholds versus the display floor

**Asked:** Eligibility is computed against the authoritative score while the candidate sees the
floored one. A candidate seeing "680" who is told they fail a 680-threshold job will read it as a
bug. What does the candidate-facing copy say?

**Answer:** Not answered directly — resolved by the arithmetic in Round 3.

**What we did:** With 700 as a base rather than a floor, the two values are the same and the
contradiction disappears. One residual: a threshold below the floor is meaningless, so threshold
input is constrained to ≥ the configured floor.
→ `plan.md` Days 10 and 14.

**Related item still open:** the candidate-facing copy when they miss a threshold — see Round 5.4,
because "what would need to improve" is an explanation and the score is no longer explained.

---

### 0.5 Data deletion conflicts with audit immutability · STILL OPEN

**Asked:** Deletion on request is required. An immutable audit trail is required. Financial records
carry statutory retention. These pull against each other and the resolution is a policy decision,
not an engineering one.

**Answer — client, 2026-08-27:** *"For data deletion policy we will discuss and let you know on it"*

**Status:** 🔴 **Still open. Needed by Day 20, has a legal review cycle attached.**
We have asked for a *date* rather than the answer, since a date is more useful for planning than
an early arrival. Now slightly larger in scope than when first raised — subscription and course
purchase records are financial records too.
→ `questions.txt` §3F.

---

### 0.6 Two separate consent scopes

**Asked:** Roster-link consent and individual-visibility consent are distinct in the SRS. Confirm
the exact scopes and what each unlocks.

**Answer:** Not answered explicitly, but the client's Round 4 referral-code design assumes the
distinction.

**What we did:** Modelled both from the first migration — `ROSTER` and `INDIVIDUAL`, separate
grants, roster never implying individual visibility. Retrofitting a consent model onto live student
data is painful and legally exposed, so this was never going to wait for confirmation.
→ `plan.md` §6, Day 18.

---

### 0.7 PRD §1.1 says "all five surfaces" but lists four

**Answer:** Not raised with the client. Almost certainly a documentation typo. Worth one line of
confirmation at some point; blocks nothing.

---

### 0.8 Hire-event billing is deferred · STILL OPEN (by the client's choice)

**Asked:** The SRS states billing behaviour for hire events remains a business decision and "must
not be assumed in the UI contract."

**Status:** ⏸️ **Deliberately deferred by the client.** Building the hire-confirmation flow is
fine; the billing hook stays a stub. Not blocking.
→ `plan.md` Day 12.

---

## Round 1 — Document comments, 24 August 2026

Nine comments embedded in `BharatPath_Build_Brief_new.docx`. **The document's body text is
byte-identical to the 24 August version** — every update was comment-borne, which is worth knowing
if anyone goes looking for tracked changes.

### 1.1 Do paid add-ons change the core score?

**Context:** Hard rule 4 — *"Paid add-ons must never change the core score — and this has to be
verifiable, not merely visually true."*

**Answer — French Fry, 2026-08-24:**

> *"It will change it"*

**What we did:** Rule 4 rescinded and replaced by **invariant 4′** — add-on contributions are
typed, versioned and capped. The `import-linter` contract was **inverted, not deleted**: `scoring`
now reads add-on completion events, and the add-on modules still cannot write a score.
`scores` gained `base_value`, `addon_value` and `contributing_events`, without which `replay()`
breaks the first time a candidate buys a course.
→ `plan.md` §1, §2, §6, Days 8 and 16.

---

### 1.2 Is the score explainable?

**Answer — Krish Goyal, 2026-08-24:**

> *"Score is not explainable but is reproducible basis the improvements made by opting for courses
> and add ons to the CV"*

**Conflict:** The 27 August note said the opposite — *"explaination required"*. Resolved in
Round 3.3: the score is never explained.

---

### 1.3 How does unlock work?

**Answer — French Fry, 2026-08-24:** This was a *question*, not an answer:

> *"How will the unlock work, subscription based? allowing 50 unlocks at once under tiers or one
> at a time."*

**Status:** Answered in Round 4.3 — no tiers, no unlocks at all.

---

### 1.4 Can a user get a score without logging in?

**Answer — French Fry, 2026-08-24:**

> *"Without login the user cannot parse the resume/ cannot get a score."*

**What we did:** Deleted the entire anonymous-first flow — `anonymous_subjects`,
`/api/v1/public/session`, the opaque guest token, and the claim transaction. `subject_id`
collapsed to `user_id`. This removed the sprint's highest-design-risk half-day **and** the DPDP
exposure of holding a complete resume for an unauthenticated user.
→ `plan.md` §5.7, §6, Days 4, 5, 6.

**Contradicts SRS §2.25.1** — "Candidate can reach the first score before mandatory account
creation" is a documented acceptance criterion. Written rescission received in Round 4.7.

---

### 1.5 Duplicate resume detection

**Answer — French Fry, 2026-08-24:**

> *"Don't flag for duplicates."*

**What we did:** The duplicate-content-hash rule is not registered. Timeline-inconsistency checking
and the severity/suppression machinery stay, and the rule engine still supports duplicate detection
if it ever comes back.
→ `plan.md` Day 9.

> **Not to be confused with duplicate *application* prevention** — one candidate applying twice to
> the same job. Different mechanism, it is a database constraint, and it stays.

**Status:** ⚠️ Client marked this for re-confirmation in Round 4.7. Treated as provisional.

---

### 1.6 KYB verification provider

**Answer — French Fry, 2026-08-24:**

> *"Manual, uploading will be there but manual"*

**Contradicted three days later** by the 27 August note — *"KYB won't be there, automatic
approval"*. Resolved in Round 4.2.

---

### 1.7 Pricing and revenue model

**Answer — French Fry, 2026-08-24:**

> *"Student -> Subscription (Nothing free (Per month/quarterly/semester/annually)) + Course +
> Audio Mock Interview. Employers -> Flat Fee/Tier. College -> B2B Deal, No of Seats will be
> assigned from the admin. (CRUD Operations and stop operations in backend admin)"*

**What we did:** Replaced the prepaid-wallet model with `plans`, `subscriptions`,
`subscription_events`, `courses`, `course_purchases`, `course_completions`, `college_seats` and
`tenant_suspensions`. Two new modules.
→ `plan.md` §4, §6, Days 15, 17, 19.

**"Nothing free" retires the PRD §2 objective** of a credible score at no cost. Confirmed in
Round 4.1. The employer half — "Flat Fee/Tier" — was superseded in Round 4.3.

---

### 1.8 Real call or recording?

**Answer — French Fry, 2026-08-24:** *"Recorded, not real time conversation."*
Re-confirms Round 0.2. No change.

---

### 1.9 Real score or floored, post-unlock?

**Answer — French Fry, 2026-08-24:** *"No real score ever"*
Answered Round 0.3 above.

---

## Round 2 — Client note, 27 August 2026

Six numbered items received by WhatsApp.

| # | Client's words | What we did |
|---|---|---|
| 1 | *"Scoring - Base -700, max - 990, Course/Videos - Add 30 to the score, Critically judge and give points out of 200 points (990-790), explaination required."* | Scale changed from 680–999 to **700–990**. Both were already versioned config, so this was seed data, not a migration. The arithmetic did not close on first reading — resolved in Round 3.1. |
| 2 | *"Mock Interview - Per Session 20 points increase, up to 60 points."* | Interview contribution capped at +60 in `scoring/domain.py`, enforced by a property test. |
| 3 | *"Only Sign Up is allowed, nothing else, not even the resume upload, paid first audience only. Same for employers."* | Anonymous flow deleted. Extended to a full pay-first model in Round 4.1. |
| 4 | *"Nothing uploaded, then also send notifications for that."* | Scheduled sweep for users with no resume, with a cadence cap and suppression list — nudging the same person daily forever is the failure mode. → Day 19. |
| 5 | *"KYB won't be there, automatic approval"* | Contradicted the 24 August comment. We built the gate anyway with a config switch; confirmed correct in Round 4.2. |
| 6 | *"Employer - MNC, Industry"* | `employer_type` and `industry` on `employers`, enumerated and config-seeded. Values still owed. |

---

## Round 3 — Our Q1–Q5, answered 27 August evening

### 3.1 The score arithmetic · was a BLOCKER

**Asked:** 700 + a 200-point band = 900, not 990. And the band was written as spanning 790–990.
There is a 90-point gap we cannot explain. Please walk us through one worked example.

**Answer — client, 2026-08-27:**

> *"The user has been already given a base score 700, then the user gets an option to purchase a
> course (only 1 course will be available on the platform) so now once the user has purchased the
> course, the score automatically increases … Then if a user gives a mock interview then the score
> increases by 20 points but only for a total of 3 interviews. The user can give N number of
> interviews on the platform, by purchasing, but the max number of score that can be increased via
> interviews are capped at 60 … So now you see the base is 700, the user gets 30 from one time
> course, only 1 course available to purchase and it increases the score only once. Then another 60
> from 3 interviews, that is making it a total of 790. Now the maximum score is capped at 990, and
> no one gets above that, that is a total of 200 points out of which we have to mark our user."*

**The arithmetic closes exactly:**

```
base                                    700
resume judgment      0 – 200      →   700 – 900
course (one, once)        +30      →   730 – 930
interviews (3 × 20)       +60      →   790 – 990
                       ───────
maximum                                 990   = 700 + 200 + 30 + 60, exactly
minimum                                 700
```

**What we did — three consequences, all simplifications:**

- **No clamp needed at the ceiling.** 990 is arithmetic, not a rule. We assert it, but if the
  assertion ever fires it is a bug rather than a business rule.
- **The display floor became unreachable.** 700 is a *base* every score receives, so stored value
  and displayed value are now always the same number. The floor machinery stays because it is
  config-driven and free, but it is a no-op.
- **Round 0.3 is satisfied for free.** No hidden raw score exists to leak.

→ `plan.md` invariants 1, 2, 4′, §5.6, §6, Days 8 and 16.

---

### 3.2 Add-on points — per item or lifetime? / Do they clip at 990?

**Answer — client, 2026-08-27:** One course exists on the platform, purchasable once, +30 total.
Interviews may be bought without limit but contribute +20 each only to a ceiling of +60.

> *"let us say the user has 700 base, and the score of resume is 200/200, then 900 is the maximum
> score the user can get. And he will require to do the purchases to reach 990."*

**What we did:** Caps as pure functions in `scoring/domain.py`, property-tested so no ordering or
quantity of completions can breach them.

**One thing we added that was not asked for:** a candidate can buy a fourth interview session that
earns no points. We will show an explicit confirmation before taking payment — *"this session will
not increase your score."* Without it, that is a refund request and a payment dispute, and disputes
cost more than the sale.
→ `plan.md` Day 16.

---

### 3.3 Is the score explained to the candidate?

**Asked:** The document said "not explainable"; the note said "explaination required". These
cannot both be built.

**Answer — client, 2026-08-27:**

> *"The score is never explained to the user."*

**What we did:** No breakdown screen, no category detail, no improvement suggestions. `suggestions`
dropped from `scores`. The breakdown is **still computed and stored** — admin drill-down and
dispute handling need it — and no candidate-facing schema may expose it, enforced by a schema test.
Invariant 1 is now purely *reproducible*; the "explainable" half is formally dead.
→ `plan.md` invariant 1, §6, Day 8.

**Contradicts PRD §4.2**, which promises a category-by-category breakdown and top improvement
suggestions. Rescission requested and **still outstanding** — see Round 5.4.

---

### 3.4 Is the 200-point band judged by an AI? · was a BLOCKER

**Asked by us. Turned back to us by the client:**

> *"You tell us the approach, we want the score to be reproduceable but by formulating it we cannot
> bound it to only certain industries so AI would be coming into play, tell us your approach for
> this (the word here is reproducible score)"*

**Our answer:** Written up in full as **[`scoring-approach.md`](scoring-approach.md)**. In one line:
**the model never emits a score.** It reads the CV — the part a fixed formula genuinely cannot do
across industries — and returns schema-validated facts plus bounded ordinal ratings. Deterministic
versioned code turns those into points. The model's response is stored verbatim, and `replay()`
recomputes from storage without ever re-invoking the model.

Three properties fall out of that split:

- **Replay** is bit-identical in perpetuity, even after the model is retired or upgraded.
- **Consistency** is exact for identical CVs, via a content-addressed extraction cache.
- **CV prompt-injection stops working** — a schema with no score field cannot be talked into
  awarding one. The worst an attacker achieves is exaggerating a fact, which is ordinary resume
  fraud that the integrity module already owns.

**Status:** ⏳ **Awaiting client approval of the document.** Two things block the build: their sign-off,
and the data-residency decision in its §13.
→ `questions.txt` §3G.

---

## Round 4 — Our Q6–Q13, answered 27 August late

### 4.1 Is the score behind the paywall?

**Answer — client, 2026-08-27:**

> *"Yeah the application for students/employers/colleges, is pay first only."*

**What we did:** Sign-up creates an account; everything else requires payment, for all three
audiences. A lapsed subscriber **keeps their account and score history and loses access** — never
their data.
→ `plan.md` Days 6, 11, 14.

---

### 4.2 KYB — automatic or manual?

**Answer — client, 2026-08-27:**

> *"KYB Onboarding form will be there, but it would be automatic, that is as soon as the user fills
> the employer portal, they have the access to portal, but nothing they can do inside the portal,
> unless they pay the price for it. Build the approval mechanism as well, and provide a setting to
> enable and disable it (upon disabling it, the approval becomes automatic)"*

**What we did:** This confirms the provisional decision we had already taken — build the full gate,
default the flag open. **Now settled rather than provisional.** Two independent gates that must not
be conflated: `kyb.require_approval` (config, default off) and an active paid subscription (the
real gate on employer actions). They fail differently and return different error codes. The
invariant-8 test runs with the flag *on* so the gate stays genuinely exercised whatever production
is set to.
→ `plan.md` invariant 8, Days 10 and 14.

---

### 4.3 What does an employer tier include? · was a BLOCKER

**Answer — client, 2026-08-27:**

> *"So no tiers for the employer payment, the employer pays once, (the value can be for
> monthly/quarterly/semi-annual/annual), now one time payment and for that time frame, every
> student is unlocked automatically for the employer, they can view anyone in the whole database."*

**What we did — this deleted more code than any other single answer:**

| Deleted | Was |
|---|---|
| `unlocks` table | Unique per (tenant, candidate), unlock-once-bill-once |
| `wallet_ledger` | Append-only employer balance |
| Unlock quote / price / balance display | SRS §2.25.2 |
| Unlock idempotency key | One of six named idempotent operations |
| Concurrent-double-charge test | Day 14's hardest correctness case |
| Employer tiers | Explicitly rejected |

Replaced by a single `require_active_access_window` check — the subscription *is* the entitlement.
Day 14 was one of four days flagged as uncompressible and most of it is gone, **recovering roughly
a day on the critical path.**

**Two things it did not remove:**

1. **The audit obligation.** PRD §3.9 requires every reveal of private data to be logged. Blanket
   access destroys the natural one-row-per-unlock trail, so the audit moves to the read — every
   profile opened writes a row. **Invariant 7′ is new for exactly this**, and
   `candidate_view_events` will be the fastest-growing table in the schema.
2. **🔴 The bulk-extraction risk** — see Round 5.1. This is the open item that matters most.

→ `plan.md` invariants 7 and 7′, §6, Days 13, 14, 15.

---

### 4.4 Employer type and industry lists

**Answer — client, 2026-08-27:**

> *"The onboarding Forms for all along with their fields will be provided at a bit later stage.
> Please mention what all is getting stuck due to this, if this is resolved in sometime?"*

**Our answer — nothing is hard-blocked.** Forms are built config-driven, so fields are data rather
than code. Helped by the fact that dropping employer tiers means employer type no longer affects
pricing, which was the expensive part to change late.

| Arrives | Cost |
|---|---|
| Within 2 weeks | No rework |
| 2–4 weeks | Minor — some guessed field types will be wrong |
| After 4 weeks | Real — screens built and tested against placeholders; admin filters need revisiting |
| Not before launch | Blocking |

**We now need three form specs, not one** — employer onboarding, **KYB** (since 4.2 kept that form
alive), and college onboarding — plus the two enumerated lists.
→ `questions.txt` §2B.

---

### 4.5 College seats — tiered or one-time?

**Answer — client, 2026-08-27:** Turned back to us as a question, plus a new mechanism:

> *"please confirm will there be tier wise breakdown for the college seats? Or one time payment for
> x number of students, else? Yeah if they do have an existing account, but they have a college
> sending them request as well, then there would be a referral type autogenerated code from the
> college side to the student, that the student has to enter in their applications to connect their
> id's with their colleges."*

**Our recommendation:** One payment per period covering up to N students. Not tiers — it mirrors
the employer model they just chose, avoids two billing systems, and keeps full commercial
flexibility, since "500 seats annual" and "2000 seats annual" are two price-list entries rather
than two systems.

**Referral codes — designed in, with three decisions we took:**

- **Entering a code is the consent act**, written as `granted_via = REFERRAL_CODE`. Arguably better
  consent than invite-accept, because the student takes a deliberate action.
- **It grants `ROSTER` scope only.** Individual visibility stays a separate explicit grant — PRD
  §3.8 requires the two to be distinct and a code must not silently confer both.
- **Codes are credentials** — non-guessable, rate-limited on entry, revocable, expiring. A
  guessable code lets anyone attach themselves to a roster, or lets a college harvest students who
  never agreed to anything.

Runs **alongside** the invite flow, not instead of it — invites still cover students with no account.

**Still open:** what happens at the seat limit — see Round 5.3.
→ `plan.md` §6, Day 17.

---

### 4.6 Subscriptions — auto-renew or manual?

**Answer — client, 2026-08-27:**

> *"Keep choice for the user, manual or UPI Mandate, if there are issues in it please let me know."*

**Our answer — no blocking issues, but two things worth knowing:**

**It is two billing flows, not one.** Both need building, testing and supporting. Offering the
choice is a real feature, not a checkbox.

**UPI AutoPay carries obligations that are the usual source of overrun:** per-subscriber mandate
registration, an amount ceiling fixed at registration, **pre-debit notification before every
charge**, debit failure and retry handling, and mandates the user can revoke **inside their own UPI
app, where we are never told**. We treat a silently dead mandate as a first-class state — detect on
failed debit, fall back to manual, notify before access lapses.

**Our sequencing:** manual first, mandate second behind the same interface, so a slip there does
not block launch. No decision needed from the client.
→ `plan.md` §6, Day 15.

---

### 4.7 Written confirmations — three of four

**Answer — client, 2026-08-27:**

> *"1. Paid Add Ons will increase the score. 2. Yes Sign up is required before anything and then
> payment as well, then only students will be having the scoring and tools available to them.
> 3. Yes, we won't be implementing duplicate CV feature. (Will confirm this once more)"*

| Item | Status |
|---|---|
| Paid add-ons increase the score *(reverses PRD rule 3)* | ✅ Confirmed |
| Sign-up before anything *(reverses SRS §2.25.1)* | ✅ Confirmed |
| Duplicate CV detection dropped *(reverses PRD §7.2)* | ⚠️ Provisional — client to re-confirm |
| **Score never explained** *(reverses PRD §4.2)* | 🔴 **Not addressed — re-asked** |

---

### 4.8 Data deletion policy

**Answer — client, 2026-08-27:** *"For data deletion policy we will discuss and let you know on it"*

**Status:** 🔴 Still open. See Round 0.5.

---

## Round 5 — Raised by us after their answers · ALL OPEN

### 5.1 🔴 Bulk extraction — needs a written acknowledgement · before Day 14

**Not a question we were asked. A consequence of two answers that nobody has looked at together.**

Round 4.2 means an employer is approved automatically, with nobody checking the business is real.
Round 4.3 means one payment buys visibility of every candidate in the database.

Together: **anyone with a payment card can pay for one month and extract the complete contact
details of every candidate on the platform** — candidates who themselves paid to be there. Under
the DPDP Act, that is a purpose-limitation and security question, not a product-design preference.

**We are building mitigations** — per-tenant daily and hourly view caps, rate limits on discovery
and reveal, velocity anomaly alerting to the admin console, and no bulk export of any kind. **They
are speed bumps, not a fix.** The fix is business verification, and the client has switched it off.

**What we need:** either a written *"yes, we understand, proceed"*, or they flip the verification
switch back on. We have recommended the switch, because they have **already asked us to build the
approval mechanism** — so it costs them almost nothing and removes most of the exposure.
→ `questions.txt` §1A.

---

### 5.2 Data residency — can CV data leave India? · blocks Day 8

The whole system sits in `ap-south-1` for DPDP residency. A CV is about as personal as data gets,
and the scoring design sends that text to a language model. **Amazon Bedrock does not support the
parameter that pins where inference runs**, so depending on model availability in Mumbai, the text
may be processed elsewhere.

This determines which client library the scoring module is built against, so it is needed before
Day 8. **It is a legal question about users' personal data and should be their counsel's answer,
not a default we set quietly in a config file.**
→ `questions.txt` §3G.

---

### 5.3 College seat limit behaviour · needed by Day 17

When a college with 500 seats adds the 501st student: block, allow and bill the overage, or allow
but cap analytics at 500? **We suggest block** — it is the only option that cannot produce a
surprise invoice, and surprise invoices to institutional customers become long email threads.
→ `questions.txt` §2C.

---

### 5.4 Score-explanation rescission · blocks Day 8

Round 3.3 removed the explanation, contradicting PRD §4.2. Not addressed in Round 4.7's
confirmations, so re-asked.

**Plus a knock-on the client may not have considered:** PRD §4.5 says a job listing tells a
candidate "what would need to improve" when they miss a threshold. That is an explanation too. We
are building generic messaging — *"your score does not meet this employer's requirement"* — with no
reasoning, and have flagged it for correction.
→ `questions.txt` §3D.

---

### 5.5 Calibration corpus · blocks Day 8

**50–100 real CVs** with a rough sense of what each should score, plus the relative importance of
the dimensions and any hard rules. Without it the weights are invented rather than calibrated, and
the golden-corpus CI gate has nothing to gate against.

Realistically **one working session** with whoever owns the product judgment — a few hours going
through real CVs and agreeing what "good" means. That session will do more for the quality of this
score than anything written in code.
→ `questions.txt` §3G.

---

## Everything still open, in one list

| # | Item | Blocks | Owner |
|---|---|---|---|
| 5.1 | 🔴 Written acknowledgement of the bulk-extraction risk | Day 14 | Client decision |
| 3.4 | Approve `scoring-approach.md` | Day 8 | Client |
| 5.2 | Data residency — can CV data leave India? | Day 8 | Client's counsel |
| 5.5 | Calibration corpus — 50–100 CVs | Day 8 | Client working session |
| 5.4 | Score-explanation rescission, plus the §4.5 knock-on | Day 8 | Client, one sentence |
| 0.5 | Data deletion vs. audit retention — **need a date** | Day 20 | Client's counsel |
| 5.3 | College seat limit behaviour | Day 17 | Client |
| 4.4 | Onboarding form fields ×3 + two enumerated lists | Soft, Day 9 | Client |
| 4.7 | Duplicate detection re-confirmation | Provisional | Client |
| 0.8 | Hire-event billing | Deliberately deferred | Client |
| **6.1** | **🔴 Course content — producer, format, timeline, completion rule** | **Now / Day 15** | **Client** |
| **6.2** | **Unlock-criteria rescission (SRS §2.25.2 ×3 and others)** | **Day 13** | **Client, one sentence** |
| **6.3** | **Referral-code consent vs. PRD rule 8's "invite-and-accept"** | Day 17 | Client, one sentence |
| **6.4** | **Plans, prices and the course catalogue** | Day 15 | Client |
| — | Language list and translation funding | Day 19 | Client |

---

## Round 6 — Raised by us on review, 30 August · ALL OPEN

**Not client answers. Four things we found by auditing our own record against the source
documents.** Three had never been put to the client at all.

### 6.1 🔴 Course content — never asked · scoping answer needed now

`resources-needed.md` has called this *"the largest unlisted dependency in the project"* since v4,
where it has sat without ever reaching `questions.txt` — the file that actually gets sent. **The
client sells one course; completing it adds 30 points.** Nobody has said who produces it, how long
it is, what format, or when it would exist.

**The part that is ours, not theirs:** *what counts as completion?* That is not a content question.
It decides what a `course_completions` row means, and that row moves a score — so it sits inside
invariant 3's blast radius and has to be something we can detect and a candidate cannot fake.

Also unscoped behind it: `course-media` bucket, a second CloudFront distribution, signed URLs, and
— against the stated primary segment of low-end Android on 2G — adaptive bitrate encoding. We have
suggested a text-and-image course as the dramatically cheaper option that actually serves that
audience, framed as a suggestion rather than a requirement.
→ `questions.txt` §3I1.

---

### 6.2 🔴 The unlock rescission was never asked for · before Day 13

**Our omission.** We chased written rescission twice for the score-explanation change — one
sentence in PRD §4.2 — and never once for **R14, the largest reversal in the project.**

Deleting the per-candidate unlock voids PRD §2 objective 2, PRD §3 rule 6, PRD §5.3, SRS §1.14.2,
§1.14.3, §1.20.8, §2.9.6, §2.9.7, and **three acceptance criteria in SRS §2.25.2** that cannot pass
as written: unlock price and balance before confirmation, unlock reveals only authorised data,
unlock creates an audit event.

The build is right and the criteria are stale — which is exactly what a written rescission is for.
Worth saying explicitly in the ask: **the third criterion survives in substance.** Invariant 7′
logs every profile an employer opens, so the client ends up with a *larger* audit trail than the
original design, not a smaller one. That is the point a security reviewer will look for.
→ `questions.txt` §3H1.

---

### 6.3 Referral-code consent vs. "invite-and-accept" · by Day 17

PRD §3 rule 8 does not just require consent, it names the mechanism: *"given via an
invite-and-accept flow."* R16 adds a typed referral code. We believe that is better consent and
have built it that way — but *"the student typed our code"* is not the same words, and this is a
consent mechanism under DPDP. One sentence closes it.
→ `questions.txt` §3H2.

---

### 6.4 Plans, prices and the course catalogue · never asked · by Day 15

Four candidate subscription prices, employer access-period prices, college seat pricing, the course
price, the mock-interview price. Nothing is blocked — Day 15 builds the machinery against
placeholders — but placeholders cannot go live. Worth pairing with the per-candidate cost figure
from `scoring-approach.md` §12 when they land, since that is what sets the subscription margin.
→ `questions.txt` §3I2.

---

*Companion to [`plan.md`](plan.md) v6.1, [`questions.txt`](questions.txt),
[`scoring-approach.md`](scoring-approach.md) and [`resources-needed.md`](resources-needed.md).
Client quotes are verbatim from the 24 August document comments, the 27 August note, and the
27 August answer rounds.*
