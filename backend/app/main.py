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
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.db import dispose_engines
from app.core.errors import AppError, app_error_handler, unhandled_error_handler
from app.core.logging import configure_logging, get_logger
from app.settings import Settings, get_settings

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    configure_logging(debug=settings.debug)
    logger.info("startup", environment=settings.environment, region=settings.aws_region)
    yield
    await dispose_engines()
    logger.info("shutdown")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

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

    @app.middleware("http")
    async def correlation_id(request: Request, call_next):  # noqa: ANN001, ANN202
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
