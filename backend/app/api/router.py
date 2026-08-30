"""Root router. Surface-scoped prefixes for readability - NOT for authorisation.

`/api/v1/candidate/*`, `/employer/*`, `/college/*`, `/admin/*` are namespacing
so four client teams can read the schema. A candidate hitting an `/employer/*`
route is rejected by the role dependency, never by the routing.

Every module's router is registered here at Day 1 so `openapi.json` is
publishable from Day 2 and the mobile and web teams are never blocked on us.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api import health
from app.modules import ALL_MODULES

api_router = APIRouter()
api_router.include_router(health.router)

for _module in ALL_MODULES:
    if (_router := _module.get_router()) is not None:
        api_router.include_router(
            _router, prefix=_module.prefix, tags=[_module.name]
        )
