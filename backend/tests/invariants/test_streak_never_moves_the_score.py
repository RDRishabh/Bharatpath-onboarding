"""Streak points never move the score, and are never an employer signal.

The client asked for streak points on 2026-09-13. Read as points on the score,
the request breaks invariants 1, 2, 3 and 4-prime together: a -10 takes a
score below its 700 base, milestones take it past 990, and "opened the app" is
not an input a replay can reproduce. `docs/streaks.md` section 2 has the
reasoning. So they are a separate balance, and this file is what keeps the
separation from eroding one convenient change at a time.

No database. These read the import contracts, the event routing table and the
schemas -- the three places a streak could be wired into a score.
"""

from __future__ import annotations

import configparser
import importlib
import inspect
from pathlib import Path

import pytest
from pydantic import BaseModel

from app.modules import ALL_MODULES
from app.modules.engagement import events as engagement_events
from app.modules.engagement import schemas as engagement_schemas
from app.tasks.routing import EVENT_SUBSCRIPTIONS

pytestmark = pytest.mark.invariant

ROOT = Path(__file__).resolve().parents[2]

#: Fields that only belong on the engagement surface.
STREAK_FIELDS = frozenset({"points_balance", "current_streak", "longest_streak", "break_penalty"})


def _contracts() -> configparser.ConfigParser:
    parser = configparser.ConfigParser()
    parser.read(ROOT / ".importlinter", encoding="utf-8")
    return parser


def _lines(value: str) -> set[str]:
    return {line.strip() for line in value.splitlines() if line.strip()}


def _schemas(module: object) -> list[type[BaseModel]]:
    return [
        obj
        for _, obj in inspect.getmembers(module, inspect.isclass)
        if issubclass(obj, BaseModel)
        and obj is not BaseModel
        and obj.__module__ == getattr(module, "__name__", None)
        and not obj.__name__.startswith("_")
    ]


# --- the import contracts exist and say what they should ------------------
def test_engagement_and_scoring_are_independent() -> None:
    """A deleted contract fails nothing in `lint-imports`. This fails here."""
    section = "importlinter:contract:engagement-and-scoring-are-independent"
    contracts = _contracts()
    assert contracts.has_section(section), f"{section} was removed from .importlinter"
    assert contracts[section]["type"].strip() == "independence"
    assert _lines(contracts[section]["modules"]) == {
        "app.modules.engagement",
        "app.modules.scoring",
    }


def test_employer_surfaces_are_forbidden_from_reading_engagement() -> None:
    section = "importlinter:contract:engagement-is-not-an-employer-signal"
    contracts = _contracts()
    assert contracts.has_section(section), f"{section} was removed from .importlinter"
    assert contracts[section]["type"].strip() == "forbidden"
    assert {"app.modules.discovery", "app.modules.employer"} <= _lines(
        contracts[section]["source_modules"]
    )
    assert _lines(contracts[section]["forbidden_modules"]) == {"app.modules.engagement"}


# --- no event path from a streak to scoring -------------------------------
def test_no_engagement_event_triggers_scoring() -> None:
    """The subscription is where a trigger would be wired, and it would pass
    `lint-imports`: the routing table holds task *names*, not imports."""
    wired = {
        event: tasks
        for event, tasks in EVENT_SUBSCRIPTIONS.items()
        if event.startswith(f"{engagement_events.MODULE}.")
        and any(task.startswith("scoring.") for task in tasks)
    }
    assert not wired, f"engagement events routed to scoring: {wired}"


def test_the_guard_above_knows_the_real_event_names() -> None:
    """Guards the guard: if the events were renamed out of the prefix, the
    scan above would pass vacuously."""
    for name in (engagement_events.STREAK_BROKEN, engagement_events.MILESTONE_REACHED):
        assert name.startswith(f"{engagement_events.MODULE}.")


# --- schemas --------------------------------------------------------------
def test_the_engagement_module_defines_schemas() -> None:
    assert _schemas(engagement_schemas), "no engagement schemas found -- has the module moved?"


@pytest.mark.parametrize("model", _schemas(engagement_schemas), ids=lambda m: m.__name__)
def test_no_engagement_field_is_named_like_the_score(model: type[BaseModel]) -> None:
    """`points_balance`, never `score` or `value`. A client that drew both
    numbers side by side would present them as one thing."""
    offending = {
        name
        for name in model.model_fields
        if "score" in name or name in {"value", "band", "raw_value"}
    }
    assert not offending, f"{model.__name__} has score-like fields: {sorted(offending)}"
    assert model.model_config.get("extra") == "forbid"


@pytest.mark.parametrize(
    "module", [m for m in ALL_MODULES if m.name != "engagement"], ids=lambda m: m.name
)
def test_no_other_module_serves_streak_fields(module: object) -> None:
    """The import contract stops a module *reading* engagement. This stops one
    re-deriving the same fields and serving them -- to an employer, say."""
    name = getattr(module, "name", "")
    try:
        schemas = importlib.import_module(f"app.modules.{name}.schemas")
    except ModuleNotFoundError:  # pragma: no cover - every module has one today
        return
    leaked = {
        f"{model.__name__}.{field}"
        for model in _schemas(schemas)
        for field in model.model_fields
        if field in STREAK_FIELDS
    }
    assert not leaked, f"{name} serves streak fields: {sorted(leaked)}"
