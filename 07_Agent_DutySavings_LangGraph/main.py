"""
main.py — Entry point for the Duty Savings Analysis Agent.

Accepts shipment details, runs the LangGraph compliance/savings workflow,
and returns the variance analysis and savings recommendations.
"""

import uuid
import os
from typing import Optional, Dict
from pydantic import BaseModel, Field
from uipath.platform import UiPath

from src.state import AgentState, JobAttachment
from src.graph import build_graph


# ---------------------------------------------------------------------------
# Input/Output Models matching entry-points.json
# ---------------------------------------------------------------------------

class DutySavingsInput(BaseModel):
    shipment_ref: str = Field(description="Maestro Case Reference / shipment ID")
    shipmentDocument: Optional[JobAttachment] = Field(default=None, description="The uploaded CBP 7501 Entry Summary or invoice document.")
    hts_code: str = Field(description="Declared HTS classification code")
    declared_coo: str = Field(description="Declared Country of Origin, e.g. UAE")
    shipment_value_usd: Optional[float] = Field(default=0.0, description="Dutiable value of the cargo in USD")
    estimated_duty_usd: Optional[float] = Field(default=0.0, description="Estimated duty amount from calculation stage")
    actual_duty_usd: Optional[float] = Field(default=None, description="Actual CBP-assessed duty amount, if already known")
    jafza_flag: Optional[bool] = Field(default=False, description="True if supplier address is in JAFZA Free Zone")
    transshipment_flag: Optional[bool] = Field(default=False, description="True if transshipment has occurred")
    has_reexport_intent: Optional[bool] = Field(default=False, description="True if re-export intent has been flagged")
    
    # Action Center resume inputs
    finance_review_notes: Optional[str] = Field(default=None, description="Review notes from HT-17 Finance task")
    counsel_review_notes: Optional[str] = Field(default=None, description="Review notes from HT-18 Trade Counsel task")


class DutySavingsOutput(BaseModel):
    shipment_ref: str
    actual_duty_usd: Optional[float] = None
    estimated_duty_usd: Optional[float] = None
    variance_usd: Optional[float] = None
    variance_pct: Optional[float] = None
    opportunity_type: Optional[str] = None
    estimated_savings_usd: Optional[float] = None
    counsel_recommendation: Optional[str] = None
    requires_finance_review: bool
    requires_counsel_review: bool
    action_center_task_id: Optional[str] = None
    audit_bucket_path: Optional[str] = None
    job_status: str


# ---------------------------------------------------------------------------
# Main Handler
# ---------------------------------------------------------------------------

def main(input: DutySavingsInput) -> DutySavingsOutput:
    """Run the post-entry duty savings and variance reconciliation workflow."""
    shipment_doc_path = None

    # 1. Resolve and download attachment if provided
    if input.shipmentDocument:
        try:
            sdk = UiPath()
            temp_dir = r"C:\Users\gupta\.gemini\antigravity-ide\scratch\downloads"
            os.makedirs(temp_dir, exist_ok=True)
            local_path = sdk.attachments.download(
                key=uuid.UUID(input.shipmentDocument.ID),
                target_directory=temp_dir
            )
            if local_path and os.path.exists(local_path):
                shipment_doc_path = local_path
        except Exception:
            # Fallback to local name or mock
            if input.shipmentDocument.FullName:
                shipment_doc_path = input.shipmentDocument.FullName

    # 2. Build initial state
    state = AgentState(
        shipment_ref=input.shipment_ref,
        shipment_doc_path=shipment_doc_path,
        hts_code=input.hts_code,
        declared_coo=input.declared_coo,
        shipment_value_usd=input.shipment_value_usd or 0.0,
        estimated_duty_usd=input.estimated_duty_usd or 0.0,
        actual_duty_usd=input.actual_duty_usd,
        jafza_flag=bool(input.jafza_flag),
        transshipment_flag=bool(input.transshipment_flag),
        has_reexport_intent=bool(input.has_reexport_intent),
        finance_review_notes=input.finance_review_notes,
        counsel_review_notes=input.counsel_review_notes,
        job_status="running"
    )

    # 3. Compile the StateGraph workflow
    graph = build_graph()
    config = {"configurable": {"thread_id": input.shipment_ref}}

    # 4. Invoke or Resume Graph
    try:
        is_resume = False
        resume_data = {}

        # Check if we are resuming from interrupt checkpoints
        if input.finance_review_notes:
            is_resume = True
            resume_data["finance_review_notes"] = input.finance_review_notes
        if input.counsel_review_notes:
            is_resume = True
            resume_data["counsel_review_notes"] = input.counsel_review_notes

        if is_resume:
            current_state = graph.get_state(config)
            if current_state and current_state.next:
                # Update the checkpoint state with the review notes
                graph.update_state(config, resume_data)
                # Resume execution by invoking with None
                final_state_dict = graph.invoke(None, config)
            else:
                # No active checkpoint, invoke from start
                state_dict = state.model_dump(mode="json")
                final_state_dict = graph.invoke(state_dict, config)
        else:
            # Clean start invocation
            state_dict = state.model_dump(mode="json")
            final_state_dict = graph.invoke(state_dict, config)

        final_state = AgentState.model_validate(final_state_dict)

        # Check if the graph is currently paused at an interrupt (e.g. Action Center task created)
        post_invoke_state = graph.get_state(config)
        if post_invoke_state and post_invoke_state.next:
            return DutySavingsOutput(
                shipment_ref=state.shipment_ref,
                actual_duty_usd=final_state.actual_duty_usd,
                estimated_duty_usd=final_state.estimated_duty_usd,
                variance_usd=final_state.variance_usd,
                variance_pct=final_state.variance_pct,
                opportunity_type=final_state.opportunity_type,
                estimated_savings_usd=final_state.estimated_savings_usd,
                counsel_recommendation=final_state.counsel_recommendation,
                requires_finance_review=final_state.requires_finance_review,
                requires_counsel_review=final_state.requires_counsel_review,
                action_center_task_id=final_state.action_center_task_id,
                audit_bucket_path=None,
                job_status="interrupted"
            )

    except Exception as e:
        return DutySavingsOutput(
            shipment_ref=state.shipment_ref,
            actual_duty_usd=state.actual_duty_usd,
            estimated_duty_usd=state.estimated_duty_usd,
            variance_usd=None,
            variance_pct=None,
            opportunity_type=None,
            estimated_savings_usd=0.0,
            counsel_recommendation=f"Execution error: {e}",
            requires_finance_review=False,
            requires_counsel_review=False,
            action_center_task_id=None,
            audit_bucket_path=None,
            job_status="failed"
        )

    # 5. Return completed output
    return DutySavingsOutput(
        shipment_ref=final_state.shipment_ref,
        actual_duty_usd=final_state.actual_duty_usd,
        estimated_duty_usd=final_state.estimated_duty_usd,
        variance_usd=final_state.variance_usd,
        variance_pct=final_state.variance_pct,
        opportunity_type=final_state.opportunity_type,
        estimated_savings_usd=final_state.estimated_savings_usd,
        counsel_recommendation=final_state.counsel_recommendation,
        requires_finance_review=final_state.requires_finance_review,
        requires_counsel_review=final_state.requires_counsel_review,
        action_center_task_id=final_state.action_center_task_id,
        audit_bucket_path=final_state.audit_bucket_path,
        job_status=final_state.job_status
    )
