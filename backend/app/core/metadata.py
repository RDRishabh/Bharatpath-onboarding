"""The single place that makes `Base.metadata` complete.

SQLAlchemy only knows about a table once the module defining it has been
imported. Importing `app.modules` is NOT enough: that loads each module's
`__init__.py`, which carries only `name`, `prefix` and `get_router()`. The ORM
classes live in `<module>/models.py`, and nothing imports those by side effect.

This bit for real. The baseline migration failed in CI with `KeyError: 'users'`
because `alembic/env.py` imported `app.modules` and assumed the metadata was
populated. It was empty. Every caller that needs complete metadata - Alembic,
the migration itself, the schema guards - now goes through `load_all_models()`
instead of writing its own import loop, so there is one thing to get right
rather than three.
"""

from __future__ import annotations

import importlib

from sqlalchemy import MetaData


def load_all_models() -> MetaData:
    """Import every module's ORM models and return the populated metadata.

    Idempotent - Python caches imports, so calling it repeatedly is free.
    """
    import app.core.models  # noqa: F401  - the cross-cutting tables
    from app.core.db import Base
    from app.modules import ALL_MODULES

    for module in ALL_MODULES:
        # Not every module owns tables (analytics reads, notifications may
        # not persist), so a missing models module is fine - an empty one
        # is not an error.
        try:
            importlib.import_module(f"app.modules.{module.name}.models")
        except ModuleNotFoundError:  # pragma: no cover - defensive
            continue

    return Base.metadata
