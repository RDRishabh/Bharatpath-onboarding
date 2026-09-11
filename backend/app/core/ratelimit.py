"""A coarse fixed-window throttle in Redis.

Deliberately coarse. This is not the primary abuse control for OTP -- Twilio
Verify owns code generation, expiry, resend limits and carrier-level fraud
detection, and it is much better at that than we would be. Ours is the outer
throttle: Twilio's limits protect Twilio's spend, and this protects against
someone walking the phone-number space at our expense (docs/plan.md 5.8).

A fixed window, not a sliding one, on purpose. A sliding window costs a sorted
set per subject and a cleanup pass; a fixed window costs one INCR. The
worst-case leak -- twice the limit across a window boundary -- is irrelevant at
"5 OTP starts per phone per hour" and would matter only if this were the real
control, which it is not.
"""

from __future__ import annotations

from app.core.cache import get_redis
from app.core.errors import RateLimitedError
from app.core.logging import get_logger

logger = get_logger(__name__)


async def hit(*, bucket: str, subject: str, limit: int, window_seconds: int) -> int:
    """Count one request against `subject`, or raise `RateLimitedError`.

    Returns the count after this request, so a caller can log how close to the
    limit a client is running.

    **Fails closed.** If Redis is unreachable this raises rather than allowing
    the request. That is the opposite of the membership cache, and the
    asymmetry is deliberate: a missing membership entry degrades to a slower
    correct answer, whereas an unenforced throttle in front of a paid SMS
    gateway degrades to somebody else's bill.
    """
    key = f"ratelimit:{bucket}:{subject}"
    try:
        redis = get_redis()
        pipe = redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, window_seconds, nx=True)  # only on the first hit of a window
        count = int((await pipe.execute())[0])
    except RateLimitedError:
        raise
    except Exception as exc:
        logger.error("ratelimit_backend_unavailable", bucket=bucket)
        raise RateLimitedError(code="rate_limit_unavailable") from exc

    if count > limit:
        logger.warning("rate_limited", bucket=bucket, count=count, limit=limit)
        raise RateLimitedError(params={"retry_after_seconds": window_seconds})
    return count
