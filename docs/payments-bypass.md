# Payments without a gateway

Written for: the backend team, and whoever integrates the real gateway later.
Written 2026-09-22.

**No payment gateway is chosen.** `blockers.md` **D3** — KYC with a provider is
1–2 weeks and has not started. This is how the platform runs meanwhile, so the
app teams are not blocked, and exactly what changes when a gateway arrives.

---

## 1. The short version

| | |
|---|---|
| **Configuration** | `PAYMENTS_PROVIDER=stub`, `ENVIRONMENT=dev` |
| **How a payment completes** | `POST /api/v1/billing/dev/payments/{payment_id}/simulate` |
| **What it costs to swap later** | One adapter class, one `Literal` entry, one `if` |
| **What does NOT change** | Every route, schema, database guard and test |

---

## 2. Why this is a bypass and not a mock

The important property: **the stub does not bypass the application's rules. It
bypasses the bank.**

`StubPaymentProvider` signs its callbacks with a real HMAC, and
`simulate_callback` builds the callback a gateway would send, signs it, and
feeds it through `receive_callback` → `process_callback` — the same path a real
one takes. So all of this is genuinely exercised:

- HMAC verification happens **before** the body is read or stored
- A payment is inserted `PENDING` and can only become `SUCCEEDED` with
  `signature_verified_at` set (`guard_payment_write`)
- Transitions come from `billing.domain.PAYMENT_TRANSITIONS`
- `ck_payments_settled_only_when_verified` holds at the database level
- A course purchase needs its verified payment (`guard_course_purchase`)
- Replays are refused by event id
- A discount redemption is written beside the grant, never at checkout

What is *not* exercised is the gateway's own wire format. That is the work in
§5, and it is the smallest part.

> A test that needs a paid state either settles through a signed stub callback
> or seeds `subscriptions` as the migrator. **Never by UPDATEing a payment** —
> the guard refuses it, and it would prove nothing.

---

## 3. Using it

```bash
# 1. Start a checkout (as an authenticated candidate)
curl -X POST https://HOST/api/v1/candidate/subscription/checkout \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"plan_code": "CANDIDATE_MONTHLY"}'
# -> { "payment_id": "...", "checkout_url": "https://stub-payments.invalid/..." }

# 2. Complete it
curl -X POST https://HOST/api/v1/billing/dev/payments/$PAYMENT_ID/simulate \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"outcome": "SUCCEEDED"}'
```

The entitlement is granted **synchronously** inside that second call, so this
works whether or not the outbox relay is running.

Failure paths work too, and are worth testing against:

```bash
-d '{"outcome": "FAILED", "failure_code": "PAYMENT_DECLINED"}'
```

`checkout_url` points at `stub-payments.invalid`, which does not resolve. That
is intentional: a URL that looked real would get opened.

---

## 4. The three guardrails

None of these is optional, and each exists because the simulate route is,
literally, "mark my own payment as paid".

1. **`Settings` refuses to boot.** `PAYMENTS_PROVIDER=stub` with
   `ENVIRONMENT` of `staging` or `prod` raises at construction
   (`_stub_payments_are_never_production`). The process does not start — not a
   warning, not a runtime check.

2. **The route does not exist unless the stub does.** It is registered inside
   `if get_settings().payments_provider == "stub":`, so with any other provider
   it is absent from the app and from `openapi.json`. A client generated
   against production cannot even name it.

3. **The default sells nothing.** `PAYMENTS_PROVIDER` defaults to `none`;
   `UnconfiguredPaymentProvider` answers checkout with **503** and fails every
   signature check. Forgetting to configure a gateway cannot silently give
   things away.

---

## 5. Adding the real gateway

### 5.1 What to write

Implement `PaymentProvider` (`app/modules/billing/provider.py`) — six methods:

```python
class RazorpayPaymentProvider:          # or whichever
    name = "razorpay"

    def verify_signature(self, *, body: bytes, signature: str | None) -> bool: ...
    async def create_order(self, *, payment_id, amount_minor, currency) -> ProviderOrder: ...
    async def register_mandate(self, *, subscription_id, max_amount_minor, valid_until) -> ProviderMandate: ...
    async def notify_pre_debit(self, *, mandate_ref, amount_minor, debit_on) -> str: ...
    async def request_mandate_debit(self, *, mandate_ref, payment_id, amount_minor) -> str: ...
    async def revoke_mandate(self, *, mandate_ref) -> None: ...
```

Then three one-line changes:

```python
# app/settings.py
payments_provider: Literal["none", "stub", "razorpay"] = "none"

# app/modules/billing/provider.py, get_payment_provider()
if settings.payments_provider == "razorpay":
    return RazorpayPaymentProvider(...)
```

And a `_model_validator` requiring its key, matching the pattern the OpenAI and
Sarvam providers already use — a provider chosen without its credential fails
every call at runtime, with the payment sitting PENDING and nothing saying why.

### 5.2 The callback shape

`billing.domain.parse_callback` expects this, and is strict — a field it does
not recognise the shape of is a field it would have to guess at, and the guess
would decide whether somebody paid:

```json
{
  "event_id": "evt_...",
  "event": "payment.succeeded",
  "payment": {
    "provider_ref": "order_...",
    "amount_minor": 49900,
    "currency": "INR",
    "failure_code": null
  }
}
```

Real gateways do not send this. **Translate in the adapter** rather than
loosening `parse_callback` — the strictness is the point, and the normalised
shape is what every downstream guard is written against.

`event` must be one of `billing.domain.PAYMENT_EVENTS` / `MANDATE_EVENTS`.

### 5.3 What you do NOT touch

No route, no schema, no migration, no database guard, no entitlement logic, no
test of any of those. If a gateway integration is changing those, something has
been misunderstood.

### 5.4 Switching over

```bash
PAYMENTS_PROVIDER=razorpay
PAYMENTS_WEBHOOK_SECRET=<from the gateway console>
ENVIRONMENT=staging      # or prod
```

`ENVIRONMENT` moving off `dev` is what removes the simulate route. Point the
gateway's webhook at `POST /api/v1/billing/callbacks/razorpay`.

Note the ordering: the route **verifies and stores**, and a task **settles**.
So the relay must be running in production (it is — `app/tasks/schedule.py`,
every 30s), or payments verify and never grant.

---

## 6. Two open decisions this leaves

Both in `blockers.md`, both the client's:

- **E16** — a UPI mandate may auto-debit only up to RBI's limit, so
  registration refuses a plan priced above `mandate_max_amount_minor`
  (config, ₹15,000). That currently excludes employer annual (₹47,999) and
  every college plan. **Confirm with the chosen gateway**; card or net-banking
  e-mandates may have different limits.
- **E18** — there is **no refund flow**. `REFUNDED` exists as a payment status
  and nothing writes it. Cancellation stops renewal at period end with no
  refund. The policy is the client's to set before the first paying customer.

---

## Related

- [`aws-deployment.md`](aws-deployment.md) §4.2
- [`blockers.md`](blockers.md) — D3, E16, E18, E36
- `app/modules/billing/provider.py`, `domain.py`, `service.py`
- `backend/tests/integration/test_payments.py` — signed-callback helpers
