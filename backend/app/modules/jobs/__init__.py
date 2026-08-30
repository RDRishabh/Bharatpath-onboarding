"""jobs module. Composer, validation, publish gate, lifecycle."""

from __future__ import annotations

from fastapi import APIRouter

name = "jobs"
prefix = "/employer/jobs"


def get_router() -> APIRouter | None:
    """Return this module's router, or None while it is still a stub."""
    from . import router as _router

    return getattr(_router, "router", None)
