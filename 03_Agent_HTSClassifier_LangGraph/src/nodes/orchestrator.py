"""
src/nodes/orchestrator.py — Orchestrator planner node.

Writes the classification plan into AgentState.plan.
"""

from src.state import AgentState


def orchestrator_planner(state: AgentState) -> dict:
    """Initialize the classification plan outline."""
    # Ensure job ID and shipment path are validated (Pydantic validator does this at boundary)
    state.validate_required_fields_at_node_boundary()

    plan = f"""HTS Classification Job Plan for Job {state.job_id}
1. Extract product details from shipment document at: {state.shipment_doc_path}
2. Search USITC HTS heading candidates
3. Run GRI reasoning loop over Section and Chapter Notes
4. Consult CBP CROSS rulings for precedents
5. Reconcile candidates and calculate duty rates
6. Route to human review if confidence is below threshold
7. Save audit trail to storage bucket
"""
    return {"plan": plan}
