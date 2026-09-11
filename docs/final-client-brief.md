# BharatPath — everything outstanding

## 1. The two we need to raise properly

### A. One month's payment now buys your entire candidate database

*We need a written "yes, we understand" before we build this.*

This is not us objecting to your design. We will build exactly what you asked for. But
two of your decisions combine into something we do not think anyone has looked at
together yet, and we are not willing to build it quietly.

**Decision one — your answer on KYB.** An employer signs up and is approved
automatically. Nobody checks that the business is real. There is no verification step.

**Decision two — your answer on employer payment.** An employer pays once, and for that
period they can view every student in the whole database. Names, phone numbers, email
addresses. All of them.

**Put together:** anyone with a payment card can pay for one month and obtain the
complete contact details of every candidate on your platform. Nobody will have checked
who they are. And those candidates paid you to be there.

Why this is worse than it sounds:

- Your candidates are paying customers. Their contact details being sold on is the kind
  of thing that ends a consumer platform's reputation.
- Under the DPDP Act, you are responsible for what happens to that data. A competitor, a
  recruitment agency or a spammer paying one month's fee to extract your whole database
  is a foreseeable outcome, not bad luck.
- It only has to happen once, and it cannot be undone.

**What we are building to reduce it:** daily and hourly caps on how many candidates one
employer can view; rate limits on search and profile pages; alerts to your admin team
when an employer's viewing looks like scraping; no bulk download, no CSV export, no easy
way to page through everyone.

**What we want to be honest about:** these are speed bumps. They make extraction slow and
noisy. They do not make it impossible. The actual fix is checking that employers are real
businesses before giving them the database, and that is the step you have turned off.

**What we need — either:**

- **(a)** "Yes, we understand, proceed" — in writing, and we build it as asked with the
  controls above; or
- **(b)** Turn business verification back on for employers. The switch is already built.
  This changes nothing else about your pricing or your model.

We would gently suggest (b), because it costs you very little — you already asked us to
build the approval mechanism — and it removes most of this. But it is your platform and
your decision, and either answer is fine as long as it is a decision rather than an
oversight.

### B. Who is making the course?

Your platform sells one course. Buying and completing it adds 30 points to a student's
score. It is a third of everything a student can do to improve their number, and it is a
thing they pay for.

Nobody has said who makes it.

We are building the machine that sells it, tracks it, and moves the score when it is
finished. We are not making the course, and making it is not in any price we have quoted
you. Producing course video is its own project with its own budget, its own timeline and
usually its own people.

We need four answers, and the fourth is the one that touches our code:

1. Who produces it? You, us as a separate piece of work, or a third party?
2. Roughly how long is it, and what format — video, text, a mix?
3. When would it realistically exist?
4. **What counts as completing it?**

Question 4 is not a content question, it is a rule we have to write down. "Watched every
video to the end"? "Scored above X on a quiz"? "Clicked the button that says I have
finished"? Whatever you choose becomes the moment a student's score goes up by 30, so it
needs to be something we can actually detect, and something a student cannot trivially
fake.

One thing worth knowing before you answer: your students are on cheap Android phones on
slow connections — you told us that yourself, and it is one of the firmest requirements in
your documents. Video is by far the heaviest thing on this platform. Delivering it well to
that audience is real work that nobody has costed. A course that is mostly text and images
would be dramatically cheaper to build, cheaper to run, and would actually work for the
students you are targeting. That is a suggestion, not a requirement — but if video is
fixed in your mind, tell us now rather than in week three.

---

## 2. Our answers to the two things you asked us

### C. What is stuck because the onboarding form fields are not ready?

Short answer: nothing is stuck. You have time.

Nothing is blocked because we can build the forms to be configuration-driven — the fields
are data, not code. Adding your actual fields later is filling in a list, not rebuilding a
screen. One thing helped here: because you have decided there are no employer pricing
tiers, the employer type and industry fields no longer affect what anyone pays. That was
the part that would have been expensive to change late. It is gone.

| When the fields arrive | What it costs |
|---|---|
| Within 2 weeks | No rework at all. Ideal. |
| 2 to 4 weeks | Minor rework. We will have guessed at some field types and a few guesses will be wrong. |
| After 4 weeks | Real rework. Employer and college screens will have been built and tested against placeholder fields; admin filters and search need revisiting. |
| Not before launch | Blocking. You cannot launch an employer portal with placeholder onboarding fields. |

**What we need, whenever it is ready — three separate lists:** employer onboarding form
fields (and which are mandatory); KYB form fields (you confirmed this form stays, so we
need its contents); college onboarding form fields. Plus the two enumerated lists we asked
for earlier: employer types (is it just MNC and non-MNC, or more?) and the industry list.
You do not need to send these all at once. The employer one is needed first.

