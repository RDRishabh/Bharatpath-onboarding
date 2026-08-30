#!/usr/bin/env python3
"""Generate the seven-file skeleton for every module.

Nineteen modules with an identical shape is a template you fill, not nineteen
designs. Generating them means the rest of the sprint is spent in `domain.py`
and `service.py`, which is where the actual thinking lives.

Idempotent: an existing file is never overwritten, so this is safe to re-run
after adding a module to MODULES below.

    python scripts/gen_modules.py [--check]

`--check` exits non-zero if anything is missing, which is what CI runs.
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


# The nineteen modules from docs/plan.md section 4.
MODULES: tuple[ModuleSpec, ...] = (
    ModuleSpec("identity", "/auth", "Users, sessions, Cognito linkage, memberships."),
    ModuleSpec("candidate", "/candidate", "Candidate profile, settings, language preference."),
    ModuleSpec("resume", "/candidate/resume", "Upload, parse jobs, versions, review and confirm."),
    ModuleSpec("scoring", "/candidate/score", "Engine interface, versions, history, breakdown."),
    ModuleSpec("integrity", "/integrity", "Signals, severity policy, search suppression."),
    ModuleSpec("questionnaire", "/candidate/questionnaire", "Optional attribute questionnaire. Imports nothing from scoring."),
    ModuleSpec("interview", "/candidate/interview", "Audio sessions, chunk upload, evaluation, +20/session."),
    ModuleSpec("courses", "/candidate/courses", "Catalogue, purchase, completion, +30 contribution."),
    ModuleSpec("employer", "/employer", "Employer tenant, team members, roles."),
    ModuleSpec("kyb", "/employer/kyb", "Submissions, documents, review state machine."),
    ModuleSpec("jobs", "/employer/jobs", "Composer, validation, publish gate, lifecycle."),
    ModuleSpec("applications", "/applications", "Apply, stages, withdraw, expiry, hire confirm."),
    ModuleSpec("discovery", "/employer/discovery", "Masked search, access-window checks, reveal audit."),
    ModuleSpec("billing", "/billing", "Payments, entitlements, signed callbacks."),
    ModuleSpec("subscriptions", "/subscriptions", "Plans, periods, renewal, cancellation, seats."),
    ModuleSpec("college", "/college", "Institution tenant, roster, invites, consent, referral codes."),
    ModuleSpec("analytics", "/college/analytics", "Cohort aggregates, placement tracking."),
    ModuleSpec("admin", "/admin", "Queues, drill-downs, disputes, suspensions."),
    ModuleSpec("notifications", "/notifications", "Event to channel fan-out, templates."),
    ModuleSpec("privacy", "/privacy", "Export and deletion requests, DSR tracking."),
)

FILES = ("__init__.py", "router.py", "schemas.py", "models.py", "repository.py", "service.py", "domain.py", "events.py")


def header(m: ModuleSpec, layer: str, rules: str = "") -> str:
    body = f'"""{m.name} - {layer}\n\n{m.summary}\n'
    if rules:
        body += f"\n{rules}\n"
    body += '"""\n\nfrom __future__ import annotations\n'
    return body


def render(m: ModuleSpec, filename: str) -> str:
    if filename == "__init__.py":
        return (
            f'"""{m.name} module. {m.summary}"""\n\n'
            "from __future__ import annotations\n\n"
            "from fastapi import APIRouter\n\n"
            f'name = "{m.name}"\n'
            f'prefix = "{m.prefix}"\n\n\n'
            "def get_router() -> APIRouter | None:\n"
            '    """Return this module\'s router, or None while it is still a stub."""\n'
            "    from . import router as _router\n\n"
            '    return getattr(_router, "router", None)\n'
        )

    if filename == "router.py":
        return (
            header(m, "HTTP layer", "Routes only. No business logic, no repository access.\nimport-linter enforces the second half of that sentence.")
            + "\nfrom fastapi import APIRouter\n\n"
            "router = APIRouter()\n\n"
            "# Endpoints land on the day this module is scheduled in docs/plan.md section 8.\n"
        )

    if filename == "schemas.py":
        return (
            header(m, "Pydantic request/response DTOs", "Separate Create / Update / Read schemas. ORM models are never exposed\ndirectly - the schema IS the API contract, and for several modules it is also\nwhere an invariant is enforced structurally.")
            + "\nfrom pydantic import BaseModel, ConfigDict\n\n\n"
            "class _Base(BaseModel):\n"
            "    model_config = ConfigDict(from_attributes=True, extra=\"forbid\")\n"
        )

    if filename == "models.py":
        return (
            header(m, "SQLAlchemy ORM models", "Every tenant-scoped table carries `tenant_id` and an RLS policy.\nMoney is stored as integer minor units (paise) - never a float.")
            + "\nfrom app.core.db import Base  # noqa: F401\n"
        )

    if filename == "repository.py":
        return (
            header(m, "data access", "All database access for this module lives here. Private to the module:\nno other module may import it (import-linter contract `module-privacy`).")
            + "\nfrom sqlalchemy.ext.asyncio import AsyncSession  # noqa: F401\n"
        )

    if filename == "service.py":
        return (
            header(m, "business rules and transaction boundaries", "Services own the transaction. They never touch `Request`, and anything that\nreveals private data writes its audit row on the same session before the\ntransaction closes.")
            + "\nfrom sqlalchemy.ext.asyncio import AsyncSession  # noqa: F401\n"
        )

    if filename == "domain.py":
        return (
            header(m, "pure domain logic", "No I/O. No database, no HTTP, no clock, no randomness that is not passed in.\nmypy runs in strict mode here and import-linter forbids I/O imports, because\nthis is the layer the invariant property tests exercise directly.")
        )

    if filename == "events.py":
        return (
            header(m, "domain events", "Events this module emits through the transactional outbox. Consumers are\nidempotent by event id.")
            + "\nfrom typing import Final\n\n"
            f'MODULE: Final = "{m.name}"\n'
        )

    raise ValueError(filename)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Exit non-zero if files are missing.")
    args = parser.parse_args()

    created: list[str] = []
    missing: list[str] = []

    for m in MODULES:
        d = MODULES_DIR / m.name
        for filename in FILES:
            path = d / filename
            if path.exists():
                continue
            if args.check:
                missing.append(str(path.relative_to(ROOT)))
                continue
            d.mkdir(parents=True, exist_ok=True)
            path.write_text(render(m, filename), encoding="utf-8")
            created.append(str(path.relative_to(ROOT)))

    if args.check:
        if missing:
            print(f"{len(missing)} module file(s) missing. Run: python scripts/gen_modules.py")
            for p in missing[:20]:
                print(f"  {p}")
            return 1
        print(f"All {len(MODULES)} modules present.")
        return 0

    # app/modules/__init__.py aggregates the registry the API router walks.
    registry = MODULES_DIR / "__init__.py"
    lines = [
        '"""Module registry. The API router walks ALL_MODULES to mount every surface."""',
        "",
        "from __future__ import annotations",
        "",
        "from types import ModuleType",
        "",
    ]
    lines += [f"from . import {m.name}" for m in MODULES]
    lines += [
        "",
        "ALL_MODULES: tuple[ModuleType, ...] = (",
        *[f"    {m.name}," for m in MODULES],
        ")",
        "",
    ]
    registry.write_text("\n".join(lines), encoding="utf-8")

    print(f"Created {len(created)} file(s) across {len(MODULES)} modules.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
