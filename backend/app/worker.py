"""Celery application factory.

SQS has no native ETA/countdown, so periodic work (application expiry, DSR
sweeps, subscription renewal, incomplete-profile nudges) runs via EventBridge
Scheduler hitting a trigger endpoint - NOT Celery Beat. Attempting countdown
scheduling on an SQS broker fails quietly, which is the worst kind of failure.
"""

from __future__ import annotations

from celery import Celery

from app.core.metadata import load_all_models
from app.settings import get_settings


def create_celery() -> Celery:
    settings = get_settings()
    celery = Celery(
        "bharatpath",
        broker=settings.celery_broker_url,
        backend=settings.celery_result_backend,
        include=["app.tasks"],
    )
    celery.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
        task_acks_late=True,
        task_reject_on_worker_lost=True,
        worker_prefetch_multiplier=1,
        broker_transport_options={"region": settings.aws_region},
    )
    return celery


celery_app = create_celery()

# Populate `Base.metadata` for this process.
#
# **Not optional, and not what the API does.** The API happens to end up with
# complete metadata because `create_app()` mounts every module's router, and
# each router reaches its own models through service -> repository. A worker
# mounts no routers: it imports `app.tasks` and nothing else, so a task that
# touches a table with a foreign key into another module's table fails with
# `NoReferencedTableError` -- SQLAlchemy cannot resolve a target it has never
# imported.
#
# Concretely: `resume_files.user_id` references `users`, which `identity` owns.
# Parsing a CV in a worker that had only loaded `resume.models` raised exactly
# that, and only under Celery -- the same code path is fine in the API.
load_all_models()
