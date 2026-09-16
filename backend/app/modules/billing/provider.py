"""The payment gateway, behind one interface.

**No gateway is chosen yet** (blockers D3: KYC not started, and it must support
UPI AutoPay for R17). So there are two implementations:

* `UnconfiguredPaymentProvider` -- the default. Checkout answers
  `503 payments_unavailable` and every callback fails verification. Nothing
  can be bought, which is correct for a service with no way to take money.
* `StubPaymentProvider` -- local development and CI only; `Settings` refuses it
  in staging and production. It hands out references, and **signs callbacks
  with a real HMAC over the raw body**, so the verification path under test
  is the one a real gateway will go through. Tests forge callbacks by signing
  with the wrong key, and the stub is how they sign with the right one.

One interface for both renewal paths (R17). Manual repurchase is an ordinary
order; the mandate path adds registration, the pre-debit notice, the debit
and revocation. A real gateway is an HTTP client, so the calls are async.
"""

from __future__ import annotations

import json
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache
from typing import Any, Final, Protocol

from fastapi import status

from app.core.errors import AppError
from app.modules.billing.domain import sign, signature_matches
from app.settings import get_settings

#: Where a gateway puts the signature. `sha256=<hex>` over the raw body.
SIGNATURE_HEADER: Final = "X-Payment-Signature"


class PaymentsUnavailableError(AppError):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    code = "payments_unavailable"
    title = "Payments are not available"


@dataclass(frozen=True, slots=True)
class ProviderOrder:
    provider_ref: str
    redirect_url: str


@dataclass(frozen=True, slots=True)
class ProviderMandate:
    provider_mandate_ref: str
    authorisation_url: str


class PaymentProvider(Protocol):
    name: str

    def verify_signature(self, *, body: bytes, signature: str | None) -> bool: ...

    async def create_order(
        self, *, payment_id: uuid.UUID, amount_minor: int, currency: str
    ) -> ProviderOrder: ...

    async def register_mandate(
        self, *, subscription_id: uuid.UUID, max_amount_minor: int, valid_until: datetime
    ) -> ProviderMandate: ...

    async def notify_pre_debit(
        self, *, mandate_ref: str, amount_minor: int, debit_on: datetime
    ) -> str: ...

    async def request_mandate_debit(
        self, *, mandate_ref: str, payment_id: uuid.UUID, amount_minor: int
    ) -> str: ...

    async def revoke_mandate(self, *, mandate_ref: str) -> None: ...


class UnconfiguredPaymentProvider:
    """No gateway. Sells nothing, verifies nothing."""

    name = "none"

    def verify_signature(self, *, body: bytes, signature: str | None) -> bool:
        return False

    async def create_order(
        self, *, payment_id: uuid.UUID, amount_minor: int, currency: str
    ) -> ProviderOrder:
        raise PaymentsUnavailableError()

    async def register_mandate(
        self, *, subscription_id: uuid.UUID, max_amount_minor: int, valid_until: datetime
    ) -> ProviderMandate:
        raise PaymentsUnavailableError()

    async def notify_pre_debit(
        self, *, mandate_ref: str, amount_minor: int, debit_on: datetime
    ) -> str:
        raise PaymentsUnavailableError()

    async def request_mandate_debit(
        self, *, mandate_ref: str, payment_id: uuid.UUID, amount_minor: int
    ) -> str:
        raise PaymentsUnavailableError()

    async def revoke_mandate(self, *, mandate_ref: str) -> None:
        raise PaymentsUnavailableError()


class StubPaymentProvider:
    """A gateway that takes no money and signs its callbacks for real."""

    name = "stub"

    def __init__(self, secret: bytes) -> None:
        self._secret = secret

    def verify_signature(self, *, body: bytes, signature: str | None) -> bool:
        return signature_matches(self._secret, body, signature)

    def signed_event(self, event: dict[str, Any]) -> tuple[bytes, str]:
        """`(body, signature header)` for a callback the stub gateway sends."""
        body = json.dumps(event, separators=(",", ":"), sort_keys=True).encode()
        return body, sign(self._secret, body)

    async def create_order(
        self, *, payment_id: uuid.UUID, amount_minor: int, currency: str
    ) -> ProviderOrder:
        ref = f"stub_order_{uuid.uuid4().hex}"
        return ProviderOrder(ref, f"https://stub-payments.invalid/checkout/{ref}")

    async def register_mandate(
        self, *, subscription_id: uuid.UUID, max_amount_minor: int, valid_until: datetime
    ) -> ProviderMandate:
        ref = f"stub_mandate_{uuid.uuid4().hex}"
        return ProviderMandate(ref, f"https://stub-payments.invalid/mandate/{ref}")

    async def notify_pre_debit(
        self, *, mandate_ref: str, amount_minor: int, debit_on: datetime
    ) -> str:
        return f"stub_notice_{uuid.uuid4().hex}"

    async def request_mandate_debit(
        self, *, mandate_ref: str, payment_id: uuid.UUID, amount_minor: int
    ) -> str:
        return f"stub_debit_{uuid.uuid4().hex}"

    async def revoke_mandate(self, *, mandate_ref: str) -> None:
        return None


@lru_cache(maxsize=1)
def get_payment_provider() -> PaymentProvider:
    """The process-wide provider. Without a configured secret the stub signs
    with a key generated at boot, like the local identity provider: callbacks
    from anywhere but this process cannot verify."""
    settings = get_settings()
    if settings.payments_provider == "stub":
        configured = settings.payments_webhook_secret
        secret = configured.get_secret_value().encode() if configured else secrets.token_bytes(32)
        return StubPaymentProvider(secret)
    return UnconfiguredPaymentProvider()
