"""jobs - business rules and transaction boundaries

Composer, validation, publish gate, lifecycle.

Services own the transaction. They never touch `Request`, and anything that
reveals private data writes its audit row on the same session before the
transaction closes.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession  # noqa: F401
