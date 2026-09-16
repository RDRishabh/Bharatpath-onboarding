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
from app.settings import Settings, get_settings

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

    def extract(
        self,
        *,
        content: bytes,
        mime: str,
        bucket: str | None = None,
        key: str | None = None,
    ) -> ExtractedDocument:
        """`bucket`/`key` locate the same document in S3.

        Textract reads multi-page PDFs from S3 rather than from an inline
        byte array -- the synchronous, bytes-in API handles single-page images
        only. The local parser ignores them.
        """
        ...


class LocalResumeParser:
    """pypdf and python-docx, in-process. No network, no per-page cost."""

    name = "local"

    @property
    def version(self) -> str:
        """Pins everything that can change the output. A pypdf upgrade
        produces a different version string, so scores extracted before and
        after are distinguishable rather than silently mixed."""
        return f"{EXTRACTOR_REVISION}+pypdf{pypdf.__version__}+docx{docx.__version__}"

    def extract(
        self,
        *,
        content: bytes,
        mime: str,
        bucket: str | None = None,
        key: str | None = None,
    ) -> ExtractedDocument:
        if mime == "application/pdf":
            text, pages = self._pdf(content)
        elif mime == DOCX:
            text, pages = self._docx(content)
        elif mime == "application/msword":
            # Legacy OLE2 .doc. Refused at upload since 2026-09-15 (blockers
            # E3); this branch remains for files accepted before that, so they
            # fail with the same actionable code rather than a generic one.
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


#: Below this, extracted text is treated as nothing at all. A CV with fewer
#: characters than this is not a CV -- it is a scan whose text layer holds a
#: stray header, which is exactly the case OCR exists to rescue.
MIN_USEFUL_CHARS: Final = 120


class FallbackResumeParser:
    """Local libraries first; OCR only when they cannot read the document.

    The interesting trigger is not an exception -- it is **success with no
    text**. A phone photo saved as a PDF parses cleanly and yields an empty
    string, so a parser that only fell back on errors would score that
    candidate as having no experience and never notice. Short output is
    therefore treated the same as failure.

    Cost follows from that ordering: a normal CV never reaches Textract, so
    the per-page bill is paid only for documents that genuinely need OCR.
    """

    name = "local+textract"

    def __init__(self, primary: ResumeParser, fallback: ResumeParser | None) -> None:
        self._primary = primary
        self._fallback = fallback

    @property
    def version(self) -> str:
        fallback = self._fallback.version if self._fallback else "off"
        return f"{self._primary.version}|{fallback}"

    def extract(
        self,
        *,
        content: bytes,
        mime: str,
        bucket: str | None = None,
        key: str | None = None,
    ) -> ExtractedDocument:
        reason: str
        try:
            result = self._primary.extract(content=content, mime=mime, bucket=bucket, key=key)
        except AppError as exc:
            if self._fallback is None:
                raise
            reason = exc.code
        else:
            if len(result.text) >= MIN_USEFUL_CHARS or self._fallback is None:
                # The common path: a normal CV, read for nothing.
                return result
            reason = "empty_extraction"

        if not bucket or not key:
            # Nothing to OCR from. Re-run the primary so the caller gets the
            # real reason rather than a confusing "no location" error.
            logger.warning("ocr_skipped_no_s3_location", mime=mime, reason=reason)
            return self._primary.extract(content=content, mime=mime)

        logger.info("ocr_fallback", mime=mime, reason=reason)
        return self._fallback.extract(content=content, mime=mime, bucket=bucket, key=key)


def get_resume_parser(settings: Settings | None = None) -> ResumeParser:
    """The single place a parser is chosen."""
    settings = settings or get_settings()
    if not settings.resume_textract_fallback_enabled:
        # Deliberate: with OCR off, a scanned CV fails loudly rather than
        # being scored as an empty resume.
        return LocalResumeParser()

    from app.modules.resume.textract import TextractResumeParser

    return FallbackResumeParser(LocalResumeParser(), TextractResumeParser(settings))
