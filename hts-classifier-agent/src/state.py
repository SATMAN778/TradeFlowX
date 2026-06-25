"""
src/state.py — Pydantic v2 data models for the HTS Classifier Agent.

Defines:
  - ProductFacts         — structured product information extracted from shipment docs
  - HeadingCandidate     — an HTS heading candidate with confidence and citation data
  - ClassificationResult — the final classification output with GRI trace and citations
  - AgentState           — the LangGraph state object passed between all graph nodes
  - NotePassage          — a CBP/USITC Section or Chapter Note passage with source citation
  - CrossRuling          — a CBP CROSS ruling with ruling number, decision, and excerpt
  - DutyCalculation      — duty rate breakdown including Section 301/232/IEEPA line items

All models use Pydantic v2. Serialization: .model_dump(mode="json") / .model_validate().

Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
"""

from __future__ import annotations

import re
from typing import Optional

from pydantic import BaseModel, field_validator, model_validator


# ---------------------------------------------------------------------------
# Supporting value types
# ---------------------------------------------------------------------------


class NotePassage(BaseModel):
    """A CBP/USITC Section or Chapter Note passage with its source citation.

    Used by the GRI Reasoning Agent when performing RAG lookup over the
    CBP/USITC Section and Chapter Notes corpus.
    """

    source: str  # e.g. "Section XV, Note 2(a)" or "Chapter 84, Note 1"
    text: str    # raw passage text


class CrossRuling(BaseModel):
    """A CBP CROSS binding tariff classification ruling.

    Returned by search_cross_rulings(). The excerpt is capped at 500 characters
    per Requirement 7.2.
    """

    ruling_number: str
    decision: str
    excerpt: str   # max 500 characters
    hts_code: str


class DutyCalculation(BaseModel):
    """Full duty rate breakdown for a given HTS code and country of origin.

    Includes Column 1 General rate plus any applicable trade-remedy tariffs
    (Section 301, Section 232, IEEPA). Dataset is refreshed at least quarterly.

    Requirements: 9.1–9.5
    """

    hts_code: str
    country_of_origin: str              # ISO 3166-1 alpha-2
    column1_general: Optional[float]    # None if data unavailable
    section_301: Optional[float] = None # CN-origin only; None if not applicable
    section_232: Optional[float] = None # Steel/aluminum tariff; None if not applicable
    ieepa: Optional[float] = None       # IEEPA tariff; None if not applicable
    total_rate: Optional[float]         # None if any component is unavailable
    dataset_version: str                # quarterly refresh date, e.g. "2024-Q2"
    requires_human_review: bool = False # True when duty rate data is unavailable


# ---------------------------------------------------------------------------
# Core domain models
# ---------------------------------------------------------------------------


class ProductFacts(BaseModel):
    """Structured product information extracted from a shipment document.

    Populated by the Product_Spec_Extractor sub-agent. Default values are
    applied for fields that cannot be determined from the source document:
      - material_composition defaults to ["unknown"]
      - assembly_state defaults to "finished good"

    Requirement: 2.1
    """

    description: str
    material_composition: list[str]  # ["unknown"] if undetermined (Req 4.4)
    function: str
    end_use: str
    assembly_state: str              # "finished good" if undetermined (Req 4.5)
    country_of_origin: str           # ISO 3166-1 alpha-2
    packaging: str


class HeadingCandidate(BaseModel):
    """A candidate HTS heading returned by the HTS Heading Candidate Search.

    confidence starts as the search relevance score (0.0–1.0) and is updated
    by the GRI Reasoning Agent and Ruling Precedent Agent. supporting_notes
    and ruling_citations accumulate citations across those stages.

    Requirement: 2.2
    """

    hts_code: str
    chapter: str                  # 2-digit chapter number, e.g. "84"
    heading_text: str
    confidence: float             # 0.0–1.0
    supporting_notes: list[str]   # section/chapter/explanatory note citations
    ruling_citations: list[str]   # CROSS ruling numbers; "no_ruling_found" if none
    dataset_version: str          # USITC HTS dataset year + amendment