### D. Should college seats be tiered, or a one-time payment for X students?

**Our recommendation: one payment per period, covering up to a set number of students. Not
tiers.**

- It matches what you just chose for employers. You said no tiers there, for good reasons.
  Colleges having a different billing shape means building and maintaining two systems
  instead of one.
- Tiers create edge cases that cost real time: what happens mid-period when a college
  outgrows its tier, do they get a refund on downgrade, is the upgrade prorated. A seat
  allowance has one rule instead.
- You can still price differently per college. "500 seats, annual" and "2000 seats,
  annual" are two entries in a price list, not two systems. You keep all the commercial
  flexibility without the engineering cost.

**Which leaves one question we still need answered.** When a college with 500 seats tries
to add the 501st student, what should happen?

- **(a) Block it. They must buy more seats first.** ← our suggestion
- (b) Allow it, and bill them for the overage later.
- (c) Allow it, but only show analytics for 500.

We suggest (a) because it is the only one of the three that cannot produce a surprise
invoice, and surprise invoices to institutional customers become long email threads.

---

## 3. Four sentences we need on paper

These are not new decisions. You have already made them. We just do not have them written
down against the documents they change, and those documents are what the build gets marked
against at the end.

### E. The unlock requirement is withdrawn

When you told us employers pay once and see the whole database, we were so pleased with
the simplification that we got on with building it. What we did not do is what we did for
every smaller change: ask you to confirm in writing that the old requirement is withdrawn.

It matters more here than anywhere else, because your own specification describes the old
way in a lot of places, including five items on the acceptance checklist your
specification says the build will be tested against. Three of those five are simply
impossible now:

- "Unlock displays price and remaining balance before confirmation"
- "Successful unlock reveals only authorised data"
- "Unlock creates an audit event"

There is no unlock, so there is no price to display and no balance to show.

We are not asking you to change your mind. Your decision was a good one and we have built
it. We are asking you to confirm the old requirement is withdrawn, so that nobody opens
the specification in three months and reports the missing feature as a defect.

One useful note for whoever reviews this: the third item above — every reveal being logged
— **is** still true. We kept it. Because you now see the whole database, there is no single
unlock moment to log, so instead we write a log entry every single time an employer opens
a candidate's profile. You end up with more of an audit trail than the original design
would have given you, not less.

> **We need:** "The unlock requirement is withdrawn; employers get period-based access to
> the full database instead."

### F. The score is never explained

Your requirements promise the candidate a category-by-category breakdown of their score
plus suggestions for improving it. You have told us the score is never explained. We need
the old requirement formally withdrawn.

And the knock-on: your requirements also say that when a candidate views a job they do not
qualify for, the app tells them "what would need to improve". That is an explanation too.
We are building a generic message instead — "your score does not meet this employer's
requirement", with no reason given.

> **We need:** both confirmed, in a sentence.

### G. The referral code is an accepted consent mechanism

Your specification says a student consents to their college seeing them "via an
invite-and-accept flow" — the college invites, the student accepts. Your referral code is a
second way of doing it: the college generates a code, the student types it into the app.
We think that is genuinely better consent than clicking a link in a text message, because
the student has to go and do something deliberate. We have built it that way.

But "the student typed our code" is not the same words as "invite and accept", and this is
a consent mechanism under the data protection law, so it is worth having your yes on paper
rather than ours.

To be clear about what the code does and does not do: entering it links the student to the
college roster and lets the college count them in statistics. It does **not** let the
college see that student's individual data. That stays a separate permission the student
gives afterwards, exactly as your specification requires.

> **We need:** "The referral code is an accepted consent mechanism alongside
> invite-and-accept."

### H. Duplicate CV detection is dropped

You said you would confirm once more that this feature is dropped. We are treating it as
dropped, but not deleting the underlying capability, so reversing costs little. Just let us
know when you have confirmed it.

---

## 4. Legal — these have review cycles, so they need starting

### I. Data deletion policy — we need a date, not just an answer

You said you will discuss and come back. That is fine, but this one has a lawyer in the
loop, and lawyers take weeks rather than days. We need it by roughly week four of the
build, which means the conversation needs to start within the next week or so.

Could you tell us when you expect to have it? A date is more useful to us than the answer
arriving early.

The question is: when a candidate asks you to delete their data, which parts are erased
permanently, which are kept but anonymised, and how long do payment records and audit
records survive? These pull against each other and it is a legal call, not an engineering
one.

**What we have done in the meantime:** we track the request and its due date, and we have
deliberately **not** built the deletion itself. Implementing a cascade under a guessed
policy would destroy data we cannot get back.

### J. Can candidate CV data be processed outside India?

