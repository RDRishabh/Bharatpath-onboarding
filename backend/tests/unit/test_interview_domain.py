"""The mock interview's pure rules: the device check, answers, the session
machine, and whether a purchase can still move the score."""

from __future__ import annotations

import uuid
from dataclasses import fields
from datetime import UTC, datetime, timedelta

import pytest

from app.modules.interview.bank import QUESTIONS_PER_SESSION, SESSIONS_THAT_EARN_POINTS
from app.modules.interview.domain import (
    COMPLETED_STATES,
    DEVICE_CHECK_VALID_FOR,
    MAX_ANSWER_BYTES,
    MAX_ANSWER_MS,
    MIN_ANSWER_BYTES,
    MIN_NETWORK_KBPS,
    MIN_STORAGE_MB,
    OPEN_STATES,
    POINTS_PER_SESSION,
    SESSION_STATES,
    SESSION_TRANSITIONS,
    DeviceReadings,
    answer_key,
    can_complete,
    device_check_is_fresh,
    evaluate_device_check,
    purchase_earns_points,
    sniff_audio,
    valid_question_index,
    validate_answer,
)
from app.modules.scoring.domain import MAX_INTERVIEW_POINTS

GOOD = DeviceReadings(
    mic_ok=True, audio_out_ok=True, network_kbps=64, storage_mb=500, quiet_env_ok=True
)
OGG = b"OggS" + b"\x00" * 60


def _readings(**overrides: object) -> DeviceReadings:
    values = {f.name: getattr(GOOD, f.name) for f in fields(DeviceReadings)}
    values.update(overrides)
    return DeviceReadings(**values)  # type: ignore[arg-type]


# --- the device check -------------------------------------------------------------
def test_a_working_device_passes() -> None:
    decision = evaluate_device_check(GOOD)
    assert decision.passed and decision.failures == ()


def test_every_failing_check_is_reported_at_once() -> None:
    decision = evaluate_device_check(
        DeviceReadings(
            mic_ok=False, audio_out_ok=False, network_kbps=None, storage_mb=None, quiet_env_ok=False
        )
    )
    assert not decision.passed
    assert decision.failures == (
        "microphone_unavailable",
        "audio_output_unavailable",
        "network_too_slow",
        "storage_insufficient",
        "environment_too_noisy",
    )


@pytest.mark.parametrize(
    ("override", "failure"),
    [
        ({"network_kbps": MIN_NETWORK_KBPS - 1}, "network_too_slow"),
        ({"storage_mb": MIN_STORAGE_MB - 1}, "storage_insufficient"),
        ({"mic_ok": False}, "microphone_unavailable"),
    ],
)
def test_each_threshold_fails_on_its_own(override: dict[str, object], failure: str) -> None:
    assert evaluate_device_check(_readings(**override)).failures == (failure,)


def test_the_thresholds_are_inclusive() -> None:
    assert evaluate_device_check(
        _readings(network_kbps=MIN_NETWORK_KBPS, storage_mb=MIN_STORAGE_MB)
    ).passed


def test_the_device_check_has_no_camera_or_lighting() -> None:
    """Audio only (Q3). A camera or lighting reading is a product change."""
    names = {f.name for f in fields(DeviceReadings)}
    assert names == {"mic_ok", "audio_out_ok", "network_kbps", "storage_mb", "quiet_env_ok"}
    assert not {n for n in names if any(w in n for w in ("camera", "video", "light"))}


def test_a_passed_check_goes_stale() -> None:
    checked = datetime(2026, 9, 16, 10, tzinfo=UTC)
    assert device_check_is_fresh(checked_at=checked, now=checked)
    assert device_check_is_fresh(checked_at=checked, now=checked + DEVICE_CHECK_VALID_FOR / 2)
    assert not device_check_is_fresh(checked_at=checked, now=checked + DEVICE_CHECK_VALID_FOR)
    assert not device_check_is_fresh(checked_at=checked, now=checked - timedelta(seconds=1))


# --- buying -----------------------------------------------------------------------
def test_only_the_first_three_sessions_earn_points() -> None:
    assert [purchase_earns_points(sessions_held=n) for n in range(6)] == [
        True,
        True,
        True,
        False,
        False,
        False,
    ]


def test_the_warning_agrees_with_the_scoring_cap() -> None:
    """The app warns at the point where scoring stops counting."""
    assert SESSIONS_THAT_EARN_POINTS * POINTS_PER_SESSION == MAX_INTERVIEW_POINTS
    assert POINTS_PER_SESSION == 20


# --- the session ------------------------------------------------------------------
def test_the_session_machine_only_moves_forward() -> None:
    assert {s for pair in SESSION_TRANSITIONS for s in pair} <= SESSION_STATES
    for completed in COMPLETED_STATES:
        assert (completed, "ABANDONED") not in SESSION_TRANSITIONS
        assert not {(completed, open_state) for open_state in OPEN_STATES} & SESSION_TRANSITIONS
    assert ("CREATED", "COMPLETED") not in SESSION_TRANSITIONS, "no completion without recording"


def test_completion_needs_every_answer() -> None:
    every = set(range(QUESTIONS_PER_SESSION))
    assert can_complete(stored_indexes=every)
    assert not can_complete(stored_indexes=every - {3})
    assert not can_complete(stored_indexes=set())


# --- answers ----------------------------------------------------------------------
@pytest.mark.parametrize(
    ("head", "mime"),
    [
        (b"OggS\x00\x02", "audio/ogg"),
        (b"\x1a\x45\xdf\xa3\x01", "audio/webm"),
        (b"\x00\x00\x00\x20ftypM4A \x00", "audio/mp4"),
        (b"\xff\xf1\x50\x80", "audio/aac"),
        (b"\xff\xf9\x50\x80", "audio/aac"),
        (b"%PDF-1.7", None),
        (b"RIFF\x00\x00\x00\x00WAVE", None),
        (b"\xff\xfb\x90\x00", None),  # MP3: not an accepted format
        (b"", None),
    ],
)
def test_audio_is_identified_by_its_bytes(head: bytes, mime: str | None) -> None:
    assert sniff_audio(head) == mime


def test_an_answer_is_judged_on_size_format_and_duration() -> None:
    assert validate_answer(head=OGG, size_bytes=20_000, duration_ms=30_000) is None
    cases = {
        "answer_too_large": {"size_bytes": MAX_ANSWER_BYTES + 1},
        "answer_too_small": {"size_bytes": MIN_ANSWER_BYTES - 1},
        "answer_not_audio": {"head": b"%PDF-1.4" + b"\x00" * 56},
        "answer_duration_out_of_range": {"duration_ms": MAX_ANSWER_MS + 1},
    }
    for code, override in cases.items():
        args: dict[str, object] = {"head": OGG, "size_bytes": 20_000, "duration_ms": 30_000}
        args.update(override)
        rejection = validate_answer(**args)  # type: ignore[arg-type]
        assert rejection is not None and rejection.code == code


def test_the_key_is_derived_from_issued_ids_only() -> None:
    user, session = uuid.uuid4(), uuid.uuid4()
    assert answer_key(user_id=user, session_id=session, question_index=2) == (
        f"interview-audio/{user}/{session}/2"
    )
    assert [valid_question_index(i) for i in (-1, 0, QUESTIONS_PER_SESSION - 1)] == [
        False,
        True,
        True,
    ]
    assert not valid_question_index(QUESTIONS_PER_SESSION)
