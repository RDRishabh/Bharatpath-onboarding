"""jobs - SQLAlchemy ORM models

Composer, validation, publish gate, lifecycle.

Every tenant-scoped table carries `tenant_id` and an RLS policy.
Money is stored as integer minor units (paise) - never a float.
"""

from __future__ import annotations

from app.core.db import Base  # noqa: F401
