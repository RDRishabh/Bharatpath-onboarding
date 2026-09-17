# 08 — Payments, Subscriptions & Courses: input/output reference

Three modules, one underlying idea: **nothing is ever granted by an API
response.** A checkout call only ever returns "here's where to pay" — the
actual subscription, course access, or interview session only becomes real
later, when a signed callback from the payment gateway is processed. This
doc covers `billing` (3 endpoints), `subscriptions` (5 endpoints × 3
audiences = 15), and `courses` (2 endpoints) — 20 endpoints in total.

---

## 0. The big picture — checkout, callback, settle: three separate moments

```
1. CANDIDATE/EMPLOYER/COLLEGE calls a checkout endpoint
   (POST .../subscription/checkout, or POST /candidate/courses/{id}/checkout)
        │
        ▼
   A `payments` row is created, state PENDING.
   Response: a `redirect_url` — where to send the payer to actually pay.
        │
        ▼
2. App sends the user to `redirect_url`. They pay on the gateway's own page.
   Our backend is NOT involved in this step at all.
        │
        ▼
3. THE GATEWAY calls US, server-to-server, independently of the user's browser:
        POST /billing/callbacks/{provider}
        (signed, no user token — a payment gateway cannot hold one)
        │
        ▼
   Verified and stored immediately. An event fires; a background worker
   actually settles it — moves `payments.status` to SUCCEEDED, and THAT is
   what grants the subscription / course / session.
        │
        ▼
4. App polls: GET /billing/payments/{payment_id}
   until status is no longer PENDING.
```

**Why a redirect back to your app after payment proves nothing, and why you
must poll instead:** a gateway's redirect is just the browser bouncing back
— it can be spoofed, skipped, or lost (the user closes the tab). The only
thing that's actually trustworthy is the gateway's own signed server-to-
server callback. So the UI pattern every checkout in this product follows
is the same: **checkout → redirect to pay → poll `GET
/billing/payments/{payment_id}` → show success once `status: SUCCEEDED`.**

### Why the callback route has no auth, and why that's not a hole

`POST /billing/callbacks/{provider}` is genuinely public — no
`Authorization` header at all. That's correct, not an oversight: a payment
gateway's server can't hold one of *our* user tokens. Instead, it signs the
raw request body with an HMAC secret only it and we share
(`X-Payment-Signature` header), and **that signature is checked before a
single byte of the body is parsed or written anywhere** — a forged callback
costs us one failed HMAC check and leaves no trace in the database at all.

### `PAYMENTS_PROVIDER` — how this works without a real gateway in dev/test

In local dev and CI, `PAYMENTS_PROVIDER=stub`. The default,
`PAYMENTS_PROVIDER=none`, makes every checkout endpoint answer `503` — no
gateway configured, nothing to redirect to. `Settings` **refuses to boot
with the stub provider in staging or production** — the same shape of
safety rail as `AUTH_ALLOW_LOCAL_TOKENS`. With the stub active, one extra
endpoint exists (§4) to simulate a gateway's callback without needing a real
one.

---

## 1. `GET /billing/payments/{payment_id}` — check a payment's status

**Auth required:** any valid token (candidate or business) — but only for
**your own** payment. `404` for someone else's, never `403`.

**Request:** no body, `payment_id` in the path.

**Response** — `200 OK` (`PaymentResponse`):
```json
{
  "id": "9f2e...",
  "status": "PENDING",
  "purpose": "SUBSCRIPTION",
  "item_code": "EMPLOYER_QUARTERLY",
  "amount_minor": 999900,
  "currency": "INR",
  "failure_code": null,
  "created_at": "2026-09-17T10:00:00Z",
  "settled_at": null
}
```
`status` is one of `PENDING` / `SUCCEEDED` / `FAILED` / `REFUNDED`. **This is
the endpoint every checkout flow polls** — there's no webhook or push to the
frontend, so the app is expected to call this every couple of seconds after
redirecting the user to pay, until `status` moves off `PENDING`.

---

## 2. `POST /billing/callbacks/{provider}` — the gateway tells us what happened

**Auth required: none.** Public route, by design (see §0). Instead of a
bearer token, it requires:
```
X-Payment-Signature: <HMAC-SHA256 of the raw body>
```

**Request body:** whatever shape the specific gateway (`{provider}` in the
path) sends — this route reads it as raw bytes first, verifies the
signature against those exact bytes, and only *then* parses it as JSON.

**Response** — `200 OK` (`CallbackAck`):
```json
{ "received": true, "duplicate": false }
```
`duplicate: true` when this exact event was already received before — the
gateway is told `200` either way (a `retry me` response would just make it
send the same callback again forever), but nothing changes on a repeat.

**What actually happens in this call: verify, store, and enqueue —
nothing more.** No entitlement is granted here. The route:
1. Verifies the signature.
2. Parses and validates the payload shape.
3. Stores the raw callback (kept as evidence — a later payment dispute is
   answered from exactly what the gateway sent, not from our interpretation
   of it).
