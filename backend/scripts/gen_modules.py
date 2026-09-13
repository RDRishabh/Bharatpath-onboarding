#!/usr/bin/env python3
"""Generate the seven-file skeleton for every module.

Twenty modules with an identical shape is a template you fill, not twenty
designs. Generating them means the rest of the sprint is spent in `domain.py`
and `service.py`, which is where the actual thinking lives.

Idempotent: an existing file is never overwritten, so this is safe to re-run
after adding a module to MODULES below.

    python scripts/gen_modules.py           # create anything missing
    python scripts/gen_modules.py --check   # exit non-zero if missing (CI)
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODULES_DIR = ROOT / "app" / "modules"


@dataclass(frozen=True)
class ModuleSpec:
    name: str
    prefix: str
    summary: str


# The modules from docs/plan.md section 4: the original twenty, plus
# `engagement` (streaks, added 2026-09-13 -- docs/streaks.md).
MODULES: tuple[ModuleSpec, ...] = (
    ModuleSpec("identity", "/auth", "Users, sessions, Cognito linkage, memberships."),
    ModuleSpec("candidate", "/candidate", "Candidate profile, settings, language preference."),
    ModuleSpec(
        "resume",
        "/candidate/resume",
        "Upload, parse jobs, versions, review and confirm.",
    ),
    ModuleSpec("scoring", "/candidate/score", "Engine interface, versions, history, breakdown."),
    ModuleSpec("integrity", "/integrity", "Signals, severity policy, search suppression."),
    ModuleSpec(
        "questionnaire",
        "/candidate/questionnaire",
        "Optional attribute questionnaire. Imports nothing from scoring.",
    ),
    ModuleSpec(
        "interview",
        "/candidate/interview",
        "Audio sessions, chunk upload, evaluation, +20/session.",
    ),
    ModuleSpec(
        "courses",
        "/candidate/courses",
        "Catalogue, purchase, completion, +30 contribution.",
    ),
    ModuleSpec("employer", "/employer", "Employer tenant, team members, roles."),
    ModuleSpec("kyb", "/employer/kyb", "Submissions, documents, review state machine."),
    ModuleSpec("jobs", "/employer/jobs", "Composer, validation, publish gate, lifecycle."),
    ModuleSpec(
        "applications",
        "/applications",
        "Apply, stages, withdraw, expiry, hire confirm.",
    ),
    ModuleSpec(
        "discovery",
        "/employer/discovery",
        "Masked search, access-window checks, reveal audit.",
    ),
    ModuleSpec("billing", "/billing", "Payments, entitlements, signed callbacks."),
    ModuleSpec(
        "subscriptions",
        "/subscriptions",
        "Plans, periods, renewal, cancellation, seats.",
    ),
    ModuleSpec(
        "college",
        "/college",
        "Institution tenant, roster, invites, consent, referral codes.",
    ),
    ModuleSpec("analytics", "/college/analytics", "Cohort aggregates, placement tracking."),
    ModuleSpec("admin", "/admin", "Queues, drill-downs, disputes, suspensions."),
    ModuleSpec("notifications", "/notifications", "Event to channel fan-out, templates."),
    ModuleSpec("privacy", "/privacy", "Export and deletion requests, DSR tracking."),
    ModuleSpec(
        "engagement",
        "/candidate/streak",
        "Daily app-open streaks and engagement points. Never the score.",
    ),
)

FILES = (
    "__init__.py",
    "router.py",
    "schemas.py",
    "models.py",
    "repository.py",
    "service.py",
    "domain.py",
    "events.py",
)

INIT_TEMPLATE = '''"""{name} module. {summary}"""

from __future__ import annotations

from fastapi import APIRouter

name = "{name}"
prefix = "{prefix}"


def get_router() -> APIRouter | None:
    """Return this module's router, or None while it is still a stub."""
    from . import router as _router

    return getattr(_router, "router", None)
