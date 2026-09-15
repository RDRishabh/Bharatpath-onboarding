"""Textract OCR, used only when the local libraries cannot read a document.

**Why a fallback and not the default.** Textract bills per page with no free
tier. pypdf and python-docx read a normal CV for nothing, so paying for those
would be paying for the common case.

**Why a fallback at all.** A scanned CV -- a phone photo saved as a PDF, which
is common in this market -- has no text layer. pypdf returns an empty string
and reports *success*. Without OCR that candidate is scored as having no
experience: a silent wrong answer, which is worse than an error. Empty output
is therefore a fallback trigger, not just an exception.

Textract runs in `ap-south-1`, so CV text stays in India while N2 is open.
"""

from __future__ import annotations

import time
from typing import Any, Final

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from app.core.logging import get_logger
from app.modules.resume.parser import (
    ExtractedDocument,
    UnreadableDocumentError,
    UnsupportedDocumentError,
)
from app.settings import Settings, get_settings

logger = get_logger(__name__)

#: Bump when the calling logic changes in a way that alters extracted text.
EXTRACTOR_REVISION: Final = "1"

_textract_client: Any | None = None


def get_textract_client() -> Any:
    global _textract_client
    if _textract_client is None:
        settings = get_settings()
        _textract_client = boto3.client(
            "textract",
            region_name=settings.aws_region,
            config=Config(retries={"max_attempts": 3, "mode": "standard"}),
        )
    return _textract_client


def dispose_textract() -> None:
    global _textract_client
    if _textract_client is not None:
        _textract_client.close()
        _textract_client = None


class TextractUnavailableError(UnreadableDocumentError):
    """OCR was needed and could not be performed.

    Every Textract failure arrives here rather than as a raw botocore
    exception, because they are all the same thing to a candidate: we could
    not read the file. A throttle, an unactivated account and a dead region
    are operational details that belong in the log, not in a 500.
    """

    code = "resume_ocr_unavailable"
    title = "Could not read the document"


class TextractResumeParser:
    """Asynchronous document text detection, read from S3.

    Async rather than the synchronous API deliberately: `DetectDocumentText`
    with an inline byte array handles single-page images only, and a CV is
    routinely a multi-page PDF. The object is already in S3, so pointing
    Textract at it also avoids sending the bytes twice.
    """

    name = "textract"

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()

    @property
    def version(self) -> str:
        return f"{EXTRACTOR_REVISION}+detect_document_text"

    def extract(
        self,
        *,
        content: bytes,
        mime: str,
        bucket: str | None = None,
        key: str | None = None,
    ) -> ExtractedDocument:
        del content  # Textract reads from S3; the bytes are not sent again.

        if not bucket or not key:
            # Not a user error -- a caller that did not pass the location.
            raise UnsupportedDocumentError(params={"mime": mime})

        client = get_textract_client()
        try:
            started = client.start_document_text_detection(
                DocumentLocation={"S3Object": {"Bucket": bucket, "Name": key}}
            )
            job_id = started["JobId"]
            logger.info("textract_started", job_id=job_id, mime=mime)
            pages, page_count = self._collect(client, job_id)
        except (ClientError, BotoCoreError) as exc:
            # A brand-new AWS account raises SubscriptionRequiredException
            # here until activation completes, which is hours -- and it must
            # not be a 500 for the candidate.
            code = (
                exc.response.get("Error", {}).get("Code", "unknown")
                if isinstance(exc, ClientError)
                else type(exc).__name__
            )
            logger.warning("textract_unavailable", error_code=code, bucket=bucket, key=key)
            raise TextractUnavailableError(params={"reason": code}) from exc
        return ExtractedDocument(
            text="\n".join(pages).strip(),
            page_count=page_count,
            parser=self.name,
            parser_version=self.version,
        )

    def _collect(self, client: Any, job_id: str) -> tuple[list[str], int]:
        deadline = time.monotonic() + self._settings.resume_textract_timeout_seconds
        lines: list[str] = []
        page_count = 0
        next_token: str | None = None
        polls = 0

        while True:
            if time.monotonic() > deadline:
                logger.warning("textract_timeout", job_id=job_id, polls=polls)
                raise TextractUnavailableError(params={"reason": "timeout"})

            kwargs: dict[str, Any] = {"JobId": job_id}
            if next_token:
                kwargs["NextToken"] = next_token
            response = client.get_document_text_detection(**kwargs)
            status = response["JobStatus"]

            if status == "IN_PROGRESS":
                polls += 1
                time.sleep(self._settings.resume_textract_poll_seconds)
                continue
            if status == "FAILED":
                logger.warning(
                    "textract_failed", job_id=job_id, message=response.get("StatusMessage")
                )
                raise TextractUnavailableError(params={"reason": "failed"})

            page_count = max(page_count, int(response.get("DocumentMetadata", {}).get("Pages", 0)))
            if page_count > self._settings.resume_textract_max_pages:
                # Billing is per page, so an unbounded document is an
                # unbounded bill. Stop rather than finish and be surprised.
                logger.warning("textract_too_many_pages", job_id=job_id, pages=page_count)
                raise TextractUnavailableError(params={"reason": "too_many_pages"})

            lines.extend(
                block["Text"]
                for block in response.get("Blocks", [])
                if block.get("BlockType") == "LINE" and block.get("Text")
            )

            next_token = response.get("NextToken")
            if not next_token:
                return lines, page_count
