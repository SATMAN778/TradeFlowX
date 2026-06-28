"""
src/nodes/human_escalation.py — Human Escalation node.
"""

from langgraph.types import interrupt
from src.state import TransshipmentRiskState


def human_escalation(state: TransshipmentRiskState) -> dict:
    """Pause execution and request human review for verification."""
    state.validate_required_fields_at_node_boundary()

    # If review notes are already populated in state, we have successfully resumed
    if state.human_review_notes and state.human_review_notes.strip():
        return {"human_escalation": True}

    # Otherwise, raise interrupt to pause the graph execution
    watchlist_summary = ", ".join(h.get("list_name") for h in state.watchlist_hits) if state.watchlist_hits else "None"
    
    task_payload = {
        "shipment_ref": state.shipment_ref,
        "supplier_name": state.supplier_name,
        "supplier_address": state.supplier_address,
        "declared_coo": state.declared_coo,
        "third_country_origin": state.third_country_origin or "Unknown",
        "hts_code": state.hts_code,
        "watchlist_summary": watchlist_summary,
        "instruction": "HT-08: Transshipment COO Verification Required"
    }

    # Call LangGraph interrupt to pause graph and save state to checkpointer
    resume_value = interrupt(task_payload)

    # When resumed, process the notes
    notes = ""
    if isinstance(resume_value, str) and resume_value.strip():
        notes = resume_value
    elif isinstance(resume_value, dict):
        notes = resume_value.get("human_review_notes", "")

    if not notes and state.human_review_notes:
        notes = state.human_review_notes

    return {
        "human_escalation": True,
        "human_review_notes": notes,
        "job_status": "running"
    }
