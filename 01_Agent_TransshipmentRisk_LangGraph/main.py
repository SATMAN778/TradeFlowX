"""
main.py — Entry point for the Transshipment Risk Agent.

Accepts shipment details and document, runs the LangGraph compliance workflow,
and returns the final risk assessment.
"""

import uuid
import os
from datetime import datetime
from typing import Optional, Dict, Any, Union
from pydantic import BaseModel, Field
from uipath.platform import UiPath
from pypdf import PdfReader

from src.state import TransshipmentRiskState
from src.agent import build_graph


# ---------------------------------------------------------------------------
# Input/Output Models matching entry-points.json
# ---------------------------------------------------------------------------

class JobAttachment(BaseModel):
    FullName: Optional[str] = Field(default=None, description="File name")
    ID: str = Field(description="Orchestrator attachment key")
    Metadata: Optional[Dict[str, str]] = Field(default=None, description="Metadata dictionary")
    MimeType: Optional[str] = Field(default=None, description="MIME type")


class TransshipmentInput(BaseModel):
    shipment_ref: str = Field(description="Maestro Case ID")
    declared_coo: str = Field(description="Declared Country of Origin, e.g. UAE")
    supplier_name: str = Field(description="Name of the supplier")
    supplier_address: str = Field(description="Address of the supplier")
    jafza_flag: bool = Field(description="True if supplier is JAFZA / Free Zone")
    hts_code: str = Field(description="HTS classification code")
    product_description: str = Field(description="Description of the product")
    coo_certificate: Optional[Union[JobAttachment, str]] = Field(default=None, description="PDF text extracted or attachment metadata")
    human_review_notes: Optional[str] = Field(default=None, description="Review notes if resuming")


class TransshipmentOutput(BaseModel):
    shipment_ref: str
    agent: str = "TransshipmentRiskAgent"
    true_coo_verdict: str
    declared_coo: str
    transshipment_risk_score: int
    risk_level: str
    section_301_applicable: bool
    section_301_surcharge_rate: str
    add_cvd_applicable: bool
    human_escalation_triggered: bool
    human_review_notes: str
    watchlist_hits: list[dict]
    recommendation: str
    agent_run_id: str
    completed_at: str


# ---------------------------------------------------------------------------
# Helper Document Parser
# ---------------------------------------------------------------------------

def parse_coo_document(file_path: str) -> str:
    """Parse text from Certificate of Origin file (PDF or text)."""
    if not os.path.exists(file_path):
        return file_path

    _, ext = os.path.splitext(file_path.lower())
    if ext == ".pdf":
        try:
            reader = PdfReader(file_path)
            text = []
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text.append(page_text)
            return "\n".join(text)
        except Exception as e:
            return f"Failed to parse PDF document: {e}"
    else:
        for encoding in ("utf-8", "latin-1", "cp1252"):
            try:
                with open(file_path, "r", encoding=encoding) as f:
                    return f.read()
            except Exception:
                continue
        return file_path


# ---------------------------------------------------------------------------
# Main Handler
# ---------------------------------------------------------------------------

