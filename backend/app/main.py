"""FastAPI application factory.

One deployable service consumed by all four surfaces. PRD section 1.1 forbids
per-surface backends; it says nothing about internal decomposition, so this is
a modular monolith with hard internal boundaries enforced by import-linter.

`uvicorn app.main:app` and `celery -A app.worker worker` run from the same
container image, so the API and the workers can never drift on model
definitions.
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.auth import dispose_identity_provider
from app.core.cache import dispose_redis
from app.core.db import dispose_engines
from app.core.errors import AppError, app_error_handler, unhandled_error_handler
from app.core.logging import configure_logging, get_logger
from app.core.metadata import load_all_models
from app.settings import Settings, get_settings

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    configure_logging(debug=settings.debug)
    logger.info("startup", environment=settings.environment, region=settings.aws_region)
    yield
    await dispose_engines()
    await dispose_redis()
    await dispose_identity_provider()
    logger.info("shutdown")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    # Populate `Base.metadata` explicitly rather than relying on the routers
    # below to drag every models module in behind them. They do, today -- each
    # router reaches its models through service -> repository -- but that is a
    # side effect of unrelated imports, not a guarantee, and the first module
    # whose router does not touch its own models would break foreign-key
    # resolution somewhere else entirely. `app/worker.py` does the same for
    # the same reason; see the note there for how this failed under Celery.
    load_all_models()

    app = FastAPI(
        title=settings.project_name,
        version="0.1.0",
        description=(
            "One shared backend for the candidate, employer, college and admin "
            "surfaces. See docs/plan.md for the invariants this service enforces."
        ),
        openapi_url=f"{settings.api_v1_prefix}/openapi.json",
        docs_url="/docs" if not settings.is_production else None,
        redoc_url=None,
        lifespan=lifespan,
    )

    # CORS. The three web consoles are served from different hosts than this
    # API, so a browser treats every call as cross-origin and blocks it unless
    # the server says otherwise. The mobile app is unaffected -- CORS is a
    # browser mechanism and native clients ignore it.
    #
    # `allow_credentials=True` with `allow_origins=["*"]` is refused by every
    # browser and is a real vulnerability besides, so origins are always an
    # explicit list, set per environment.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key", "X-Request-ID"],
        # Without this the browser hides these from JavaScript, so clients
        # cannot read the correlation id to quote in a bug report.
        expose_headers=["X-Request-ID"],
        max_age=600,  # cache the preflight, so OPTIONS is not sent every call
    )

    @app.middleware("http")
    async def correlation_id(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        rid = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = rid
        response = await call_next(request)
        response.headers["X-Request-ID"] = rid
        return response

    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)

    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.get("/", include_in_schema=False)
    async def root() -> JSONResponse:
        return JSONResponse({"service": settings.project_name, "version": "0.1.0"})

    return app


app = create_app()