'''

# One entry per file: the layer name, the rules that govern it, and the body.
# Keeping these as real multi-line templates rather than escaped concatenation
# means the generator reads as a description of the architecture.
LAYERS: dict[str, tuple[str, str, str]] = {
    "router.py": (
        "HTTP layer",
        "Routes only. No business logic, no repository access.\n"
        "import-linter enforces the second half of that sentence.",
        """
from fastapi import APIRouter

router = APIRouter()

# Endpoints land on the day this module is scheduled in docs/plan.md section 8.
""",
    ),
    "schemas.py": (
        "Pydantic request/response DTOs",
        "Separate Create / Update / Read schemas. ORM models are never exposed\n"
        "directly - the schema IS the API contract, and for several modules it\n"
        "is also where an invariant is enforced structurally.",
        """
from pydantic import BaseModel, ConfigDict


class _Base(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")
""",
    ),
    "models.py": (
        "SQLAlchemy ORM models",
        "Every tenant-scoped table carries `tenant_id` and an RLS policy.\n"
        "Money is stored as integer minor units (paise) - never a float.",
        """
from app.core.db import Base  # noqa: F401
""",
    ),
    "repository.py": (
        "data access",
        "All database access for this module lives here. Private to the module:\n"
        "no other module may import it (import-linter contract `module-privacy`).",
        """
from sqlalchemy.ext.asyncio import AsyncSession  # noqa: F401
""",
    ),
    "service.py": (
        "business rules and transaction boundaries",
        "Services own the transaction. They never touch `Request`, and anything\n"
        "that reveals private data writes its audit row on the same session\n"
        "before the transaction closes.",
        """
from sqlalchemy.ext.asyncio import AsyncSession  # noqa: F401
""",
    ),
    "domain.py": (
        "pure domain logic",
        "No I/O. No database, no HTTP, no clock, no randomness that is not\n"
        "passed in. mypy runs in strict mode here and import-linter forbids I/O\n"
        "imports, because this is the layer the invariant property tests\n"
        "exercise directly.",
        "",
    ),
    "events.py": (
        "domain events",
        "Events this module emits through the transactional outbox. Consumers\n"
        "are idempotent by event id.",
        """
from typing import Final

MODULE: Final = "{name}"
""",
    ),
}


def header(m: ModuleSpec, layer: str, rules: str) -> str:
    return (
        f'"""{m.name} - {layer}\n\n'
        f"{m.summary}\n\n"
        f'{rules}\n"""\n\n'
        "from __future__ import annotations\n"
    )


def render(m: ModuleSpec, filename: str) -> str:
    if filename == "__init__.py":
        return INIT_TEMPLATE.format(name=m.name, prefix=m.prefix, summary=m.summary)

    if filename in LAYERS:
        layer, rules, body = LAYERS[filename]
        return header(m, layer, rules) + body.format(name=m.name)

    raise ValueError(filename)


def write_registry() -> None:
    """app/modules/__init__.py - the registry the API router walks."""
    lines = [
        '"""Module registry. The API router walks ALL_MODULES to mount every surface."""',
        "",
        "from __future__ import annotations",
        "",
        "from types import ModuleType",
        "",
        *[f"from . import {m.name}" for m in MODULES],
        "",
        "ALL_MODULES: tuple[ModuleType, ...] = (",
        *[f"    {m.name}," for m in MODULES],
        ")",
        "",
    ]
    (MODULES_DIR / "__init__.py").write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Exit non-zero if files are missing.")
    args = parser.parse_args()

    created: list[str] = []
    missing: list[str] = []

    for m in MODULES:
        directory = MODULES_DIR / m.name
        for filename in FILES:
            path = directory / filename
            if path.exists():
                continue
            if args.check:
                missing.append(str(path.relative_to(ROOT)))
                continue
            directory.mkdir(parents=True, exist_ok=True)
            path.write_text(render(m, filename), encoding="utf-8")
            created.append(str(path.relative_to(ROOT)))

    if args.check:
        if missing:
            print(f"{len(missing)} module file(s) missing. Run: python scripts/gen_modules.py")
            for path_str in missing[:20]:
                print(f"  {path_str}")
            return 1
        print(f"All {len(MODULES)} modules present.")
        return 0

    write_registry()
    print(f"Created {len(created)} file(s) across {len(MODULES)} modules.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
