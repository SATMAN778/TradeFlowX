"""
src/assets.py — Configuration Asset reader.
"""

import os
from typing import Any
from uipath.platform import UiPath
from src.exceptions import ConfigurationError


def get_asset(name: str, default: Any = None) -> Any:
    """Retrieve an asset value from the environment or UiPath Orchestrator."""
    env_name = name.replace("/", "_").replace("-", "_").upper()
    if env_name in os.environ:
        return os.environ[env_name]

    # Check for prefix fallback
    for prefix in ["VITE_", "HTS_"]:
        alt_name = prefix + env_name
        if alt_name in os.environ:
            return os.environ[alt_name]

    try:
        sdk = UiPath()
        val = sdk.assets.get_value(name)
        if val is not None:
            return val
    except Exception:
        pass

    if default is not None:
        return default

    raise ConfigurationError(
        f"Required configuration asset '{name}' (or environment variable '{env_name}') is missing."
    )


def get_case_entity_id() -> str:
    """Get the Data Service ImportCaseRecord Entity ID."""
    return str(get_asset("ENTITY_CASE", "182ca464-ce70-f111-ac9b-000d3a68f6f7"))


def get_duty_entity_id() -> str:
    """Get the Data Service DutyCalculation Entity ID."""
    return str(get_asset("ENTITY_DUTY", "43d52f6c-ce70-f111-ac9b-000d3a68f6f7"))


def get_audit_bucket_name() -> str:
    """Get the audit Storage Bucket name."""
    return str(get_asset("AuditBucketName", "TradeFlowAudits"))


__all__ = [
    "get_asset",
    "get_case_entity_id",
    "get_duty_entity_id",
    "get_audit_bucket_name",
]
