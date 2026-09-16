"""The questionnaire is worth zero points, and the interview never says what
it is worth.

The arithmetic is 700 + 200 resume + 30 course + 60 interviews = 990 exactly
(R10). There is no room in it for the questionnaire, so:

  * its events route to no task at all, and certainly not a scoring one;
  * scoring folds in no questionnaire kind of add-on;
  * no questionnaire or interview schema has a field that could carry a number
    about the candidate's score or points (R11) -- a "completeness score"
    beside the real one would be read as a second score.

Import-linter holds the other half: neither module imports `scoring`.
"""

from __future__ import annotations

import inspect
from pathlib import Path

import pytest
from pydantic import BaseModel

from app.modules.interview import schemas as interview_schemas
from app.modules.questionnaire import events as questionnaire_events
from app.modules.questionnaire import schemas as questionnaire_schemas
from app.tasks.routing import EVENT_SUBSCRIPTIONS, tasks_for

ROOT = Path(__file__).resolve().parents[2]

SCORE_LIKE = ("score", "point", "band", "rating", "rank", "weight", "percentile", "grade")
#: The exceptions, and why: the client-required pre-payment warning, and the
#: candidate's acknowledgement of it. Both are a yes or no, never a number.
ALLOWED = frozenset({"will_increase_score", "acknowledge_no_score_increase"})


def _schemas() -> list[type[BaseModel]]:
    found = []
    for module in (questionnaire_schemas, interview_schemas):
        for _, obj in inspect.getmembers(module, inspect.isclass):
            if issubclass(obj, BaseModel) and obj.__module__ == module.__name__:
                found.append(obj)
    return found


def test_questionnaire_events_trigger_nothing() -> None:
    assert tasks_for(questionnaire_events.SUBMITTED) == ()
    assert not [event for event in EVENT_SUBSCRIPTIONS if event.startswith("questionnaire.")]


def test_scoring_reads_no_questionnaire_add_on() -> None:
    scoring = (ROOT / "app" / "modules" / "scoring" / "service.py").read_text(encoding="utf-8")
    assert "questionnaire" not in scoring


@pytest.mark.parametrize("model", _schemas(), ids=lambda m: f"{m.__module__}.{m.__name__}")
def test_no_add_on_schema_carries_a_score_or_points(model: type[BaseModel]) -> None:
    offending = [
        name
        for name in model.model_fields
        if name not in ALLOWED and any(word in name.lower() for word in SCORE_LIKE)
    ]
    assert not offending, f"{model.__name__} exposes {offending}"


def test_the_schemas_were_found() -> None:
    names = {m.__name__ for m in _schemas()}
    assert {"QuestionnaireView", "SessionResponse", "OfferResponse"} <= names
