"""
src/nodes/intake_router.py — Intake Router node.
"""

from src.state import TransshipmentRiskState


def intake_router(state: TransshipmentRiskState) -> dict:
    """Intake node checking if full transshipment analysis is required."""
    state.validate_required_fields_at_node_boundary()

    # Determine if we can auto-clear
    if not state.jafza_flag and state.declared_coo.upper() != "UAE":
        return {
            "risk_score": 0,
            "risk_level": "LOW",
            "true_coo_verdict": state.declared_coo,
            "job_status": "completed"
        }

    return {}