class ClassificationResult(BaseModel):
    """The final HTS classification result produced by the Classification Reconciler.

    Validators enforce:
      - final_hts_code must match ^\d{4}\.\d{2}\.\d{4}$ (Req 2.6)
      - if final_hts_code is absent/empty, requires_human_review must be True (Req 15.4)

    Requirements: 2.3, 2.6, 15.4
    """

    final_hts_code: str              # regex: ^\d{4}\.\d{2}\.\d{4}$
    duty_rate: Optional[float]       # None if data unavailable
    confidence: float                # 0.0–1.0
    gri_rule_applied: str            # e.g. "GRI 1", "GRI 3(b)", "GRI 2(a)"
    reasoning_summary: str           # narrative: facts → notes → GRI → rulings → reconciliation
    citations: list[str]             # all Section/Chapter/Explanatory Notes + CROSS ruling numbers
    requires_human_review: bool

    @field_validator("final_hts_code")
    @classmethod
    def validate_hts_format(cls, v: str) -> str:
        """Enforce the standard 10-digit HTS format ####.##.####.

        Requirement 2.6: final_hts_code must match ^\d{4}\.\d{2}\.\d{4}$.
        An empty string is allowed here only when requires_human_review is True;
        that cross-field constraint is enforced by the model_validator below.
        """
        # Allow empty string to pass field validation — the model_validator
        # will enforce that requires_human_review is True in that case.
        if v and not re.match(r"^\d{4}\.\d{2}\.\d{4}$", v):
            raise ValueError(
                f"final_hts_code '{v}' does not match ####.##.#### format "
                "(expected pattern: ^\\d{{4}}\\.\\d{{2}}\\.\\d{{4}}$)"
            )
        return v

    @model_validator(mode="after")
    def enforce_null_hts_requires_review(self) -> "ClassificationResult":
        """If final_hts_code is absent or empty, requires_human_review must be True.

        Requirement 15.4: The agent SHALL never return a ClassificationResult
        with a null final_hts_code and requires_human_review = False.
        """
        if not self.final_hts_code and not self.requires_human_review:
            raise ValueError(
                "requires_human_review must be True when final_hts_code is absent or empty. "
                "A result with no final HTS code must always be flagged for human review."
            )
        return self


# ---------------------------------------------------------------------------
# LangGraph state
# ---------------------------------------------------------------------------


class AgentState(BaseModel):
    """The LangGraph state object that flows between all graph nodes.

    Carries all intermediate and final data for a single classification job.
    Serialization contract: .model_dump(mode="json") / .model_validate()
    must produce a round-trip equal object (Req 16.3).

    job_status values:
      "running"                  — active execution
      "completed"                — classification finished successfully
      "failed"                   — unrecoverable node error
      "checkpoint_schema_error"  — schema mismatch on LangGraph resume

    Requirements: 2.4, 2.5, 11.6, 16.3
    """

    job_id: str                                         # UUID v4 generated at job start
    shipment_doc_path: str
    product_facts: Optional[ProductFacts] = None
    candidates: list[HeadingCandidate] = []
    result: Optional[ClassificationResult] = None
    plan: str = ""                                      # todo.md content written by Orchestrator
    chapter_hint: Optional[str] = None                  # 2-digit chapter hint
    retry_counts: dict[str, int] = {}                   # node_name → retry count
    audit_bucket_path: Optional[str] = None             # Storage Bucket path after persist
    job_status: str = "running"
    reviewer_identity: Optional[str] = None             # Action Center reviewer
    reviewer_timestamp: Optional[str] = None            # ISO 8601 timestamp of review decision
    action_center_task_id: Optional[str] = None         # Action Center task ID for HITL gate

    @model_validator(mode="after")
    def validate_required_fields_at_node_boundary(self) -> "AgentState":
        """Raise ValidationError if identity fields are missing or empty.

        Requirement 2.5: If any required field in AgentState is missing at a
        node boundary, the agent SHALL raise a validation error and halt the
        current graph execution with a descriptive error message.

        job_id and shipment_doc_path are always required — they identify the
        job and its input document throughout the entire graph lifecycle.
        """
        errors: list[str] = []

        if not self.job_id or not self.job_id.strip():
            errors.append(
                "job_id is required and must not be empty. "
                "A UUID v4 job_id must be generated before the first graph node executes."
            )

        if not self.shipment_doc_path or not self.shipment_doc_path.strip():
            errors.append(
                "shipment_doc_path is required and must not be empty. "
                "The path to the source shipment document must be provided before graph execution."
            )

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
    "ProductFacts",
    "HeadingCandidate",
    "ClassificationResult",
    "AgentState",
    "NotePassage",
    "CrossRuling",
    "DutyCalculation",
]
