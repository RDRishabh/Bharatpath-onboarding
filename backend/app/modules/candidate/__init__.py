"""candidate module. Candidate profile, settings, language preference."""

from __future__ import annotations

from fastapi import APIRouter

name = "candidate"
prefix = "/candidate"


def get_router() -> APIRouter | None:
    """Return this module's router, or None while it is still a stub."""
    from . import router as _router

    return getattr(_router, "router", None)
