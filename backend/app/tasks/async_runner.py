"""Run async task bodies on one event loop per Celery worker process.

Celery task entry points are synchronous, while the application and database
layer are async. Calling ``asyncio.run`` for every delivery creates and closes
a different loop each time, but SQLAlchemy's async connection pool survives
between deliveries. Reusing a connection on the next loop then fails with
``Future attached to a different loop``.

Prefork gives each worker process its own module globals, and a worker executes
one task at a time, so one persistent loop per process matches the lifetime of
its database pool.
"""

from __future__ import annotations

import asyncio
from collections.abc import Coroutine
from typing import Any

_loop: asyncio.AbstractEventLoop | None = None


def run_async[T](awaitable: Coroutine[Any, Any, T]) -> T:
    """Run one task body without replacing its process's event loop."""
    global _loop
    if _loop is None or _loop.is_closed():
        _loop = asyncio.new_event_loop()
        asyncio.set_event_loop(_loop)
    return _loop.run_until_complete(awaitable)