This needs your lawyer, and it decides which technology we build the scoring engine
against. We cannot pin the inference geography of the managed AI service to a region, so
the answer changes the design rather than a setting.

### K. Please have counsel re-review the score itself

Your requirements already ask for written counsel sign-off on the three-digit score,
because a number like that shown to Indian consumers resembles a credit score. **Three of
your recent decisions change the shape of that risk:** paid add-ons now move the score,
the score sits behind a paywall, and the candidate is never told how it was reached.

An unexplained three-digit score that rises when you pay is close to the worst possible
shape for the concern that rule exists to prevent. "Pay us and your score goes up" is a
materially different thing to defend than "here is your score, free." Any sign-off given
against the old design was given against a different product.

Ask counsel to re-review **before** we build the scoring engine, not after. It costs a day
now and a rewrite later.

---

## 5. What we have assumed in the absence of an answer

**This section is new.** Everything above is a question we have asked you. This is the
other side of it: where an answer has not arrived, we have not stopped — we have made a
choice, written it down, and kept building. Each one below is a decision that is currently
ours rather than yours. **Tell us if any is wrong.** Otherwise we proceed as described.

### 5.1 Decisions we took on your behalf

**KYB approval is automatic — and this decision is ours, not yours.** On 24 August you
told us "manual, uploading will be there but manual". On 27 August you told us "KYB won't
be there, automatic approval." Three days apart, opposite answers. We took the decision
ourselves: build the verification state machine, the publishing gate and the database
trigger in full, and default automatic approval to **on**. Switching verification back on
is a configuration change, not a rebuild. This is the upstream half of §1A — it is why
anyone who can pay can reach the whole database. **This is the single most important line
in this document to confirm or correct.**

**College seats are a per-period allowance, not tiers.** Our recommendation in §2D, built
on that basis while we await your answer on the 501st student.

**Typing the referral code is consent.** It is a deliberate action the student took, so we
treat it as better consent than clicking a link in a text message.

**The referral code does not grant data access.** It links the student to the college
roster and lets the college count them in statistics. Seeing an individual student's data
remains a separate, explicit permission the student gives afterwards. Your own requirements
ask for those two to be separate, and a single code should not quietly grant both.

**Manual renewal is built before UPI AutoPay.** Both are in scope and both are being built.
We are doing manual first so that if the mandate work runs long it does not delay your
launch. No decision needed — we are telling you the order.

**Onboarding forms are configuration-driven.** Fields are data, not code, which is what
makes the timeline in §2C possible.

**Prices are placeholders.** Every price in the system is a real, working number that is
not yours. Swapping yours in is editing a price list. Placeholder prices cannot go live.

**The scoring engine implements the structure, not the numbers.** Base plus bounded
contributions, clamped to the ceiling. Your arithmetic closes exactly — 700 base + up to
200 for the CV + 30 for the course + 60 for interviews = 990 — so only the weights inside
the 200-point band change when the real algorithm arrives.

**Payment, subscription and verification gates are written but not yet connected.** The
checks exist and currently refuse everything; they are wired to real data in Weeks 2 and 3.
This is deliberate sequencing, not an omission.

### 5.2 Assumptions the four-week schedule depends on

The schedule holds only if these are true. They are worth stating plainly because if one of
them fails, the date moves and it will not be obvious why.

1. **AI-assisted generation across the whole codebase.** Twenty modules with an identical
   shape, the CRUD layers, the schemas, the migrations and the first draft of every test
   suite. This is where the speed comes from.
2. **Most external vendors stay stubbed** behind interfaces. Payments, business
   verification and speech-to-text are not integrated inside the four weeks — their lead
   times exceed the sprint on their own. Twilio is the exception.
3. **The scoring engine stays a placeholder** until the real algorithm arrives.
4. **Infrastructure is provisioned and ready by Day 1**, including the authentication pools
   and their triggers. A day lost waiting on infrastructure is a day lost from the sprint,
   and there is no slack in it.
5. **The blocking questions in this document are answered by Day 8.**
6. **Full-time, uninterrupted work.** No parallel meetings eating build days.

### 5.3 What four weeks buys, and what it does not

**Delivered at the end of Week 4:** a code-complete backend — every endpoint, the full
schema, all state machines, every invariant enforced and tested, the API contract
published, running against stubs. A real, demonstrable, integration-ready system.

**Not delivered, and needs Week 5 onward:** vendor integrations as credentials arrive, load
testing and performance tuning, penetration testing, translated content, the real scoring
algorithm, and operational runbooks.

**The backend is code-complete in four weeks; it is launchable when the external
dependencies land. Those are two different dates.**

---

## 6. What we need you to start now

Not because we are waiting on them today, but because several take longer than the entire
build.

