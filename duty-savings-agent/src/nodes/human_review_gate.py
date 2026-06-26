"""
src/nodes/human_review_gate.py — Human Review Gate node.

Creates Action Center tasks (HT-17 and HT-18) using the UiPath platform client
and raises interrupts to pause/resume graph execution.
"""

import uuid
import logging
from uipath.platform import UiPath
from langgraph.types import interrupt
from src.state import AgentState

logger = logging.getLogger(__name__)


def create_task(title: str, task_code: str, state_dict: dict) -> str:
    """Create an Action Center task and return its ID."""
    logger.info(f"Creating Action Center task '{title}' ({task_code})...")
    try:
        sdk = UiPath()
        task = sdk.tasks.create(
            title=title,
            data=state_dict,
            app_name="maestro-app"
        )
        logger.info(f"Successfully created Action Center task ID: {task.id}")
        return str(task.id)
    except Exception as e:
        logger.warning(f"Failed to create Action Center task via SDK: {e}. Falling back to mock task ID.")
        # Local testing fallback
        return f"mock-{task_code}-{str(uuid.uuid4())[:8]}"


def human_review_gate(state: AgentState) -> dict:
    """Pause graph execution using interrupts if human reviews are pending."""
    logger.info("Entering human_review_gate node")
    state.validate_required_fields_at_node_boundary()
    updates = {}

    # 1. Finance Review Gate (HT-17)
    if state.requires_finance_review and not state.finance_review_notes:
        task_id = state.action_center_task_id
        if not task_id:
            # Create HT-17 task in Action Center
            task_id = create_task(
                title=f"HT-17: Finance Variance Review - Case {state.shipment_ref}",
                task_code="HT-17",
                state_dict=state.model_dump(mode="json")
            )
            updates["action_center_task_id"] = task_id
            state.action_center_task_id = task_id

        # Raise LangGraph interrupt to pause execution
        task_payload = {
            "task_id": task_id,
            "task_code": "HT-17",
            "shipment_ref": state.shipment_ref,
            "variance_pct": state.variance_pct,
            "variance_usd": state.variance_usd,
            "estimated_duty_usd": state.estimated_duty_usd,
            "actual_duty_usd": state.actual_duty_usd,
            "instruction": "Finance approval required for duty variance exceeding 5% threshold."
        }
        
        logger.info(f"Interrupting graph execution for HT-17 Finance Variance Review (Task: {task_id})...")
        resume_val = interrupt(task_payload)
        logger.info(f"Resumed from HT-17 interrupt. Received payload: {resume_val}")

        # Process the resume input (can be string note or task action dictionary)
        notes = ""
        if isinstance(resume_val, str):
            notes = resume_val
        elif isinstance(resume_val, dict):
            notes = resume_val.get("approvalNotes") or resume_val.get("finance_review_notes") or ""

        updates["finance_review_notes"] = notes or "Reviewed and approved."
        updates["action_center_task_id"] = None
        logger.info(f"Set finance_review_notes to: {updates['finance_review_notes']}")
        return updates

    # 2. Trade Counsel Review Gate (HT-18)
    if state.requires_counsel_review and not state.counsel_review_notes:
        task_id = state.action_center_task_id
        if not task_id:
            # Create HT-18 task in Action Center
            task_id = create_task(
                title=f"HT-18: Duty Savings Opportunity - Case {state.shipment_ref}",
                task_code="HT-18",
                state_dict=state.model_dump(mode="json")
            )
            updates["action_center_task_id"] = task_id
            state.action_center_task_id = task_id

        # Raise LangGraph interrupt to pause execution
        task_payload = {
            "task_id": task_id,
            "task_code": "HT-18",
            "shipment_ref": state.shipment_ref,
            "opportunity_type": state.opportunity_type,
            "estimated_savings_usd": state.estimated_savings_usd,
            "counsel_recommendation": state.counsel_recommendation,
            "instruction": "Trade counsel decision required to pursue or decline savings opportunity."
        }
        
        logger.info(f"Interrupting graph execution for HT-18 Trade Counsel Review (Task: {task_id})...")
        resume_val = interrupt(task_payload)
        logger.info(f"Resumed from HT-18 interrupt. Received payload: {resume_val}")

        notes = ""
        if isinstance(resume_val, str):
            notes = resume_val
        elif isinstance(resume_val, dict):
            notes = resume_val.get("decisionNotes") or resume_val.get("counsel_review_notes") or ""

        updates["counsel_review_notes"] = notes or "Savings decision made."
        updates["action_center_task_id"] = None
        logger.info(f"Set counsel_review_notes to: {updates['counsel_review_notes']}")
        return updates

    logger.info("No reviews pending. human_review_gate skipped.")
    return {}

