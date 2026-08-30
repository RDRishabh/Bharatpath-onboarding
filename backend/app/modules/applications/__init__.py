"""applications module. Apply, stages, withdraw, expiry, hire confirm."""

from __future__ import annotations

from fastapi import APIRouter

name = "applications"
prefix = "/applications"


def get_router() -> APIRouter | None:
    """Return this module's router, or None while it is still a stub."""
    from . import router as _router

    return getattr(_router, "router", None)
