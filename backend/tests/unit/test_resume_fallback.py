"""When OCR is used, and when it is deliberately not.

Textract bills per page, so *not* calling it is as much a requirement as
calling it. These use fakes rather than AWS: the decision being tested is
ours, and it has to hold in CI where there are no credentials.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import pytest

from app.modules.resume.parser import (
    MIN_USEFUL_CHARS,
    DocumentTooLongError,
    ExtractedDocument,
    FallbackResumeParser,
    UnreadableDocumentError,
)

REAL_CV = "Priya Sharma, senior engineer. " * 20  # comfortably over the floor


@dataclass
class FakeParser:
    name: str
    text: str = ""
    raises: Exception | None = None
    calls: list[dict[str, object]] = field(default_factory=list)

    @property
    def version(self) -> str:
        return f"{self.name}-v1"

    def extract(
        self,
        *,
        content: bytes,
        mime: str,
        bucket: str | None = None,
        key: str | None = None,
    ) -> ExtractedDocument:
        self.calls.append({"mime": mime, "bucket": bucket, "key": key})
        if self.raises is not None:
            raise self.raises
        return ExtractedDocument(
            text=self.text, page_count=1, parser=self.name, parser_version=self.version
        )


def _chain(local: FakeParser, ocr: FakeParser | None) -> FallbackResumeParser:
    return FallbackResumeParser(local, ocr)


S3 = {"bucket": "b", "key": "k"}


def test_a_readable_cv_never_reaches_ocr() -> None:
    """The cost requirement. A normal CV must be free to parse."""
    local, ocr = FakeParser("local", text=REAL_CV), FakeParser("textract", text="x")
    result = _chain(local, ocr).extract(content=b"x", mime="application/pdf", **S3)

    assert result.parser == "local"
    assert ocr.calls == [], "OCR was billed for a document the local parser read"


def test_a_scan_that_parses_to_nothing_falls_back() -> None:
    """The case the whole design exists for: pypdf reports *success* on a
    phone photo and returns an empty string. Without this the candidate is
    scored as having no experience and nothing errors."""
    local = FakeParser("local", text="")
    ocr = FakeParser("textract", text=REAL_CV)
    result = _chain(local, ocr).extract(content=b"x", mime="application/pdf", **S3)

    assert result.parser == "textract"
    assert len(ocr.calls) == 1


def test_a_stray_header_still_counts_as_empty() -> None:
    """A scan whose text layer holds only a page header is the same problem
    wearing a disguise, so the trigger is a length floor, not `== ''`."""
    local = FakeParser("local", text="x" * (MIN_USEFUL_CHARS - 1))
    ocr = FakeParser("textract", text=REAL_CV)
    assert (
        _chain(local, ocr).extract(content=b"x", mime="application/pdf", **S3).parser == "textract"
    )


def test_text_at_the_floor_is_accepted_without_ocr() -> None:
    local = FakeParser("local", text="x" * MIN_USEFUL_CHARS)
    ocr = FakeParser("textract", text=REAL_CV)
    assert _chain(local, ocr).extract(content=b"x", mime="application/pdf", **S3).parser == "local"
    assert ocr.calls == []


def test_an_unreadable_document_falls_back() -> None:
    local = FakeParser("local", raises=UnreadableDocumentError())
    ocr = FakeParser("textract", text=REAL_CV)
    assert (
        _chain(local, ocr).extract(content=b"x", mime="application/pdf", **S3).parser == "textract"
    )


def test_with_ocr_disabled_the_local_failure_is_what_surfaces() -> None:
    """Turning OCR off must fail loudly, not silently score an empty resume."""
    local = FakeParser("local", raises=UnreadableDocumentError())
    with pytest.raises(UnreadableDocumentError):
        _chain(local, None).extract(content=b"x", mime="application/pdf", **S3)


def test_with_ocr_disabled_empty_text_is_returned_as_is() -> None:
    local = FakeParser("local", text="")
    assert _chain(local, None).extract(content=b"x", mime="application/pdf", **S3).text == ""


def test_without_an_s3_location_ocr_is_not_attempted() -> None:
    """Textract reads from S3. With nowhere to read from, the caller should
    get the primary parser's real error, not a confusing one about buckets."""
    local = FakeParser("local", text="")
    ocr = FakeParser("textract", text=REAL_CV)
    _chain(local, ocr).extract(content=b"x", mime="application/pdf")
    assert ocr.calls == []


def test_the_version_names_both_engines() -> None:
    """Invariant 1: a replay must be able to say which engines produced a
    score, including whether OCR was even available at the time."""
    chain = _chain(FakeParser("local"), FakeParser("textract"))
    assert chain.version == "local-v1|textract-v1"
    assert _chain(FakeParser("local"), None).version == "local-v1|off"


def test_a_document_too_long_for_a_cv_is_never_ocrd() -> None:
    """Textract would read the same pages and bill every one of them."""
    local = FakeParser("local", raises=DocumentTooLongError(params={"max_pages": 10}))
    ocr = FakeParser("textract", text=REAL_CV)
    with pytest.raises(DocumentTooLongError):
        _chain(local, ocr).extract(content=b"x", mime="application/pdf", **S3)
    assert ocr.calls == []
