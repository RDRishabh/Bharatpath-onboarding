"""S3 access: presigned URLs in, ranged reads back.

**Every bucket is private.** Objects reach clients only through presigned URLs
with a short expiry, never a public read (SRS 1.4.2) -- the buckets carry a
public-access block in `infra/terraform/s3.tf`, so a mistake here fails rather
than quietly publishing a CV.

boto3 is synchronous. Each call is pushed to a worker thread instead of being
awaited directly, because a blocking socket read on the event loop stalls every
other request in the process, and an S3 round trip to Mumbai is long enough to
notice.
"""

from __future__ import annotations

import asyncio
from typing import Any

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.logging import get_logger
from app.settings import get_settings

logger = get_logger(__name__)


#: One client for the process. boto3 clients are thread-safe and hold a
#: connection pool, so building one per request would throw that pool away
#: every time. Not `lru_cache` keyed on Settings -- Settings is a Pydantic
#: model and is not hashable.
_s3_client: Any | None = None


def get_s3_client() -> Any:
    global _s3_client
    if _s3_client is None:
        settings = get_settings()
        # The regional endpoint is pinned explicitly rather than left to
        # boto3. Given only `region_name`, boto3 signs presigned URLs against
        # the global host `<bucket>.s3.amazonaws.com`, and S3 answers a PUT
        # there with `307 Temporary Redirect` to the regional host. Browsers
        # and mobile HTTP clients do not resend a PUT body across a redirect,
        # so every upload from a real client fails while a curl test passes.
        endpoint = settings.aws_endpoint_url or f"https://s3.{settings.aws_region}.amazonaws.com"
        _s3_client = boto3.client(
            "s3",
            region_name=settings.aws_region,
            endpoint_url=endpoint,
            config=Config(
                signature_version="s3v4",
                retries={"max_attempts": 3, "mode": "standard"},
            ),
        )
    return _s3_client


def dispose_s3() -> None:
    """Drop the cached client. Called on shutdown and by tests that swap
    settings, so a stale endpoint or credential never outlives its config."""
    global _s3_client
    if _s3_client is not None:
        _s3_client.close()
        _s3_client = None


async def presign_put(*, bucket: str, key: str, expires_in: int) -> str:
    """A URL that authorises writing exactly this key, and nothing else.

    Content-Type is deliberately not bound into the signature. Binding it
    would only force the client to repeat a value we refuse to trust anyway --
    the type is sniffed from the stored bytes afterwards.
    """
    client = get_s3_client()
    return await asyncio.to_thread(
        client.generate_presigned_url,
        "put_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expires_in,
    )


async def presign_get(*, bucket: str, key: str, expires_in: int) -> str:
    client = get_s3_client()
    return await asyncio.to_thread(
        client.generate_presigned_url,
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expires_in,
    )


async def head_object(*, bucket: str, key: str) -> dict[str, Any] | None:
    """Size and metadata, or `None` if the object is not there.

    A missing object is an ordinary outcome, not an error: it is what a client
    claiming to have finished an upload that never happened looks like.
    """
    client = get_s3_client()
    try:
        response = await asyncio.to_thread(client.head_object, Bucket=bucket, Key=key)
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") in ("404", "NoSuchKey", "NotFound"):
            return None
        raise
    return {
        "size_bytes": int(response["ContentLength"]),
        "etag": str(response.get("ETag", "")).strip('"'),
    }


async def read_head_bytes(*, bucket: str, key: str, count: int) -> bytes:
    """The first `count` bytes, as a ranged GET.

    Ranged rather than whole-object on purpose: identifying a file needs a few
    bytes, and pulling a 10 MB upload into memory to read eight of them is how
    a file-type check becomes a denial-of-service vector.
    """
    client = get_s3_client()
    try:
        response = await asyncio.to_thread(
            client.get_object, Bucket=bucket, Key=key, Range=f"bytes=0-{count - 1}"
        )
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code")
        if code in ("404", "NoSuchKey", "NotFound"):
            return b""
        # A range beyond a short object is not a failure -- read it whole.
        if code == "InvalidRange":
            response = await asyncio.to_thread(client.get_object, Bucket=bucket, Key=key)
        else:
            raise
    body = response["Body"]
    try:
        return bytes(await asyncio.to_thread(body.read))
    finally:
        await asyncio.to_thread(body.close)


async def delete_object(*, bucket: str, key: str) -> None:
    """Remove an object. Used to clean up an upload that failed validation, so
    a rejected file does not sit in a bucket accruing storage and obligations
    under DPDP."""
    client = get_s3_client()
    await asyncio.to_thread(client.delete_object, Bucket=bucket, Key=key)
