"""notifications - SQLAlchemy ORM models

Event to channel fan-out, templates.

Every tenant-scoped table carries `tenant_id` and an RLS policy.
Money is stored as integer minor units (paise) - never a float.
"""

from __future__ import annotations

from app.core.db import Base  # noqa: F401