4. Fires an internal event (`billing.callback_received`).

**Errors:**
| Code | When |
|---|---|
| `401` | Signature missing or doesn't match |
| `404` | `{provider}` isn't the one this deployment is configured for |
| `422` | Body doesn't parse into a recognisable callback shape |
| `413` | Body too large |

### What happens after this call returns — a background worker settles it

The `billing.callback_received` event routes (via `app/tasks/routing.py`,
the same routing table from the resume-confirm doc) to a background task
that actually applies the outcome: moves the `payments` row to `SUCCEEDED`
or `FAILED`, and **only on success**, grants whatever was bought — activates
the subscription period, marks the course purchased, etc. This is why the
route itself is described as granting nothing: by the time this HTTP
response has been sent, the actual grant hasn't happened yet — it happens
moments later, off the request entirely.

---

## 3. `POST /billing/dev/payments/{payment_id}/simulate` — dev/test only

**This route doesn't exist unless `PAYMENTS_PROVIDER=stub`** — same
"genuinely absent, not just refused" pattern as `/auth/dev/token`.

**Auth required:** the payment's own owner.

**Request body** (`SimulatePaymentRequest`):
```json
{ "outcome": "SUCCEEDED" }
```
or
```json
{ "outcome": "FAILED", "failure_code": "insufficient_funds" }
```

**Response** — `200 OK`, the updated `PaymentResponse`:
```json
{
  "id": "9f2e...",
  "status": "SUCCEEDED",
  "purpose": "SUBSCRIPTION",
  "item_code": "EMPLOYER_QUARTERLY",
  "amount_minor": 999900,
  "currency": "INR",
  "failure_code": null,
  "created_at": "2026-09-17T10:00:00Z",
  "settled_at": "2026-09-17T10:02:00Z"
}
```
(`status: "FAILED"` and `failure_code` set, `settled_at: null`, if you sent
`"outcome": "FAILED"`.)

**What it does under the hood:** signs a callback exactly the way the real
stub gateway would, and runs it through the **exact same** verify → store →
settle path as §2 — this isn't a shortcut that skips logic, it's a way to
drive the real logic without a real gateway sitting in AWS somewhere.

---

## 4. Subscriptions — the same 5 endpoints, mounted three times

**Why one set of code serves three different URL prefixes:** a subscription
always belongs to *somebody* — a candidate's own, or an organisation's — so
these routes are mounted under `/candidate/subscription`,
`/employer/subscription`, and `/college/subscription`, built from one
shared implementation with per-audience role guards. **Reading is
open to more roles than buying is:**

| Audience | Who can **read** (`GET`) | Who can **buy/cancel/set-up-renewal** |
|---|---|---|
| Candidate | `CANDIDATE` | `CANDIDATE` (same person — no "org" above them) |
| Employer | Owner, Recruiter, Viewer | **Owner only** |
| College | Admin, Staff | **Admin only** |

The reasoning stated in the code: an organisation's money is its owner's to
spend, not its staff's — a recruiter can *see* what plan the company is on,
but can't buy or cancel it.

### `GET /{candidate,employer,college}/subscription/plans` — what's for sale

**Auth required:** the "read" role for that audience, from the table above
(any employer/college role reads; a candidate reads their own).

**Request:** no body.

**Response** — `200 OK`, array of `PlanResponse`:
```json
[{ "code": "EMPLOYER_QUARTERLY", "audience": "EMPLOYER", "period": "QUARTERLY", "months": 3, "price_minor": 999900, "currency": "INR", "seat_allowance": null }]
```
Only plans matching *this* audience — a candidate never sees employer
plans and vice versa. `seat_allowance` is only meaningful for `COLLEGE`
plans (how many student seats it buys).

### `GET /{candidate,employer,college}/subscription` — the current state

**Auth required:** the "read" role for that audience (same as `/plans`).

**Request:** no body.

**Response** — `200 OK` (`SubscriptionResponse`):
```json
{
  "state": "ACTIVE",
  "has_access": true,
  "plan_code": "EMPLOYER_QUARTERLY",
  "period": "QUARTERLY",
  "current_period_start": "2026-09-01T00:00:00Z",
  "current_period_end": "2026-12-01T00:00:00Z",
  "cancel_at": null,
  "renews_automatically": true,
  "mandate_state": "ACTIVE"
}
```
`state` is one of `NONE` / `PENDING` / `ACTIVE` / `GRACE` / `LAPSED` /
`CANCELLED`. **`has_access` is the field that actually matters for gating
everything else** — `GRACE` (an auto-renewal payment is being retried) still
has `has_access: true` right up to `current_period_end`, so a momentary
retry doesn't lock anyone out mid-grace.

### `POST /{...}/subscription/checkout` — buy a period

**Auth required:** the "buy" role for that audience (Owner / College Admin
/ the candidate themselves — **not** a Recruiter, Viewer, or College Staff).

