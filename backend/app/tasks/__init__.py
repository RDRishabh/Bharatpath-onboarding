"""Celery task definitions - thin wrappers over module services.

Tasks own no business logic. They resolve a session, call a service, and let
the service own the transaction. Periodic work arrives via EventBridge
Scheduler hitting a trigger endpoint, not Celery Beat - SQS has no native
countdown.
"""
