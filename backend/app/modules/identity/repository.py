"""identity - data access

Users, sessions, Cognito linkage, memberships.

All database access for this module lives here. Private to the module:
no other module may import it (import-linter contract `module-privacy`).
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession  # noqa: F401
