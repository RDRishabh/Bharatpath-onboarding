"""kyb - pure domain logic

Submissions, documents, review state machine.

No I/O. No database, no HTTP, no clock, no randomness that is not passed in.
mypy runs in strict mode here and import-linter forbids I/O imports, because
this is the layer the invariant property tests exercise directly.

**Built in full, then short-circuited by one switch** (R15, confirmed
2026-08-27). With `kyb.require_approval` off -- the default -- a submission
goes straight to APPROVED and is marked `auto_approved`. Turn it on and the
same submission waits at SUBMITTED for a human. The state machine is the same
either way; only the target of a submit changes. That is what makes turning
verification back on a config change instead of a new gate retrofitted into a
live marketplace.
"""

from __future__ import annotations

import uuid
from typing import Final

#: SRS 1.20.7.
KYB_STATES: Final = (
    "DRAFT",
    "SUBMITTED",
    "UNDER_REVIEW",
    "APPROVED",
    "REJECTED",
    "MORE_INFO_REQUIRED",
)

TRANSITIONS: Final[dict[str, frozenset[str]]] = {
    "DRAFT": frozenset({"SUBMITTED", "APPROVED"}),
    "SUBMITTED": frozenset({"UNDER_REVIEW", "APPROVED", "REJECTED", "MORE_INFO_REQUIRED"}),
    "UNDER_REVIEW": frozenset({"APPROVED", "REJECTED", "MORE_INFO_REQUIRED"}),
    "MORE_INFO_REQUIRED": frozenset({"SUBMITTED", "APPROVED"}),
    # Terminal. A rejected organisation starts a new submission; an approved
    # one is verified, and changing that is a review action, not a transition.
    "APPROVED": frozenset(),
    "REJECTED": frozenset(),
}

#: A submission that is still in progress. At most one per organisation --
#: two open submissions would make "is this employer verified?" depend on
#: which one a query found first. Held by a partial unique index.
OPEN_STATES: Final[frozenset[str]] = frozenset(
    {"DRAFT", "SUBMITTED", "UNDER_REVIEW", "MORE_INFO_REQUIRED"}
)

#: Answers and documents can change only before submission, or when a
#: reviewer has asked for more. Otherwise a reviewer could approve one set of
#: answers and the employer be verified on another.
EDITABLE_STATES: Final[frozenset[str]] = frozenset({"DRAFT", "MORE_INFO_REQUIRED"})

REVIEW_DECISIONS: Final[frozenset[str]] = frozenset({"APPROVED", "REJECTED", "MORE_INFO_REQUIRED"})


def refuse_transition(current: str, target: str) -> str | None:
    if target not in TRANSITIONS.get(current, frozenset()):
        return "kyb_invalid_transition"
    return None


def state_on_submit(*, require_approval: bool) -> str:
    """Where a complete submission goes. The whole of the R15 switch."""
    return "SUBMITTED" if require_approval else "APPROVED"


def reason_required(decision: str) -> bool:
    """A rejection must say why (SRS 1.11.3), and so must a request for more
    information -- "please provide more" with no hint of what is not a
    request anyone can act on."""
    return decision in {"REJECTED", "MORE_INFO_REQUIRED"}


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------
#: Photographs of documents are explicitly allowed by the form, so images are
#: accepted alongside PDF. Word documents are not: a registration certificate
#: is issued as a scan or a PDF, never as an editable file.
ACCEPTED_DOCUMENT_TYPES: Final = ("application/pdf", "image/jpeg", "image/png")

MAX_DOCUMENT_BYTES: Final = 10 * 1024 * 1024

_SIGNATURES: Final[tuple[tuple[bytes, str], ...]] = (
    (b"%PDF-", "application/pdf"),
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
)


def sniff_document(head: bytes) -> str | None:
    """What the stored bytes are. The filename and declared type are never
    consulted -- both are the uploader's to choose."""
    for signature, mime in _SIGNATURES:
        if head.startswith(signature):
            return mime
    return None


def document_key(
    *, tenant_id: uuid.UUID, submission_id: uuid.UUID, doc_type: str, upload_id: uuid.UUID
) -> str:
    """Where a document lives, derived entirely from ids we issued.

    **The client never supplies a key.** A presigned PUT authorises exactly the
    key it was signed for, so a client-chosen key would let one employer write
    into another's documents. Rebuilding it from the authenticated tenant also
    means completing someone else's upload looks in your own prefix and finds
    nothing.
    """
    return f"kyb/{tenant_id}/{submission_id}/{doc_type}/{upload_id}"
