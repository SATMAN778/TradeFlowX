"""
src/nodes/reconciliation_decision_maker.py — Reconciliation Decision Maker node.
"""

import logging
from src.state import AgentState

logger = logging.getLogger(__name__)


def reconciliation_decision_maker(state: AgentState) -> dict:
    """Synthesize compliance findings and savings options into a legal recommendation summary."""
    logger.info("Entering reconciliation_decision_maker node")
    state.validate_required_fields_at_node_boundary()


    summary = (
        f"Post-Entry Audit & Duty Reconciliation for Case {state.shipment_ref}\n"
        f"============================================================\n"
        f"HTS Classification: Declared: {state.hts_code} | Assessed: {state.extracted_hts_code or 'None'}\n"
        f"Dutiable Shipment Value: ${state.shipment_value_usd:,.2f}\n"
        f"Estimated Duty Amount: ${state.estimated_duty_usd:,.2f}\n"
        f"CBP-Assessed Actual Duty: ${state.actual_duty_usd if state.actual_duty_usd is not None else 0.0:,.2f}\n"
        f"Variance: ${state.variance_usd if state.variance_usd is not None else 0.0:,.2f} "
        f"({state.variance_pct if state.variance_pct is not None else 0.0:+.2f}%)\n"
    )

    if state.requires_finance_review:
        summary += "⚠️ Variance exceeds 5.0% threshold. Finance Review (HT-17) required.\n"
    else:
        summary += "✓ Duty variance is within compliance tolerance limits (<5.0%).\n"

    if state.requires_counsel_review:
        summary += (
            f"\n★ Duty Savings Opportunity: {state.opportunity_type}\n"
            f"  Estimated Savings: ${state.estimated_savings_usd:,.2f}\n"
            f"  Counsel Recommendation: {state.counsel_recommendation}\n"
            f"  Trade Counsel Review (HT-18) required.\n"
        )
    else:
        summary += "\n✓ No duty savings opportunities identified for this shipment structure.\n"

    # Append summary statement to message history
    logger.info(f"Synthesized Reconciliation Summary:\n{summary}")
    return {
        "messages": [summary]
    }

