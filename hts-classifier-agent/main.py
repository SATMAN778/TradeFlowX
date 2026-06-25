"""
main.py — Entry point for the HTS Classifier UiPath Agent.

Accepts shipment details and document, runs the LangGraph classification workflow,
and returns the reconciled classification results.
"""

import uuid
import os
from typing import Optional, Dict
from pydantic import BaseModel, Field
from uipath.platform import UiPath

from src.state import AgentState, ProductFacts
from src.agent import build_graph


# ---------------------------------------------------------------------------
# Input/Output Models matching entry-points.json
# ---------------------------------------------------------------------------

class JobAttachment(BaseModel):
    FullName: Optional[str] = Field(default=None, description="File name")
    ID: str = Field(description="Orchestrator attachment key")
    Metadata: Optional[Dict[str, str]] = Field(default=None, description="Metadata dictionary")
    MimeType: Optional[str] = Field(default=None, description="MIME type")


class ClassificationInput(BaseModel):
    shipmentDocument: JobAttachment = Field(description="The shipment document attachment to process.")
    documentType: Optional[str] = Field(default=None, description="Optional hint for document type.")
    chapterHint: Optional[str] = Field(default=None, description="Optional 2-digit chapter hint.")
    countryOfOrigin: Optional[str] = Field(default=None, description="Optional country of origin hint.")


class ClassificationOutput(BaseModel):
    job_id: str
    final_hts_code: str
    duty_rate: Optional[float] = None
    confidence: float
    gri_rule_applied: str
    reasoning_summary: str
    citations: list[str]
    requires_human_review: bool
    job_status: str
    audit_bucket_path: Optional[str] = None


# ---------------------------------------------------------------------------
# Main Handler
# ---------------------------------------------------------------------------

def main(input: ClassificationInput) -> ClassificationOutput:
    """Run the HTS tariff classification workflow."""
    # 1. Resolve job ID and shipment document path
    job_id = str(uuid.uuid4())
    shipment_doc_path = input.shipmentDocument.FullName or "document.txt"

    # Try downloading the attachment using UiPath platform client
    try:
        sdk = UiPath()
        # Create temp folder for downloads
        temp_dir = r"C:\Users\gupta\.gemini\antigravity-ide\scratch\downloads"
        os.makedirs(temp_dir, exist_ok=True)
        local_path = sdk.attachments.download(
            key=uuid.UUID(input.shipmentDocument.ID),
            target_directory=temp_dir
        )
        if local_path and os.path.exists(local_path):
            shipment_doc_path = local_path
    except Exception:
        # If offline or SDK download fails, fall back to local mock paths or direct name
        # For test suite execution, we mock file operations
        pass

    # 2. Build initial state
    initial_facts = None
    if input.countryOfOrigin:
        initial_facts = ProductFacts(
            description="",
            material_composition=["unknown"],
            function="",
            end_use="",
            assembly_state="finished good",
            country_of_origin=input.countryOfOrigin,
            packaging=""
        )

    state = AgentState(
        job_id=job_id,
        shipment_doc_path=shipment_doc_path,
        chapter_hint=input.chapterHint,
        product_facts=initial_facts,
        job_status="running"
    )

    # 3. Build and execute compiled LangGraph
    graph = build_graph()
    state_dict = state.model_dump(mode="json")
    
    try:
        final_dict = graph.invoke(state_dict)
        final_state = AgentState.model_validate(final_dict)
    except Exception as e:
        # Unrecoverable error in graph execution
        return ClassificationOutput(
            job_id=job_id,
            final_hts_code="",
            duty_rate=None,
            confidence=0.0,
            gri_rule_applied="None",
            reasoning_summary=f"Graph execution failed with error: {e}",
            citations=[],
            requires_human_review=True,
            job_status="failed"
        )

    # 4. Map final state to classification output
    res = final_state.result
    return ClassificationOutput(
        job_id=final_state.job_id,
        final_hts_code=res.final_hts_code if res else "",
        duty_rate=res.duty_rate if res else None,
        confidence=res.confidence if res else 0.0,
        gri_rule_applied=res.gri_rule_applied if res else "",
        reasoning_summary=res.reasoning_summary if res else "No result created.",
        citations=res.citations if res else [],
        requires_human_review=res.requires_human_review if res else True,
        job_status=final_state.job_status,
        audit_bucket_path=final_state.audit_bucket_path
    )
