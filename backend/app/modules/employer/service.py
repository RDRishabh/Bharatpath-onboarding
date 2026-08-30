"""employer - business rules and transaction boundaries

Employer tenant, team members, roles.

Services own the transaction. They never touch `Request`, and anything that
reveals private data writes its audit row on the same session before the
transaction closes.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession  # noqa: F401
