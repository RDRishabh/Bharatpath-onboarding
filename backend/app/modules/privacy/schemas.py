"""privacy - Pydantic request/response DTOs

Export and deletion requests, DSR tracking.

Separate Create / Update / Read schemas. ORM models are never exposed
directly - the schema IS the API contract, and for several modules it is also
where an invariant is enforced structurally.

**`DsrRequestResponse` carries no `export_s3_key` and no `manifest`.** The key
is where a whole person's data sits, and the only way to it is the short-lived
link from `/download`. The manifest is our evidence, written in table names --
the requester is told *that* their data was erased, not given our schema.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class _Base(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")


class DsrRequestResponse(_Base):
    id: uuid.UUID
    type: Literal["EXPORT", "DELETE"]
    state: Literal["RECEIVED", "PROCESSING", "COMPLETED", "REJECTED"]
    created_at: datetime
    #: When we have promised to answer by (SRS 2.13.2).
    due_at: datetime
    completed_at: datetime | None
    #: Deletion only: the end of the cooling-off period. Until then the
    #: request can be withdrawn and nothing has been destroyed.
    erasable_at: datetime | None = None
    #: Export only: whether `/download` will currently answer with a link.
    download_available: bool = False


class DsrRequestList(_Base):
    items: list[DsrRequestResponse]


class ExportDownloadResponse(_Base):
    url: str
    expires_in_seconds: int
