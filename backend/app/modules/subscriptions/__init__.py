"""subscriptions module. Plans, periods, renewal, cancellation, seats."""

from __future__ import annotations

from fastapi import APIRouter

name = "subscriptions"
prefix = "/subscriptions"


def get_router() -> APIRouter | None:
    """Return this module's router, or None while it is still a stub."""
    from . import router as _router

    return getattr(_router, "router", None)
