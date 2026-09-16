"""billing - HTTP layer

Payments, entitlements, signed callbacks.

Routes only. No business logic, no repository access.
import-linter enforces the second half of that sentence.

**The callback route is public and grants nothing.** A gateway cannot hold a
user's token, so the route cannot ask for one; what it asks for instead is a
signature over the raw body, checked before anything is read or written.
`tests/invariants/test_route_authorisation.py` lists it with that reason.
Checkouts live on the surfaces that sell: `/candidate/subscription`,
`/employer/subscription`, `/candidate/courses`.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Header, Request, status

from app.core.deps import CurrentUser, DbSession
from app.modules.billing import service
from app.modules.billing.schemas import CallbackAck, PaymentResponse, SimulatePaymentRequest
from app.settings import get_settings

router = APIRouter()


@router.get(
    "/payments/{payment_id}",
    response_model=PaymentResponse,
    summary="One of the caller's own payments",
)
async def get_payment(
    payment_id: uuid.UUID, user: CurrentUser, session: DbSession
) -> PaymentResponse:
    """How the app learns a checkout's outcome. Another person's payment is a 404."""
    payment = await service.payment_for_payer(session, user_id=user.user_id, payment_id=payment_id)
    return PaymentResponse.model_validate(payment)


@router.post(
    "/callbacks/{provider}",
    response_model=CallbackAck,
    status_code=status.HTTP_200_OK,
    summary="Server-to-server callback from the payment gateway",
    description=(
        "Signed with HMAC-SHA256 over the raw body in `X-Payment-Signature`. "
        "An unsigned or mis-signed callback is refused with 401 and nothing is "
        "stored. A verified one is stored and acknowledged at once; the "
        "payment is settled out of band."
    ),
)
async def payment_callback(
    provider: str,
    request: Request,
    session: DbSession,
    x_payment_signature: Annotated[str | None, Header()] = None,
) -> CallbackAck:
    body = await request.body()
    receipt = await service.receive_callback(
        session, provider_name=provider, body=body, signature=x_payment_signature
    )
    return CallbackAck(received=True, duplicate=receipt.duplicate)


# ---------------------------------------------------------------------------
# Development only
# ---------------------------------------------------------------------------
# Registered only with the stub gateway, which `Settings` refuses in staging
# and production -- the same shape as `/auth/dev/token`.
if get_settings().payments_provider == "stub":

    @router.post(
        "/dev/payments/{payment_id}/simulate",
        response_model=PaymentResponse,
        summary="Have the stub gateway settle your payment (local development only)",
        description=(
            "Present only with PAYMENTS_PROVIDER=stub. Signs the callback the "
            "stub gateway would send and runs it through the ordinary "
            "verification and processing path."
        ),
    )
    async def simulate_payment(
        payment_id: uuid.UUID,
        payload: SimulatePaymentRequest,
        user: CurrentUser,
        session: DbSession,
    ) -> PaymentResponse:
        payment = await service.simulate_callback(
            session,
            user_id=user.user_id,
            payment_id=payment_id,
            succeed=payload.outcome == "SUCCEEDED",
            failure_code=payload.failure_code,
        )
        return PaymentResponse.model_validate(payment)
