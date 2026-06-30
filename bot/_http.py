"""Small async HTTP utilities shared across Hermes clients."""

from __future__ import annotations

import asyncio
import logging
from typing import Awaitable, Callable, TypeVar

import httpx

log = logging.getLogger("hermes.http")

T = TypeVar("T")

# HTTP statuses worth retrying: rate limits and transient server errors.
RETRYABLE_STATUS = {408, 409, 425, 429, 500, 502, 503, 504}


class RetryableHTTPError(httpx.HTTPStatusError):
    """Marker subclass for status errors that are safe to retry."""


def is_retryable_status(status: int) -> bool:
    return status in RETRYABLE_STATUS


async def with_retries(
    fn: Callable[..., Awaitable[T]],
    *,
    op: str,
    max_attempts: int = 3,
    base_delay: float = 1.0,
    timeout: float | httpx.Timeout | None = None,
    **kwargs,
) -> T:
    """
    Call ``fn(client, **kwargs)`` with exponential backoff on retryable
    HTTP errors and transient network errors. ``fn`` must accept an
    ``httpx.AsyncClient`` as its first positional argument.

    Raises the last error if all attempts are exhausted.
    """
    last_exc: BaseException | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                return await fn(client, **kwargs)
        except httpx.HTTPStatusError as exc:
            last_exc = exc
            status = exc.response.status_code
            if not is_retryable_status(status) or attempt == max_attempts:
                raise
            delay = base_delay * (2 ** (attempt - 1))
            log.warning("%s: HTTP %s (attempt %d/%d) — retrying in %.1fs",
                        op, status, attempt, max_attempts, delay)
        except (httpx.TransportError, httpx.TimeoutException) as exc:
            last_exc = exc
            if attempt == max_attempts:
                raise
            delay = base_delay * (2 ** (attempt - 1))
            log.warning("%s: %s (attempt %d/%d) — retrying in %.1fs",
                        op, type(exc).__name__, attempt, max_attempts, delay)

        await asyncio.sleep(delay)

    # Should be unreachable, but satisfy the type checker.
    assert last_exc is not None
    raise last_exc