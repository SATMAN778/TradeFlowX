"""
src/state.py — Pydantic v2 data models for the Transshipment Risk Agent.

Defines:
  - TransshipmentRiskState — the LangGraph state object passed between all graph nodes
"""

from __future__ import annotations

from typing import Optional, Any, Dict, List
from pydantic import BaseModel, model_validator


class TransshipmentRiskState(BaseModel):
    """The LangGraph state object that flows between all transshipment risk graph nodes.

    Carries all intermediate and final data for a single transshipment risk evaluation.
    """

    # --- Input Fields ---
    shipment_ref: str                   # Maestro Case ID
    declared_coo: str                   # Declared Country of Origin, e.g., "UAE"
    supplier_name: str                  # Name of the supplier
    supplier_address: str               # Address of the supplier
    jafza_flag: bool                    # True if JAFZA / Free Zone address
    hts_code: str                       # Product HTS classification code
    product_description: str            # Product description
    coo_certificate: Optional[str] = None  # PDF certificate text (if any)

    # --- Intermediate Findings ---
    supplier_type: Optional[str] = None          # "manufacturer" | "trading_company" | "unknown"
    substantial_transform: Optional[bool] = None  # True | False | None (inconclusive)
    watchlist_hits: List[Dict[str, Any]] = []    # [{party, list_name, match_score}]
    third_country_origin: Optional[str] = None    # "China" | "India" | "Iran" | None
    section_301_applicable: Optional[bool] = None
    add_cvd_applicable: Optional[bool] = None
    iran_russia_nexus: Optional[bool] = None

    # --- Output/Verdict Fields ---
    risk_score: Optional[int] = None             # 0–100 risk score
    risk_level: Optional[str] = None             # "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    true_coo_verdict: Optional[str] = None       # Final verified COO
    human_escalation: bool = False               # Whether human task HT-08 was triggered
    human_review_notes: Optional[str] = None     # Notes returned from Action Center reviewer
    job_status: str = "running"                  # "running" | "completed" | "failed" | "interrupted"

    # --- LangGraph Message History ---
    messages: List[Any] = []

    @model_validator(mode="after")
    def validate_required_fields_at_node_boundary(self) -> "TransshipmentRiskState":
        """Raise ValidationError if mandatory input fields are missing or empty.

        Checks that shipment identifier, declared COO, supplier details, HTS code,
        and product descriptions are correctly populated.
        """
        errors: List[str] = []

        if not self.shipment_ref or not self.shipment_ref.strip():
            errors.append("shipment_ref is required and must not be empty.")

        if not self.declared_coo or not self.declared_coo.strip():
            errors.append("declared_coo is required and must not be empty.")

        if not self.supplier_name or not self.supplier_name.strip():
            errors.append("supplier_name is required and must not be empty.")

        if not self.supplier_address or not self.supplier_address.strip():
            errors.append("supplier_address is required and must not be empty.")

        if not self.hts_code or not self.hts_code.strip():
            errors.append("hts_code is required and must not be empty.")

        if not self.product_description or not self.product_description.strip():
            errors.append("product_description is required and must not be empty.")

        if errors:
            raise ValueError(
                "TransshipmentRiskState validation failed at node boundary:\n"
                + "\n".join(f"  - {e}" for e in errors)
            )

        return self


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

__all__ = [
    "TransshipmentRiskState",
]
