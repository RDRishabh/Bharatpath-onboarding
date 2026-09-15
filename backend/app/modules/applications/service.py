"""applications - business rules and transaction boundaries

Apply, stages, withdraw, expiry, hire confirm.

Services own the transaction. They never touch `Request`, and anything that
reveals private data writes its audit row on the same session before the
transaction closes.

**Day 11 is the candidate's side: apply, read, withdraw.** Four rules decide
whether an application can be made, checked in this order:

  1. **An active application already exists** -> return it. Applying is
     idempotent, so a retry after a dropped connection is not an error, and
     it is checked first so a retry gets the same answer whatever changed in
     between.
  2. **The job is on the board** -> otherwise `job_not_found`. A paused, closed
     or draft job reads as absent, exactly as it does in search.
  3. **The candidate is visible to employers** -> otherwise
     `application_unavailable` (or `score_pending` with no score at all).
     Applying puts a candidate in front of an employer, so it passes the same
     rule as discovery -- the one CTE. Without this, a CV held back by a HIGH
     integrity signal would reach employers through the apply button, which
     is the bypass Day 9 closed for search.
  4. **The stored score meets the threshold** -> otherwise
     `eligibility_below_threshold`, with no number attached (R11).

**Payment gates applying and searching, not leaving.** A lapsed subscriber
keeps their account and their history (R13): reading and withdrawing their own
applications stay open, because an application someone cannot withdraw without
paying is their data held in an employer's pipeline for a fee.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ConflictError, NotFoundError, PermissionDeniedError, ValidationError
from app.core.logging import get_logger
from app.core.outbox import emit
from app.core.pagination import Page, clamp_limit, decode_cursor, encode_cursor
from app.core.tenant import TenantContext
from app.modules.applications import repository
from app.modules.applications.domain import withdrawal
from app.modules.applications.events import APPLICATION_SUBMITTED, APPLICATION_WITHDRAWN
from app.modules.applications.schemas import ApplicationResponse
from app.modules.discovery import service as discovery_service
from app.modules.jobs import service as jobs_service
from app.modules.jobs.domain import eligibility

logger = get_logger(__name__)


class ApplicationNotFoundError(NotFoundError):
    """Another candidate's application reads as absent, never as forbidden."""

    code = "application_not_found"
    title = "Application not found"


class ScorePendingError(ConflictError):
    code = "score_pending"
    title = "Your score is not ready yet"


class ApplicationUnavailableError(ConflictError):
    """Deliberately says nothing about why. The two causes are a check that has
    not run yet (seconds) and an integrity review (a human), and naming the
    second tells someone gaming a CV that they were caught."""

    code = "application_unavailable"
    title = "Applications are not available right now"


class BelowThresholdError(PermissionDeniedError):
    """`eligibility.below_threshold` in every locale. No params, ever: a
    number here is the explanation the client ruled out."""

    code = "eligibility_below_threshold"
    title = "This employer's requirement is not met"


class ApplicationTransitionError(ConflictError):
    code = "application_invalid_transition"
    title = "That change is not allowed for this application"


async def _respond(
    session: AsyncSession, ctx: TenantContext, applications: list[Any]
) -> list[ApplicationResponse]:
    jobs = await jobs_service.jobs_for_candidate(
        session, ctx=ctx, job_ids=list({a.job_id for a in applications})
    )
    out = []
    for application in applications:
        title, employer = jobs.get(application.job_id, (None, None))
        out.append(
            ApplicationResponse(
                id=application.id,
                job_id=application.job_id,
                job_title=title,
                employer_name=employer,
                stage=application.stage,
                created_at=application.created_at,
                updated_at=application.updated_at,
            )
        )
    return out


