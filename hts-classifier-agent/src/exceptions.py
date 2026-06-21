"""
src/exceptions.py — Custom exception hierarchy for the HTS Classifier Agent.

Exceptions:
  TransientToolError   — Raised on HTTP 5xx, timeout, or connection errors from
                         external tools. Triggers exponential-backoff retry in
                         with_retry(). Carries optional job_id for traceability.

  HTSDataSourceError   — Raised when the USITC HTS dataset is unavailable after
                         all retry attempts. Signals the Orchestrator to halt the
                         job rather than proceed with an empty candidate list.

  CrossDataSourceError — Raised when the CBP CROSS API/index is fully unavailable
                         after retries. Distinct from "no rulings found" (which
                         returns an empty list without raising).

  ConfigurationError   — Raised when a required Orchestrator asset or environment
                         variable is missing at node execution time. Halts the
                         current node; does not affect other nodes.

  DocumentParseError   — Raised when a shipment document cannot be parsed because
                         of an unsupported format or corrupt file.

  NodeExecutionError   — Raised by the Orchestrator when a sub-agent node fails
                         all retries. Carries node_name and the originating
                         exception for audit logging.

All exceptions accept an optional job_id keyword argument so that log messages
and audit records can be correlated end-to-end.

Requirement: 3.5, 4.1, 5.7, 13.3, 15.5
"""

# Full implementation lives in Task 3.
# This stub is the module placeholder created in Task 1.

__all__ = [
    "TransientToolError",
    "HTSDataSourceError",
    "CrossDataSourceError",
    "ConfigurationError",
    "DocumentParseError",
    "NodeExecutionError",
]
