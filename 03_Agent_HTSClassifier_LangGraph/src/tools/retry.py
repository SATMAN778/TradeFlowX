"""
src/tools/retry.py — Retry decorator utility with exponential backoff.

Catches TransientToolError and retries execution.
"""

import time
import asyncio
from functools import wraps
from typing import Any, Callable, TypeVar, cast
from src.exceptions import TransientToolError

T = TypeVar("T", bound=Callable[..., Any])


def with_retry(
    retries: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    exceptions: tuple[type[BaseException], ...] = (TransientToolError,)
) -> Callable[[T], T]:
    """Decorator to retry a function with exponential backoff.

    Supports both synchronous and asynchronous functions.
    """
    def decorator(func: T) -> T:
        if asyncio.iscoroutinefunction(func):
            @wraps(func)
            async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
                current_delay = delay
                for attempt in range(retries + 1):
                    try:
                        return await func(*args, **kwargs)
                    except exceptions as e:
                        if attempt == retries:
                            raise e
                        time.sleep(current_delay)
                        current_delay *= backoff
            return cast(T, async_wrapper)
        else:
            @wraps(func)
            def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
                current_delay = delay
                for attempt in range(retries + 1):
                    try:
                        return func(*args, **kwargs)
                    except exceptions as e:
                        if attempt == retries:
                            raise e
                        time.sleep(current_delay)
                        current_delay *= backoff
            return cast(T, sync_wrapper)

    return decorator
