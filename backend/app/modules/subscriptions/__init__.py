"""subscriptions module. Plans, periods, renewal, cancellation, seats."""

from __future__ import annotations

from fastapi import APIRouter

name = "subscriptions"
prefix = "/subscriptions"


def get_router() -> APIRouter | None:
    """Nothing is mounted under `/subscriptions`: every subscription belongs to
    an audience, and its routes live on that audience's surface."""
    return None


def get_extra_routers() -> tuple[tuple[str, APIRouter], ...]:
    from . import router as _router

    return (
        ("/candidate/subscription", _router.candidate_router),
        ("/employer/subscription", _router.employer_router),
    )