| What | Lead time | Who | Why it cannot wait |
|---|---|---|---|
| **TRAI DLT registration** | **2–4 weeks** | You | **Longer than the whole build.** Without it, SMS to Indian numbers silently fails. Twilio does not remove this — it binds the sender, not the gateway. |
| **Course content** | **Unknown — unscoped** | You | See §1B. The largest unlisted dependency in the project. |
| Apple Developer account (organisation) | 1–3 weeks | You | Needs a D-U-N-S number, which is a separate application first. |
| Payment gateway KYC | 1–2 weeks | You | Blocks all revenue. **Must be confirmed to support recurring billing.** |
| Legal review of the score | Weeks | Your counsel | See §4K. |
| Production email access | 3–7 days | Infrastructure | Reviewed manually; vague requests get rejected. Apply early. |

**And the answers with dates attached:** the calibration corpus — **50 to 100 real CVs with
a rough sense of what each should score** — is needed before we build the scoring engine.
Without it the weights are invented rather than calibrated. This is a working session, not
an email, and it needs a diary entry.

**Your prices**, for the same reason: the four student subscription prices, the employer
access prices, college seat pricing, the course price, and the price of one mock interview
session.

**Your languages:** your documents say English, Hindi and six to eight Indian languages at
launch. We need to know which, and who is paying for translation. We build the plumbing —
every piece of text comes out of a file rather than being baked in — but somebody has to
write the words. This also affects the SMS templates you are registering with the telecom
regulator, so it is worth deciding before that registration is finalised rather than after.

**Infrastructure for Day 1** is a separate checklist of thirteen items in
[`resources-needed.md`](resources-needed.md) §1. The one to chase first is **Twilio test
credentials** — they unblock real authentication work rather than a stub.

---

## 7. One thing about the schedule

**The recent scope changes have not been re-cut into the twenty-day plan.** Your changes of
27 August remove roughly a day and a half of work and add four to six days.

| Comes out | Goes in |
|---|---|
| Anonymous access and the claim transaction | Composite scoring: contributions, caps, rescore triggers |
| Business verification review queue | Subscription billing: plans, periods, renewal, cancellation |
| Duplicate-resume detection | Courses: catalogue, purchase, completion |
| Verification vendor integration | College seats, employer classification, nudges |

The additions concentrate on the three days the plan already named as the ones that will
not compress — the scoring day, the access-window day and the billing day. **That is the
schedule risk in one sentence.**

The scope in the plan is current. The schedule is not. **Please do not quote a date off the
old one** — we would rather re-baseline it with you than have a date in circulation that we
know is stale.

One related note for whoever reviews the build at the end: your PRD and SRS still describe
the original design, and several things we are now building deliberately contradict them.
Every one of those is a decision you made, recorded in
[`answers-log.md`](answers-log.md) with the date. A contradiction between the code and the
specification is usually a decision, not a defect — but §3 above exists because two of them
are not yet written down.

---

## 8. Now closed — no reply needed

Everything here is answered and built into the plan.

- **Pay first**, for students, employers and colleges alike. Sign-up creates an account;
  everything else needs payment.
- **Employers pay once per period and see the whole database.** No tiers, no per-candidate
  unlocking. This deleted a large and genuinely difficult piece of the system — it was one
  of the four hardest days in the schedule and most of it is now gone. Thank you, that was
  a good simplification.
- **The KYB form stays, approval is automatic**, and we build the approval mechanism with a
  switch to turn it on. (The provisional half of this is §5.1.)
- **Employers get the portal on signup but can do nothing until they pay.** Two separate
  gates, so you can change one without the other.
- **Colleges link existing students with an auto-generated referral code** the student
  enters, alongside the existing invite flow for students without an account.
- **Subscriptions:** the user chooses manual renewal or UPI AutoPay. Both in scope.
- **Paid add-ons increase the score.** Confirmed.
- **The score arithmetic works out exactly:** 700 + 200 + 30 + 60 = 990.
- **The score is never explained to the candidate.** (The written rescission is §3F.)
- **Interviews are recorded, not a live call.** Confirmed twice.
- **The scoring approach document was approved on 30 August.** Thank you.

### On UPI AutoPay, since you asked whether there were issues

No blocking issues. Two things worth knowing.

**It is two systems, not one.** Manual renewal and automatic renewal are separate payment
flows and both need building, testing and supporting. Offering the choice is a real
feature, not a checkbox.

**Automatic UPI renewal has rules that surprise people.** Each customer sets up a mandate
individually. There is a maximum amount fixed when they set it up. You have to notify the
customer before every single charge. And they can cancel the mandate inside their own UPI
app without telling you — so your system finds out only when a payment fails. We are
handling all of it.