async def apply(
    session: AsyncSession, *, ctx: TenantContext, job_id: uuid.UUID
) -> tuple[ApplicationResponse, bool]:
    """Apply to a published job. Returns the application and whether it is new."""
    candidate_id = await jobs_service.bind_candidate(session, ctx)

    existing = await repository.active_for(session, job_id=job_id, candidate_id=candidate_id)
    if existing is not None:
        return (await _respond(session, ctx, [existing]))[0], False

    job = await jobs_service.open_job_for_application(session, ctx=ctx, job_id=job_id)

    score = await jobs_service.current_score(session, user_id=candidate_id)
    if score is None:
        raise ScorePendingError()
    if not await discovery_service.is_candidate_visible(session, candidate_id=candidate_id):
        raise ApplicationUnavailableError()
    if eligibility(min_score=job.min_score, score=score) != "ELIGIBLE":
        raise BelowThresholdError()

    new_id = await repository.insert_if_absent(
        session, tenant_id=job.tenant_id, job_id=job.id, candidate_id=candidate_id
    )
    if new_id is None:
        # Lost the race to a simultaneous apply. The winner has committed --
        # ON CONFLICT waited for it -- so its row is there to return.
        winner = await repository.active_for(session, job_id=job_id, candidate_id=candidate_id)
        if winner is None:  # pragma: no cover - only if the winner withdrew in between
            raise ApplicationTransitionError()
        return (await _respond(session, ctx, [winner]))[0], False

    await repository.record_event(
        session,
        application_id=new_id,
        from_stage=None,
        to_stage="SUBMITTED",
        actor_id=candidate_id,
    )
    await emit(
        session,
        event_type=APPLICATION_SUBMITTED,
        aggregate_type="application",
        aggregate_id=new_id,
        payload={
            "tenant_id": str(job.tenant_id),
            "job_id": str(job.id),
            "candidate_id": str(candidate_id),
        },
    )
    logger.info("application_submitted", application_id=str(new_id), job_id=str(job.id))
    created = await repository.get_for_candidate(
        session, application_id=new_id, candidate_id=candidate_id
    )
    return (await _respond(session, ctx, [created]))[0], True


def _after(cursor: str | None) -> tuple[datetime, uuid.UUID] | None:
    if cursor is None:
        return None
    payload = decode_cursor(cursor)
    try:
        return datetime.fromisoformat(str(payload["c"])), uuid.UUID(str(payload["i"]))
    except (KeyError, ValueError) as exc:
        raise ValidationError(code="invalid_cursor") from exc


async def list_mine(
    session: AsyncSession, *, ctx: TenantContext, cursor: str | None, limit: int | None
) -> Page[ApplicationResponse]:
    candidate_id = await jobs_service.bind_candidate(session, ctx)
    page_size = clamp_limit(limit)
    rows = await repository.list_for_candidate(
        session, candidate_id=candidate_id, after=_after(cursor), limit=page_size + 1
    )
    page, more = rows[:page_size], len(rows) > page_size
    return Page[ApplicationResponse](
        items=await _respond(session, ctx, page),
        next_cursor=(
            encode_cursor({"c": page[-1].created_at.isoformat(), "i": str(page[-1].id)})
            if more and page
            else None
        ),
    )


async def get_mine(
    session: AsyncSession, *, ctx: TenantContext, application_id: uuid.UUID
) -> ApplicationResponse:
    candidate_id = await jobs_service.bind_candidate(session, ctx)
    row = await repository.get_for_candidate(
        session, application_id=application_id, candidate_id=candidate_id
    )
    if row is None:
        raise ApplicationNotFoundError()
    return (await _respond(session, ctx, [row]))[0]


async def withdraw(
    session: AsyncSession, *, ctx: TenantContext, application_id: uuid.UUID
) -> ApplicationResponse:
    """Withdraw one of the candidate's applications. Withdrawing twice is a retry.

    The row is locked first, so a withdrawal and an employer's stage change
    (Day 12) cannot both read SHORTLISTED and both write.
    """
    candidate_id = await jobs_service.bind_candidate(session, ctx)
    row = await repository.get_for_candidate(
        session, application_id=application_id, candidate_id=candidate_id, for_update=True
    )
    if row is None:
        raise ApplicationNotFoundError()

    outcome = withdrawal(row.stage)
    if outcome == "REFUSE":
        raise ApplicationTransitionError(params={"from": row.stage, "to": "WITHDRAWN"})
    if outcome == "WITHDRAW":
        previous = row.stage
        row = await repository.set_stage(session, application=row, stage="WITHDRAWN")
        await repository.record_event(
            session,
            application_id=row.id,
            from_stage=previous,
            to_stage="WITHDRAWN",
            actor_id=candidate_id,
        )
        await emit(
            session,
            event_type=APPLICATION_WITHDRAWN,
            aggregate_type="application",
            aggregate_id=row.id,
            payload={"tenant_id": str(row.tenant_id), "job_id": str(row.job_id)},
        )
        logger.info("application_withdrawn", application_id=str(row.id))
    return (await _respond(session, ctx, [row]))[0]
