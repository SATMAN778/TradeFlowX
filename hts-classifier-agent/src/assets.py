"""
src/assets.py — Lazy UiPath Orchestrator Asset reader.

Provides get_asset(name) and named helpers for each configurable threshold and
credential. All reads happen at call time — NEVER at module import time — to
avoid import-time side effects and startup failures from missing credentials.

Named helpers:
  get_confidence_threshold()       → float  (default 0.85)
  get_duty_differential_threshold() → float (default 0.05)
  get_llm_model_name()             → str   (default "claude-3-5-sonnet-20241022")
  get_llm_temperature()            → float (default 0.0)
  get_anthropic_api_key()          → str
  get_audit_bucket_name()          → str

Each helper raises ConfigurationError with a descriptive message if the asset
or environment variable is missing.

UiPath Orchestrator Asset names:
  HTS/ConfidenceThreshold, HTS/DutyDifferentialThreshold, HTS/LLMModelName,
  HTS/LLMTemperature, HTS/AnthropicAPIKey, HTS/AuditBucketName

Requirement: 10.6, 13.1, 13.2, 13.3, 13.4, 13.5
"""

# Full implementation lives in Task 5.
# This stub is the module placeholder created in Task 1.

__all__ = [
    "get_asset",
    "get_confidence_threshold",
    "get_duty_differential_threshold",
    "get_llm_model_name",
    "get_llm_temperature",
    "get_anthropic_api_key",
    "get_audit_bucket_name",
]
