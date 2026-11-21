import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

_LOCK = threading.Lock()
_HITS: dict[str, deque[float]] = defaultdict(deque)
_MAX_KEYS = 10_000


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(max_calls: int, window_seconds: int):
    """Dependency factory for a simple in-memory sliding-window limiter."""

    def dependency(request: Request) -> None:
        key = f"{_client_ip(request)}:{request.url.path}"
        now = time.monotonic()
        with _LOCK:
            if len(_HITS) > _MAX_KEYS:
                _HITS.clear()
            hits = _HITS[key]
            while hits and now - hits[0] > window_seconds:
                hits.popleft()
            if len(hits) >= max_calls:
                retry_after = max(1, int(window_seconds - (now - hits[0])))
                raise HTTPException(
                    status_code=429,
                    detail="Too many requests. Please try again shortly.",
                    headers={"Retry-After": str(retry_after)},
                )
            hits.append(now)

    return dependency