**Request body** (`SubscriptionCheckoutRequest`):
```json
{ "plan_code": "EMPLOYER_QUARTERLY" }
```

**Response** — `201 Created` (`CheckoutResponse`):
```json
{ "payment_id": "9f2e...", "status": "PENDING", "amount_minor": 999900, "currency": "INR", "redirect_url": "https://gateway.example.com/pay/..." }
```
**Nothing is granted here** — see §0. Calling checkout twice for the same
plan/price within a short reuse window returns the **same** pending payment
rather than opening a second one (so a user who double-clicks "pay" doesn't
end up with two competing checkouts for the same thing).

**Errors:**
| Code | When |
|---|---|
| `403` | Caller has the read role but not the buy role for this audience |
| `404 plan_not_found` | `plan_code` doesn't exist, or isn't sold to this audience |

### `POST /{...}/subscription/cancel` — stop auto-renewing

**Auth required:** the "buy" role for that audience (same as checkout).

**Request:** no body.

**Response** — `200 OK`, updated `SubscriptionResponse`, now with
`cancel_at` set. **Access continues to the end of what was already paid
for** — cancelling doesn't cut anyone off mid-period, it just stops the
*next* renewal from happening. Idempotent — cancelling an already-cancelled
subscription just returns the same state.

**Errors:**
| Code | When |
|---|---|
| `409 subscription_not_active` | There's no live subscription to cancel at all (e.g. `state: "NONE"` or already `LAPSED`) |

### `POST /{...}/subscription/mandate` — set up automatic renewal (UPI AutoPay)

**Auth required:** the "buy" role for that audience (same as checkout/cancel).

**Request:** no body.

**Response** — `201 Created` (`MandateResponse`):
```json
{ "state": "PENDING", "max_amount_minor": 999900, "valid_until": "2027-09-01T00:00:00Z", "authorisation_url": "https://gateway.example.com/mandate/..." }
```
`state` stays `PENDING` (renewal stays **manual**) until the payer actually
approves the mandate in their own UPI app at `authorisation_url` — this
endpoint only starts that process, it doesn't complete it. A separate
gateway callback (`MANDATE_ACTIVATED`, handled the same way as a payment
callback) is what flips it to `ACTIVE`. `max_amount_minor` is **fixed at
registration to the plan's current price** — if the plan's price rises
later, the mandate is never silently allowed to debit more than the payer
originally authorised; the subscriber falls back to manual renewal instead.

**Errors:**
| Code | When |
|---|---|
| `409 subscription_not_active` | No live subscription to attach a mandate to, or its period has already ended |
| `409 subscription_cancelling` | Subscription is already set to cancel — no point auto-renewing something ending on purpose |
| `409 mandate_exists` | An open mandate already exists for this subscription |
| `422 mandate_amount_over_limit` | The plan's price exceeds the configured per-mandate ceiling |

---

## 5. `GET /candidate/courses` — the catalogue

**Auth required:** `CANDIDATE` role + active subscription (a course is
itself a tool that's gated behind having already subscribed).

**Request:** no body.

**Response** — `200 OK`, array of `CourseResponse`:
```json
[{ "id": "...", "code": "INTERVIEW_PREP_101", "title": "Interview Preparation", "price_minor": 49900, "currency": "INR", "purchased": false, "completed": false }]
```
`purchased` and `completed` are **per this specific candidate** — the same
list endpoint doubles as "what's on sale" and "what have I already bought
and finished."

## 6. `POST /candidate/courses/{course_id}/checkout` — buy one

**Auth required:** `CANDIDATE` + active subscription.

**Request:** no body, `course_id` in the path.

**Response** — `201 Created` (`CheckoutResponse`), identical shape to the
subscription checkout in §4. Same rule: **nothing is granted by this call**
— `purchased` only becomes `true` once the gateway callback settles.

**Errors:**
| Code | When |
|---|---|
| `404 course_not_found` | Bad `course_id` |
| `409 course_already_purchased` | Already owns this course — nothing to buy again |

### Why there's no "mark this course completed" endpoint

Worth calling out because its absence is deliberate, not a gap: a course
completion is written **only** by `courses.service.record_completion`,
callable only as `SYSTEM` or `PLATFORM_ADMIN` — never through any HTTP
route a candidate or even an employer could reach. If a candidate could
call an endpoint to mark their own course "done," the +30 points it awards
toward the score would be self-certified — exactly the kind of thing the
whole scoring design (Layer 1 model / Layer 2-3 code split, from
[04](04-resume-and-scoring-apis.md)) exists to prevent happening anywhere
in the system.

---

## Quick reference: who's a "buyer" vs a "reader"

| | Candidate | Employer | College |
|---|---|---|---|
| Read subscription / plans | `CANDIDATE` | Owner, Recruiter, Viewer | Admin, Staff |
| Buy / cancel / mandate | `CANDIDATE` | **Owner only** | **Admin only** |
| Courses | `CANDIDATE` only (no employer/college equivalent) | — | — |
