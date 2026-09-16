"""Which task runs when a domain event is published.

One table, so "what happens when a resume is confirmed?" has a single answer
that can be read, diffed and tested — rather than being distributed across
however many modules happened to subscribe.

**This is where the confirm gate is enforced as a subscription** (SRS 1.4.4).
Scoring is triggered by `resume.version_confirmed` and nothing else. The
obvious alternative, `resume.version_created`, fires on every parse and every
correction *including unconfirmed ones*, so subscribing to it would score
content the candidate has never reviewed — while every other test in the
suite still passed, because the gate function would remain intact and simply
never be called.

`tests/invariants/test_confirm_gate.py` asserts against this table directly:
the confirmed event must route to the scoring task, and the created event must
route nowhere near it.
"""

from __future__ import annotations

from typing import Final

#: Celery task names. Strings rather than imports, deliberately: the relay
#: enqueues by name and must not drag every module's dependencies into the
#: worker that publishes events.
SCORE_RESUME_TASK: Final = "scoring.score_resume"
RESCORE_FOR_ADDONS_TASK: Final = "scoring.rescore_for_addons"
DETECT_INTEGRITY_TASK: Final = "integrity.detect"
PROCESS_PAYMENT_CALLBACK_TASK: Final = "billing.process_callback"

#: `event_type -> the tasks it triggers`.
#:
#: An event with no entry is published and consumed by nobody, which is
#: ordinary — most events exist for analytics and notifications that arrive on
#: later days. Absence here is not a bug; a *wrong* entry is.
EVENT_SUBSCRIPTIONS: Final[dict[str, tuple[str, ...]]] = {
    # The confirm gate. See the module docstring for why this is the confirmed
    # event and not the created one.
    "resume.version_confirmed": (SCORE_RESUME_TASK,),
    # Add-ons move the score (R1, 2026-08-24), so a completion re-scores.
    # Not `SCORE_RESUME_TASK`: that task is idempotent by resume version and
    # would find the version already scored and stop. The re-score runs
    # Layers 2 and 3 over the stored extraction, so a completion costs no
    # model call and cannot drift the resume-derived part of the number.
    #
    # A course completion (Day 15) and a completed interview session (Day 16).
    # Both are read back by `scoring.service.addons_for`, which applies the
    # caps; the questionnaire is worth nothing and routes nowhere near here.
    "courses.completion_recorded": (RESCORE_FOR_ADDONS_TASK,),
    "interview.session_completed": (RESCORE_FOR_ADDONS_TASK,),
    # A verified gateway callback, stored by the callback route. Settling it
    # grants what was bought; the route itself never does.
    "billing.callback_received": (PROCESS_PAYMENT_CALLBACK_TASK,),
    # Integrity runs once a confirmed version has been scored, because that is
    # the first moment both halves it reads exist: the CV text, and the Layer 1
    # extraction stored on the score row. The task receives the event's
    # `aggregate_id`, which is the score id.
    #
    # Subscribed to the *score* event and not to `resume.version_confirmed`:
    # a confirmation whose extraction fails produces no score and so no
    # extraction to read, and an integrity check against nothing would record
    # a clean result for a CV nobody has read.
    "scoring.score_computed": (DETECT_INTEGRITY_TASK,),
}


def tasks_for(event_type: str) -> tuple[str, ...]:
    """The tasks an event triggers. Empty when nothing subscribes."""
    return EVENT_SUBSCRIPTIONS.get(event_type, ())
