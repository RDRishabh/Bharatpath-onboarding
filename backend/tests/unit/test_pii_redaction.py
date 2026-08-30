"""The structlog redaction filter. Invariant-adjacent, and cheap to prove.

A log aggregator full of resumes and phone numbers is a data store nobody is
treating like one. Under the DPDP Act that matters.
"""

from __future__ import annotations

import pytest

from app.core.logging import REDACTION, redact_pii


@pytest.mark.parametrize(
    "event",
    [
        {"phone": "+919876543210"},
        {"email": "candidate@example.com"},
        {"otp": "483920"},
        {"otp_code": "483920"},
        {"full_name": "A Candidate"},
        {"resume_text": "20 years at ..."},
        {"authorization": "Bearer eyJhbGciOi..."},
        {"cognito_sub": "8f40a217-a65d-4df8"},
    ],
)
def test_sensitive_keys_are_redacted(event: dict[str, str]) -> None:
    out = redact_pii(None, "info", dict(event))
    for key in event:
        assert out[key] == REDACTION, f"{key} leaked into the log"


def test_nested_pii_is_redacted() -> None:
    out = redact_pii(None, "info", {"user": {"phone": "+919876543210", "id": "abc"}})
    assert out["user"]["phone"] == REDACTION
    assert out["user"]["id"] == "abc", "non-PII must survive"


def test_pii_inside_a_free_string_is_redacted() -> None:
    """Belt and braces for the case where PII arrives inside a message."""
    out = redact_pii(None, "info", {"event": "sent to candidate@example.com ok"})
    assert "candidate@example.com" not in out["event"]


def test_ordinary_fields_survive() -> None:
    out = redact_pii(None, "info", {"event": "score_computed", "score": 790})
    assert out["event"] == "score_computed"
    assert out["score"] == 790
