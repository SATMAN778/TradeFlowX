"""
src/assets.py — Lazy UiPath Orchestrator Asset reader.

Provides get_asset(name) and named helpers for each configurable threshold and
credential. All reads happen at call time — NEVER at module import time — to
avoid import-time side effects and startup failures from missing credentials.
"""

import os
from typing import Any
from uipath.platform import UiPath
from src.exceptions import ConfigurationError


def get_asset(name: str) -> Any:
    """Retrieve an asset value from the environment or UiPath Orchestrator.

    Checks environment variables first, then queries Orchestrator Assets.
    Raises ConfigurationError if the asset is missing and no default applies.
    """
    # Map HTS/ConfidenceThreshold -> HTS_CONFIDENCE_THRESHOLD
    env_name = name.replace("/", "_").upper()
    if env_name in os.environ:
        return os.environ[env_name]

    # Map HTS/AnthropicAPIKey -> ANTHROPIC_API_KEY
    if env_name.startswith("HTS_"):
        short_env_name = env_name[4:]
        if short_env_name in os.environ:
            return os.environ[short_env_name]

    try:
        # Initialize SDK lazily
        sdk = UiPath()
        # For credentials or secrets, try retrieve_secret first
        if "APIKey" in name or "Secret" in name or "Password" in name:
            try:
                val = sdk.assets.retrieve_secret(name)
                if val is not None:
                    return val
            except Exception:
                pass
        
        val = sdk.assets.get_value(name)
        if val is not None:
            return val
    except Exception as e:
        # Log or trace if debugging, otherwise fallback/raise
        pass

    raise ConfigurationError(
        f"Required configuration asset '{name}' (or environment variable '{env_name}') is missing."
    )


def get_confidence_threshold() -> float:
    """Get the classification confidence threshold. Defaults to 0.85."""
    try:
        return float(get_asset("HTS/ConfidenceThreshold"))
    except (ConfigurationError, ValueError, TypeError):
        return 0.85


def get_duty_differential_threshold() -> float:
    """Get the duty differential threshold. Defaults to 0.05."""
    try:
        return float(get_asset("HTS/DutyDifferentialThreshold"))
    except (ConfigurationError, ValueError, TypeError):
        return 0.05


def get_llm_model_name() -> str:
    """Get the LLM model name. Defaults to 'gpt-4o-2024-08-06'."""
    try:
        return str(get_asset("HTS/LLMModelName"))
    except ConfigurationError:
        return "gpt-4o-2024-08-06"


def get_llm_temperature() -> float:
    """Get the LLM temperature. Defaults to 0.0."""
    try:
        return float(get_asset("HTS/LLMTemperature"))
    except (ConfigurationError, ValueError, TypeError):
        return 0.0


def get_anthropic_api_key() -> str:
    """Get the Anthropic API key. Raises ConfigurationError if missing."""
    val = get_asset("HTS/AnthropicAPIKey")
    if not val:
        raise ConfigurationError("Anthropic API key is not configured.")
    return str(val)


def get_audit_bucket_name() -> str:
    """Get the audit Storage Bucket name. Raises ConfigurationError if missing."""
    val = get_asset("HTS/AuditBucketName")
    if not val:
        raise ConfigurationError("Audit Storage Bucket name is not configured.")
    return str(val)


__all__ = [
    "get_asset",
    "get_confidence_threshold",
    "get_duty_differential_threshold",
    "get_llm_model_name",
    "get_llm_temperature",
    "get_anthropic_api_key",
    "get_audit_bucket_name",
]
