"""applications module. Apply, stages, withdraw, expiry, hire confirm."""

from __future__ import annotations

from fastapi import APIRouter

name = "applications"
# The candidate's side lands first (Day 11). The employer's pipeline (Day 12)
# mounts under `/employer` through `get_extra_routers`, as `jobs` does.
prefix = "/candidate/applications"


def get_router() -> APIRouter | None:
    """Return this module's router, or None while it is still a stub."""
    from . import router as _router

    return getattr(_router, "router", None)
