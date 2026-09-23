"""The Celery async bridge keeps database resources on one event loop."""

from __future__ import annotations

import asyncio

from app.tasks.async_runner import run_async


async def _running_loop() -> asyncio.AbstractEventLoop:
    return asyncio.get_running_loop()


def test_worker_deliveries_reuse_one_event_loop() -> None:
    first = run_async(_running_loop())
    second = run_async(_running_loop())

    assert first is second
    assert not first.is_closed()