def main(input: TransshipmentInput) -> TransshipmentOutput:
    """Run the Transshipment Risk Agent workflow."""
    coo_certificate_text = ""

    # 1. Resolve attachment and download if provided as JobAttachment
    if input.coo_certificate:
        is_attachment = False
        attachment_id = None
        full_name = None

        if isinstance(input.coo_certificate, JobAttachment):
            is_attachment = True
            attachment_id = input.coo_certificate.ID
            full_name = input.coo_certificate.FullName or "certificate.pdf"
        elif isinstance(input.coo_certificate, dict) and "ID" in input.coo_certificate:
            is_attachment = True
            attachment_id = input.coo_certificate.get("ID")
            full_name = input.coo_certificate.get("FullName") or "certificate.pdf"

        if is_attachment:
            try:
                sdk = UiPath()
                temp_dir = r"C:\Users\gupta\.gemini\antigravity-ide\scratch\downloads"
                os.makedirs(temp_dir, exist_ok=True)
                local_path = sdk.attachments.download(
                    key=uuid.UUID(attachment_id),
                    target_directory=temp_dir
                )
                if local_path and os.path.exists(local_path):
                    coo_certificate_text = parse_coo_document(local_path)
            except Exception:
                # Fallback to file name if download fails
                coo_certificate_text = full_name
        elif isinstance(input.coo_certificate, str):
            # If already text or local file path
            if os.path.exists(input.coo_certificate):
                coo_certificate_text = parse_coo_document(input.coo_certificate)
            else:
                coo_certificate_text = input.coo_certificate

    # 2. Build initial state
    state = TransshipmentRiskState(
        shipment_ref=input.shipment_ref,
        declared_coo=input.declared_coo,
        supplier_name=input.supplier_name,
        supplier_address=input.supplier_address,
        jafza_flag=input.jafza_flag,
        hts_code=input.hts_code,
        product_description=input.product_description,
        coo_certificate=coo_certificate_text if coo_certificate_text else None,
        human_review_notes=input.human_review_notes,
        job_status="running"
    )

    # 3. Compile the StateGraph workflow
    graph = build_graph()
    config = {"configurable": {"thread_id": input.shipment_ref}}
    
    # 4. Invoke or Resume Graph
    try:
        if input.human_review_notes:
            # We are resuming from an interrupt!
            current_state = graph.get_state(config)
            if current_state and current_state.next:
                # There is an active checkpoint waiting at the interrupt. Resume it!
                graph.update_state(config, {"human_review_notes": input.human_review_notes})
                final_state_dict = graph.invoke(None, config)
            else:
                # No active checkpoint, invoke from start
                state_dict = state.model_dump(mode="json")
                final_state_dict = graph.invoke(state_dict, config)
        else:
            # First invocation
            state_dict = state.model_dump(mode="json")
            final_state_dict = graph.invoke(state_dict, config)
        
        final_state = TransshipmentRiskState.model_validate(final_state_dict)

        # Check if the graph is currently paused at an interrupt (meaning next is populated)
        post_invoke_state = graph.get_state(config)
        if post_invoke_state and post_invoke_state.next:
            # We are currently interrupted at Node 4 (human_escalation)
            return TransshipmentOutput(
                shipment_ref=state.shipment_ref,
                agent="TransshipmentRiskAgent",
                true_coo_verdict="UNRESOLVED — Compliance Review Task Triggered",
                declared_coo=state.declared_coo,
                transshipment_risk_score=final_state.risk_score or 50, # interim scoring
                risk_level=final_state.risk_level or "HIGH",
                section_301_applicable=bool(final_state.section_301_applicable),
                section_301_surcharge_rate="0%",
                add_cvd_applicable=bool(final_state.add_cvd_applicable),
                human_escalation_triggered=True,
                human_review_notes="",
                watchlist_hits=final_state.watchlist_hits,
                recommendation="Interrupted. Compliance reviewer action center task HT-08 created. Awaiting completion.",
                agent_run_id=f"run-{state.shipment_ref}-interrupted",
                completed_at=""
            )

    except Exception as e:
        # Halt execution on error
        return TransshipmentOutput(
            shipment_ref=state.shipment_ref,
            agent="TransshipmentRiskAgent",
            true_coo_verdict="ERROR",
            declared_coo=state.declared_coo,
            transshipment_risk_score=100,
            risk_level="CRITICAL",
            section_301_applicable=False,
            section_301_surcharge_rate="0%",
            add_cvd_applicable=False,
            human_escalation_triggered=False,
            human_review_notes="",
            watchlist_hits=[],
            recommendation=f"Graph execution failed with error: {e}",
            agent_run_id="error",
            completed_at=""
        )

    # 5. Map final completed state to TransshipmentOutput
    sec_301_rate = "0%"
    if final_state.section_301_applicable:
        sec_301_rate = "25%"

    # Re-evaluate recommendations
    true_coo = final_state.true_coo_verdict or final_state.declared_coo
    risk_level = final_state.risk_level or "LOW"
    
    if true_coo.upper() == "UAE":
        recommendation = "Proceed with standard customs entry. UAE COO is verified."
    elif true_coo.upper() == "CHINA":
        recommendation = "Apply Section 301 List duties. Update HTS duty calculation. Flag for CBP audit readiness."
    elif true_coo.upper() == "IRAN" or final_state.iran_russia_nexus:
        recommendation = "CRITICAL: OFAC/Sanctions violation risk. Block case immediately. Escalate to legal counsel."
    elif "CBP ruling required" in true_coo:
        recommendation = "Hold shipment. File for CBP binding ruling request before entry filing."
    else:
        if risk_level in ["HIGH", "CRITICAL"]:
            recommendation = f"High risk origin detected ({true_coo}). Flag for broker review and check ADD/CVD orders."
        else:
            recommendation = f"Standard customs entry for true COO: {true_coo}. Recalculate duties if changed."

    return TransshipmentOutput(
        shipment_ref=final_state.shipment_ref,
        agent="TransshipmentRiskAgent",
        true_coo_verdict=true_coo,
        declared_coo=final_state.declared_coo,
        transshipment_risk_score=final_state.risk_score or 0,
        risk_level=risk_level,
        section_301_applicable=bool(final_state.section_301_applicable),
        section_301_surcharge_rate=sec_301_rate,
        add_cvd_applicable=bool(final_state.add_cvd_applicable),
        human_escalation_triggered=final_state.human_escalation,
        human_review_notes=final_state.human_review_notes or "",
        watchlist_hits=final_state.watchlist_hits,
        recommendation=recommendation,
        agent_run_id=f"run-{final_state.shipment_ref}-complete",
        completed_at=datetime.utcnow().isoformat() if hasattr(datetime, "utcnow") else ""
    )
