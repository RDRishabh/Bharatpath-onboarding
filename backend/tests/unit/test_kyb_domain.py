"""The KYB state machine, the approval switch, and document rules. Pure."""

from __future__ import annotations

import uuid

import pytest

from app.modules.kyb.domain import (
    EDITABLE_STATES,
    KYB_STATES,
    OPEN_STATES,
    TRANSITIONS,
    document_key,
    reason_required,
    refuse_transition,
    sniff_document,
    state_on_submit,
)
from app.modules.kyb.models import KYB_STATES as MODEL_STATES


def test_the_domain_and_the_database_agree_on_the_states() -> None:
    assert set(KYB_STATES) == set(MODEL_STATES) == set(TRANSITIONS)


def test_the_switch_is_the_only_difference_between_the_two_modes() -> None:
    """R15: with approval off a submission is approved on arrival; with it on
    it waits. Same machine, different target."""
    assert state_on_submit(require_approval=False) == "APPROVED"
    assert state_on_submit(require_approval=True) == "SUBMITTED"
    assert refuse_transition("DRAFT", "APPROVED") is None
    assert refuse_transition("DRAFT", "SUBMITTED") is None


@pytest.mark.parametrize("terminal", ["APPROVED", "REJECTED"])
def test_a_decided_submission_goes_nowhere(terminal: str) -> None:
    assert all(refuse_transition(terminal, target) for target in KYB_STATES)


def test_a_draft_cannot_be_decided_by_a_reviewer_before_it_is_submitted() -> None:
    assert refuse_transition("DRAFT", "REJECTED") == "kyb_invalid_transition"
    assert refuse_transition("DRAFT", "UNDER_REVIEW") == "kyb_invalid_transition"


def test_more_information_leads_back_to_submission() -> None:
    assert refuse_transition("MORE_INFO_REQUIRED", "SUBMITTED") is None
    assert refuse_transition("MORE_INFO_REQUIRED", "REJECTED") == "kyb_invalid_transition"


def test_answers_can_change_only_before_submission_or_when_asked() -> None:
    """Otherwise a reviewer approves one set of answers and the employer is
    verified on another."""
    assert {"DRAFT", "MORE_INFO_REQUIRED"} == EDITABLE_STATES
    assert EDITABLE_STATES <= OPEN_STATES


@pytest.mark.parametrize(
    ("decision", "needs"), [("REJECTED", True), ("MORE_INFO_REQUIRED", True), ("APPROVED", False)]
)
def test_a_refusal_must_say_why(decision: str, needs: bool) -> None:
    assert reason_required(decision) is needs


@pytest.mark.parametrize(
    ("head", "mime"),
    [
        (b"%PDF-1.7\n", "application/pdf"),
        (b"\xff\xd8\xff\xe0\x00\x10JFIF", "image/jpeg"),
        (b"\x89PNG\r\n\x1a\n\x00\x00", "image/png"),
        (b"PK\x03\x04word/", None),
        (b"GIF89a", None),
        (b"", None),
    ],
    ids=["pdf", "jpeg", "png", "docx", "gif", "empty"],
)
def test_a_document_is_what_its_bytes_say(head: bytes, mime: str | None) -> None:
    assert sniff_document(head) == mime


def test_the_document_key_is_built_only_from_ids_we_issued() -> None:
    tenant, submission, upload = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    key = document_key(
        tenant_id=tenant, submission_id=submission, doc_type="doc_pan", upload_id=upload
    )
    assert key == f"kyb/{tenant}/{submission}/doc_pan/{upload}"
