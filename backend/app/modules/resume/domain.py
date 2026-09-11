"""resume - pure domain logic

Upload, parse jobs, versions, review and confirm.

No I/O. No database, no HTTP, no clock, no randomness that is not passed in.
mypy runs in strict mode here and import-linter forbids I/O imports, because
this is the layer the invariant property tests exercise directly.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Final

#: Magic numbers, longest first so a prefix never shadows a longer match.
#:
#: **The declared Content-Type and the filename are both attacker-controlled**
#: (SRS 1.4.2), so neither is consulted. A file is what its bytes say it is.
#: DOCX is a ZIP container, which is why it and any other OOXML share a
#: signature -- `sniff_mime` resolves that ambiguity below.
_SIGNATURES: Final[tuple[tuple[bytes, str], ...]] = (
    (b"%PDF-", "application/pdf"),
    # Legacy .doc: the OLE2 compound-document header.
    (b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1", "application/msword"),
    # Any ZIP. DOCX is a ZIP; so is a JAR and so is a zip bomb.
    (b"PK\x03\x04", "application/zip"),
    (b"PK\x05\x06", "application/zip"),  # empty archive
    (b"PK\x07\x08", "application/zip"),  # spanned archive
)

DOCX: Final = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

#: A DOCX always carries this, and a plain ZIP does not. Checking for it is
#: what stops any renamed `.zip` walking in through the DOCX door.
_DOCX_MARKER: Final = b"word/"


@dataclass(frozen=True, slots=True)
class UploadRejection:
    """Why an upload cannot become a resume. `code` is the API error code."""

    code: str
    detail: str


def sniff_mime(head: bytes) -> str | None:
    """Identify a document from its leading bytes. `None` means unrecognised.

    Only the `head` is needed -- every signature here lives in the first few
    bytes. The DOCX marker is normally in the first KiB too, in the local file
    header for `word/document.xml`; a DOCX whose marker falls outside the
    sniffed window reads as a plain ZIP and is rejected. That is the safe
    direction to be wrong in.
    """
    for signature, mime in _SIGNATURES:
        if head.startswith(signature):
            if mime == "application/zip":
                return DOCX if _DOCX_MARKER in head else "application/zip"
            return mime
    return None


def validate_upload(
    *,
    head: bytes,
    size_bytes: int,
    max_bytes: int,
    allowed: list[str],
) -> UploadRejection | None:
    """The complete gate between an uploaded object and a `resume_files` row.

    Returns the reason to refuse, or `None` to accept. Pure, so every branch
    is testable without S3 -- and callable again later against the same bytes
    if the caps ever change.

    Order matters: size is checked before content, so an oversized upload is
    refused without reading it.
    """
    if size_bytes <= 0:
        return UploadRejection("upload_empty", "The uploaded file is empty.")

    if size_bytes > max_bytes:
        return UploadRejection(
            "upload_too_large",
            f"File is {size_bytes} bytes; the limit is {max_bytes}.",
        )

    mime = sniff_mime(head)
    if mime is None:
        return UploadRejection(
            "upload_unrecognised_type",
            "The file is not a PDF or Word document.",
        )
    if mime not in allowed:
        return UploadRejection(
            "upload_unsupported_type",
            f"{mime} is not an accepted resume format.",
        )
    return None


def upload_key(*, user_id: uuid.UUID, upload_id: uuid.UUID) -> str:
    """Where the object lives, derived server-side from ids we issued.

    **The client never supplies a key.** If it did, one candidate could name
    another candidate's prefix and overwrite their CV -- a presigned PUT
    authorises exactly the key it was signed for, so the key *is* the
    authorisation. Deriving it from the authenticated user closes that.
    """
    return f"resumes/{user_id}/{upload_id}"


def normalise_pasted_text(raw: str) -> str:
    """Collapse the whitespace a paste from a PDF viewer brings with it.

    Kept here rather than in the service because the parser must see exactly
    what was stored: scoring has to be reproducible from the stored text
    (invariant 1), so normalisation happens once, before persistence, never
    again afterwards.
    """
    lines = [line.strip() for line in raw.replace("\r\n", "\n").replace("\r", "\n").split("\n")]
    out: list[str] = []
    blank = False
    for line in lines:
        if line:
            out.append(line)
            blank = False
        elif not blank:
            out.append("")
            blank = True
    return "\n".join(out).strip()
