"""
src/state.py — Pydantic v2 data models for the Duty Savings Analysis Agent.

Defines:
  - AgentState — the LangGraph state object passed between all graph nodes
  - JobAttachment — standard attachment shape matching UiPath orchestrator job attachment
"""

from __future__ import annotations

from typing import Optional, Any, Dict, List, Annotated
from pydantic import BaseModel, model_validator
from langgraph.graph.message import add_messages



class JobAttachment(BaseModel):
    FullName: Optional[str] = None
    ID: str
    Metadata: Optional[Dict[str, str]] = None
    MimeType: Optional[str] = None


class AgentState(BaseModel):
    """The LangGraph state object that flows between all duty savings analysis graph nodes.

    Carries all intermediate and final data for a single post-entry duty savings and variance audit.
    """

    # --- Input Fields ---
    shipment_ref: str                   # Maestro Case ID
    shipment_doc_path: Optional[str] = None  # Local path to downloaded CBP entry summary document
    hts_code: str                       # Declared HTS code
    declared_coo: str                   # Declared Country of Origin (e.g. "UAE")
    shipment_value_usd: float = 0.0     # Declared value in USD
    estimated_duty_usd: float = 0.0     # Estimated duty amount from upstream stages
    actual_duty_usd: Optional[float] = None  # Actual assessed duty amount (extracted from document or passed)
    jafza_flag: bool = False            # True if supplier is in JAFZA / Free Zone
    transshipment_flag: bool = False    # True if transshipment is flagged
    has_reexport_intent: bool = False   # True if cargo is marked for re-export
    
    # --- Action Center Resumes ---
    finance_review_notes: Optional[str] = None  # Notes returned from HT-17 Finance review
    counsel_review_notes: Optional[str] = None  # Notes returned from HT-18 Counsel review

    # --- Intermediate Findings ---
    extracted_hts_code: Optional[str] = None     # HTS code extracted from CBP Form 7501
    variance_usd: Optional[float] = None
    variance_pct: Optional[float] = None
    opportunity_type: Optional[str] = None       # "First-Sale Valuation" | "Duty Drawback" | "None"
    estimated_savings_usd: float = 0.0
    counsel_recommendation: Optional[str] = None

    # --- Routing & Control ---
    requires_finance_review: bool = False
    requires_counsel_review: bool = False
    action_center_task_id: Optional[str] = None
    audit_bucket_path: Optional[str] = None
    job_status: str = "running"                  # "running" | "completed" | "failed" | "interrupted"

    # --- LangGraph Message History ---
    messages: Annotated[List[Any], add_messages] = []

    @model_validator(mode="after")
    def validate_required_fields_at_node_boundary(self) -> "AgentState":
        """Raise ValidationError if mandatory input fields are missing or empty."""
        errors: List[str] = []

        if not self.shipment_ref or not self.shipment_ref.strip():
            errors.append("shipment_ref is required and must not be empty.")

        if not self.hts_code or not self.hts_code.strip():
            errors.append("hts_code is required and must not be empty.")

        if not self.declared_coo or not self.declared_coo.strip():
            errors.append("declared_coo is required and must not be empty.")

        if errors:
            raise ValueError(
                "AgentState validation failed at node boundary:\n"
                + "\n".join(f"  - {e}" for e in errors)
            )

        return self


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

__all__ = [
    "JobAttachment",
    "AgentState",
]
