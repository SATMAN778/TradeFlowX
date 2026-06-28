"""
src/exceptions.py — Custom exception hierarchy for the HTS Classifier Agent.

All exceptions accept an optional job_id keyword argument so that log messages
and audit records can be correlated end-to-end.
"""

class HTSClassifierError(Exception):
    """Base exception class for all HTS Classifier Agent errors."""
    def __init__(self, message: str, job_id: str | None = None):
        super().__init__(message)
        self.message = message
        self.job_id = job_id


class TransientToolError(HTSClassifierError):
    """Raised on HTTP 5xx, timeout, or connection errors from external tools.

    Triggers exponential-backoff retry in with_retry().
    """
    pass


class HTSDataSourceError(HTSClassifierError):
    """Raised when the USITC HTS dataset is unavailable after all retry attempts.

    Signals the Orchestrator to halt the job rather than proceed with an empty candidate list.
    """
    pass


class CrossDataSourceError(HTSClassifierError):
    """Raised when the CBP CROSS API/index is fully unavailable after retries.

    Distinct from "no rulings found" (which returns an empty list without raising).
    """
    pass


class ConfigurationError(HTSClassifierError):
    """Raised when a required Orchestrator asset or environment variable is missing

    at node execution time. Halts the current node; does not affect other nodes.
    """
    pass


class DocumentParseError(HTSClassifierError):
    """Raised when a shipment document cannot be parsed because of an unsupported

    format or corrupt file.
    """
    pass


class NodeExecutionError(HTSClassifierError):
    """Raised by the Orchestrator when a sub-agent node fails all retries.

    Carries node_name and the originating exception for audit logging.
    """
    def __init__(
        self,
        message: str,
        node_name: str,
        originating_exception: Exception | None = None,
        job_id: str | None = None
    ):
        super().__init__(message, job_id=job_id)
        self.node_name = node_name
        self.originating_exception = originating_exception


__all__ = [
    "HTSClassifierError",
    "TransientToolError",
    "HTSDataSourceError",
    "CrossDataSourceError",
    "ConfigurationError",
    "DocumentParseError",
    "NodeExecutionError",
]
