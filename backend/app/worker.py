"""Celery application factory.

SQS has no native ETA/countdown, so periodic work (application expiry, DSR
sweeps, subscription renewal, incomplete-profile nudges) runs via EventBridge
Scheduler hitting a trigger endpoint - NOT Celery Beat. Attempting countdown
scheduling on an SQS broker fails quietly, which is the worst kind of failure.
"""

from __future__ import annotations

from celery import Celery

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
