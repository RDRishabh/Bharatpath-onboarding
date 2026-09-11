"""Text extraction from an uploaded CV.

An interface with one implementation today. Textract is deferred -- it bills
per page, and while **N2 (may CV text leave India?) is unanswered**, keeping
extraction in-process is the answer that cannot be wrong. See CLAUDE.md.

**Every extraction records which engine produced it.** That is not
bookkeeping. Invariant 1 requires a score to be reproducible from the stored
extraction chain, and a different parser yields different text and therefore a
different score. Storing `parser` and `parser_version` is what lets a replay
say *"this score came from pypdf 6.18"* rather than silently producing a
different number later. Changing parser is a **re-score**, not an upgrade.
"""

from __future__ import annotations

import io
from dataclasses import dataclass
from typing import Final, Protocol, runtime_checkable

import docx
import pypdf
from fastapi import status

from app.core.errors import AppError
from app.core.logging import get_logger
from app.modules.resume.domain import DOCX

logger = get_logger(__name__)

#: Bump when the extraction *logic* changes in a way that alters output --
#: not when an unrelated line moves. Library versions are appended
#: automatically, so a pypdf upgrade is already visible without touching this.
EXTRACTOR_REVISION: Final = "1"

#: A CV is a handful of pages. A document far past that is either not a CV or
#: is an attempt to burn worker time, and either way it is not worth parsing
#: in full.
MAX_PAGES: Final = 40


# Distinct codes rather than English prose. The client renders the message in
# the candidate's language (plan.md N9 lists six to eight), so an error that
# carries a pre-written English sentence is untranslatable by construction --
# which is why `AppError` takes `params` for substitution and not a string.
class UnsupportedDocumentError(AppError):
    """A type we accept at upload but cannot read."""

    status_code = status.HTTP_422_UNPROCESSABLE_CONTENT
    code = "resume_unsupported_document"
    title = "Unsupported document"


class LegacyDocUnsupportedError(UnsupportedDocumentError):
    """Legacy OLE2 `.doc`. Separate from the general case because the client
    can tell the candidate exactly what to do: save as PDF or .docx."""

    code = "resume_legacy_doc_unsupported"
    title = "Legacy Word document"


class UnreadableDocumentError(AppError):
    """The right type, but truncated or corrupt."""

    status_code = status.HTTP_422_UNPROCESSABLE_CONTENT
    code = "resume_unreadable_document"
    title = "Document could not be read"


class EncryptedDocumentError(UnreadableDocumentError):
    """Password protected. A candidate mistake with an obvious remedy, so it
    gets its own code rather than reading as corruption."""

    code = "resume_document_encrypted"
    title = "Document is password protected"


@dataclass(frozen=True, slots=True)
class ExtractedDocument:
    text: str
    page_count: int
    parser: str
    parser_version: str


@runtime_checkable
class ResumeParser(Protocol):
    """What a parser must provide. `TextractResumeParser` will implement this
    unchanged -- that is the point of it being a protocol."""

    @property
    def name(self) -> str: ...

    @property
    def version(self) -> str: ...

    def extract(self, *, content: bytes, mime: str) -> ExtractedDocument: ...


class LocalResumeParser:
    """pypdf and python-docx, in-process. No network, no per-page cost."""

    name = "local"

    @property
    def version(self) -> str:
        """Pins everything that can change the output. A pypdf upgrade
        produces a different version string, so scores extracted before and
        after are distinguishable rather than silently mixed."""
        return f"{EXTRACTOR_REVISION}+pypdf{pypdf.__version__}+docx{docx.__version__}"

    def extract(self, *, content: bytes, mime: str) -> ExtractedDocument:
        if mime == "application/pdf":
            text, pages = self._pdf(content)
        elif mime == DOCX:
            text, pages = self._docx(content)
        elif mime == "application/msword":
            # Legacy OLE2 .doc. No maintained pure-Python reader exists, and
            # the alternatives are native binaries in the image. Accepted at
            # upload today and refused here -- tracked in docs/progress.md
            # under "Deferred by decision"; decide before launch whether to
            # convert or to stop accepting it.
            raise LegacyDocUnsupportedError()
        else:
            raise UnsupportedDocumentError(params={"mime": mime})

        return ExtractedDocument(
            text=text.strip(),
            page_count=pages,
            parser=self.name,
            parser_version=self.version,
        )

    def _pdf(self, content: bytes) -> tuple[str, int]:
        try:
            reader = pypdf.PdfReader(io.BytesIO(content))
            if reader.is_encrypted:
                # A password-protected CV is a user mistake, not an attack.
                # It needs a message they can act on, not a 500.
                raise EncryptedDocumentError()
            pages = reader.pages[:MAX_PAGES]
            return "\n".join(page.extract_text() or "" for page in pages), len(reader.pages)
        except UnreadableDocumentError:
            raise
        except Exception as exc:  # pypdf raises a wide range on malformed input
            logger.warning("pdf_extract_failed", error=str(exc))
            raise UnreadableDocumentError(params={"mime": "application/pdf"}) from exc

    def _docx(self, content: bytes) -> tuple[str, int]:
        try:
            document = docx.Document(io.BytesIO(content))
        except Exception as exc:
            logger.warning("docx_extract_failed", error=str(exc))
            raise UnreadableDocumentError(params={"mime": DOCX}) from exc

        parts = [p.text for p in document.paragraphs]

        # **Tables are not optional.** A large share of CV templates lay the
        # whole document out in a borderless table, and `document.paragraphs`
        # returns nothing for those -- the failure mode is a silently empty
        # resume that scores as though the candidate had no experience.
        for table in document.tables:
            for row in table.rows:
                cells = [cell.text.strip() for cell in row.cells]
                # A row's cells repeat across a horizontal merge; collapsing
                # neighbours keeps a merged heading from appearing four times.
                deduped = [c for i, c in enumerate(cells) if c and (i == 0 or c != cells[i - 1])]
                if deduped:
                    parts.append(" | ".join(deduped))

        # .docx has no page count without rendering it; pagination is decided
        # by the renderer, not stored in the file. 0 means "not applicable".
        return "\n".join(parts), 0


def get_resume_parser() -> ResumeParser:
    """The single place a parser is chosen. Textract switches here."""
    return LocalResumeParser()
