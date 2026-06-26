"""
src/nodes/verdict_publisher.py — Verdict Publisher node.
"""

from datetime import datetime
from src.state import TransshipmentRiskState


def verdict_publisher(state: TransshipmentRiskState) -> dict:
    """Publish final verdict payload for Maestro integration."""
    state.validate_required_fields_at_node_boundary()

    # Determine recommendation
    true_coo = state.true_coo_verdict or state.declared_coo
    risk_level = state.risk_level or "LOW"

    if true_coo.upper() == "UAE":
        recommendation = "Proceed with standard customs entry. UAE COO is verified."
    elif true_coo.upper() == "CHINA":
        recommendation = "Apply Section 301 List duties. Update HTS duty calculation. Flag for CBP audit readiness."
    elif true_coo.upper() == "IRAN" or state.iran_russia_nexus:
        recommendation = "CRITICAL: OFAC/Sanctions violation risk. Block case immediately. Escalate to legal counsel."
    elif "CBP ruling required" in true_coo:
        recommendation = "Hold shipment. File for CBP binding ruling request before entry filing."
    else:
        if risk_level in ["HIGH", "CRITICAL"]:
            recommendation = f"High risk origin detected ({true_coo}). Flag for broker review and check ADD/CVD orders."
        else:
            recommendation = f"Standard customs entry for true COO: {true_coo}. Recalculate duties if changed."

    # Determine Section 301 surcharge rate
    sec_301_rate = "0%"
    if state.section_301_applicable:
        sec_301_rate = "25%"

    # Construct complete payload
    verdict = {
        "shipment_ref": state.shipment_ref,
        "agent": "TransshipmentRiskAgent",
        "true_coo_verdict": true_coo,
        "declared_coo": state.declared_coo,
        "transshipment_risk_score": state.risk_score or 0,
        "risk_level": risk_level,
        "section_301_applicable": bool(state.section_301_applicable),
        "section_301_surcharge_rate": sec_301_rate,
        "add_cvd_applicable": bool(state.add_cvd_applicable),
        "human_escalation_triggered": state.human_escalation,
        "human_review_notes": state.human_review_notes or "",
        "watchlist_hits": state.watchlist_hits or [],
        "recommendation": recommendation,
        "agent_run_id": f"run-{state.shipment_ref}-{datetime.now().strftime('%Y%m%d%H%M')}",
        "completed_at": datetime.now().isoformat()
    }

    # Mark job status as completed
    return {
        "job_status": "completed"
    }
