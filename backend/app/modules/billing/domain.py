"""billing - pure domain logic

Payments, entitlements, signed callbacks.

No I/O. No database, no HTTP, no clock, no randomness that is not passed in.
mypy runs in strict mode here and import-linter forbids I/O imports, because
this is the layer the invariant property tests exercise directly.

**Three rules live here, and each has a twin below the service:**

  1. **A callback counts only if its signature verifies** (`signature_matches`).
     The gateway signs the raw body with a secret we share; a browser redirect,
     a query parameter or a JSON body without that signature is somebody's
     claim that they paid, and grants nothing (PRD section 8).
  2. **A payment moves along `PAYMENT_TRANSITIONS` and nowhere else.** The same
     set is compiled into `guard_payment_write` in the baseline migration, as
     `allowed_transitions()` is for the hiring pipeline, so the two cannot drift.
  3. **A verified success is never taken back by a later failure.** Gateways
     deliver out of order; UPI in particular reports a late success after a
     timeout was reported as a failure. So FAILED -> SUCCEEDED is allowed and
     SUCCEEDED -> FAILED is not.
"""

from __future__ import annotations

import hashlib
import hmac
from dataclasses import dataclass
from typing import Final, Literal

Purpose = Literal["SUBSCRIPTION", "COURSE", "MANDATE_DEBIT"]

#: What a payment can be for. The mock-interview session joins this on Day 16.
PURPOSES: Final[tuple[Purpose, ...]] = ("SUBSCRIPTION", "COURSE", "MANDATE_DEBIT")

#: Paise, always. No other currency is sold.
CURRENCY: Final = "INR"

#: `from -> to` for `payments.status`. Compiled into the database guard.
PAYMENT_TRANSITIONS: Final[frozenset[tuple[str, str]]] = frozenset(
    {
        ("PENDING", "SUCCEEDED"),
        ("PENDING", "FAILED"),
        # A late success after a reported failure. UPI does this.
        ("FAILED", "SUCCEEDED"),
        # No refund flow is built: the refund policy is the client's decision.
        # The transition exists so recording one later is not a migration.
        ("SUCCEEDED", "REFUNDED"),
    }
)

#: The four callbacks a gateway sends us.
PAYMENT_SUCCEEDED: Final = "payment.succeeded"
PAYMENT_FAILED: Final = "payment.failed"
MANDATE_ACTIVATED: Final = "mandate.activated"
MANDATE_REVOKED: Final = "mandate.revoked"
PAYMENT_EVENTS: Final = frozenset({PAYMENT_SUCCEEDED, PAYMENT_FAILED})
MANDATE_EVENTS: Final = frozenset({MANDATE_ACTIVATED, MANDATE_REVOKED})

#: Debit failures that mean the mandate itself is gone, not that this debit
#: failed. **A payer can revoke a mandate inside their own UPI app and nobody
#: tells us**; the first we hear of it is one of these on the next debit. They
#: move the mandate to REVOKED_UNKNOWN and the subscriber back to manual
#: renewal, rather than being retried until access lapses.
MANDATE_GONE_FAILURE_CODES: Final = frozenset(
    {"MANDATE_REVOKED", "MANDATE_NOT_FOUND", "MANDATE_EXPIRED", "MANDATE_PAUSED"}
)

#: `X-Payment-Signature: sha256=<hex>`, HMAC-SHA256 over the raw request body.
SIGNATURE_SCHEME: Final = "sha256="

MAX_EVENT_ID_LENGTH: Final = 128
MAX_REF_LENGTH: Final = 128
MAX_FAILURE_CODE_LENGTH: Final = 64

#: What processing a callback did. Stored on the callback row.
CallbackOutcome = Literal["APPLIED", "DUPLICATE", "REFUSED", "UNMATCHED", "AMOUNT_MISMATCH"]


class CallbackMalformedError(ValueError):
    """A signed callback we cannot read. The gateway changed its format, or
    we did; either way nothing is granted from it."""


def sign(secret: bytes, body: bytes) -> str:
    """The signature header value for `body`."""
    return SIGNATURE_SCHEME + hmac.new(secret, body, hashlib.sha256).hexdigest()


def signature_matches(secret: bytes, body: bytes, header: str | None) -> bool:
    """Constant-time. An empty secret verifies nothing, rather than everything
    signed with an empty key."""
    if not secret or not header:
        return False
    expected = sign(secret, body).encode()
    return hmac.compare_digest(expected, header.strip().encode("utf-8", "replace"))


@dataclass(frozen=True, slots=True)
class CallbackEvent:
    event_id: str
    event_type: str
    provider_ref: str | None = None
    amount_minor: int | None = None
    currency: str | None = None
    failure_code: str | None = None
    mandate_ref: str | None = None


def _text(value: object, *, field: str, max_length: int) -> str:
    if not isinstance(value, str) or not value.strip() or len(value) > max_length:
        raise CallbackMalformedError(f"{field} must be a non-empty string of at most {max_length}")
    return value


def parse_callback(payload: object) -> CallbackEvent:
    """Read a verified callback body. Raises `CallbackMalformedError`.

    Strict on purpose: a field we do not recognise the shape of is a field we
    would otherwise guess at, and the guess would decide whether someone paid.
    """
    if not isinstance(payload, dict):
        raise CallbackMalformedError("callback body must be a JSON object")
    event_id = _text(payload.get("event_id"), field="event_id", max_length=MAX_EVENT_ID_LENGTH)
    event_type = payload.get("event")
    if event_type in PAYMENT_EVENTS:
        payment = payload.get("payment")
        if not isinstance(payment, dict):
            raise CallbackMalformedError("payment events carry a payment object")
        amount = payment.get("amount_minor")
        if not isinstance(amount, int) or isinstance(amount, bool) or amount < 0:
            raise CallbackMalformedError("amount_minor must be a non-negative integer")
        currency = _text(payment.get("currency"), field="currency", max_length=3)
        failure = payment.get("failure_code")
        if failure is not None:
            failure = _text(failure, field="failure_code", max_length=MAX_FAILURE_CODE_LENGTH)
        return CallbackEvent(
            event_id=event_id,
            event_type=str(event_type),
            provider_ref=_text(
                payment.get("provider_ref"), field="provider_ref", max_length=MAX_REF_LENGTH
            ),
            amount_minor=amount,
            currency=currency,
            failure_code=failure,
        )
    if event_type in MANDATE_EVENTS:
        mandate = payload.get("mandate")
        if not isinstance(mandate, dict):
            raise CallbackMalformedError("mandate events carry a mandate object")
        return CallbackEvent(
            event_id=event_id,
            event_type=str(event_type),
            mandate_ref=_text(
                mandate.get("provider_mandate_ref"),
                field="provider_mandate_ref",
                max_length=MAX_REF_LENGTH,
            ),
        )
    raise CallbackMalformedError("unknown callback event")


PaymentStep = Literal["APPLY", "DUPLICATE", "REFUSE"]


def payment_step(current_status: str, event_type: str) -> PaymentStep:
    """What a payment callback does to a payment in `current_status`.

    DUPLICATE for a status it already has -- a second success for a settled
    payment grants nothing twice. REFUSE for anything off the transition
    graph, the one that matters being a failure arriving after a success.
    """
    target = "SUCCEEDED" if event_type == PAYMENT_SUCCEEDED else "FAILED"
    if current_status == target:
        return "DUPLICATE"
    if (current_status, target) in PAYMENT_TRANSITIONS:
        return "APPLY"
    return "REFUSE"
