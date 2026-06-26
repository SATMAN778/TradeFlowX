"""
src/nodes/variance_analyzer.py — Variance Analyzer node.
"""

import logging
from src.state import AgentState
from src.assets import get_duty_entity_id
from src.tools.entities_api import query_records_by_case

logger = logging.getLogger(__name__)


def variance_analyzer(state: AgentState) -> dict:
    """Query Data Service to fetch estimated duties and analyze the variance."""
    logger.info("Entering variance_analyzer node")
    state.validate_required_fields_at_node_boundary()

    duty_entity = get_duty_entity_id()
    logger.info(f"Querying estimated duty from Data Service entity '{duty_entity}' for shipment '{state.shipment_ref}'")
    records = query_records_by_case(duty_entity, state.shipment_ref)


    est_duty = state.estimated_duty_usd
    if records:
        est_duty = records[0].get("TotalDutyUsd", est_duty) or est_duty
        logger.info(f"Retrieved TotalDutyUsd from Data Service record: ${est_duty}")
    else:
        logger.info(f"No Data Service record found. Using input estimated_duty_usd: ${est_duty}")

    actual_duty = state.actual_duty_usd if state.actual_duty_usd is not None else 0.0
    logger.info(f"Reconciling: estimated_duty_usd=${est_duty}, actual_duty_usd=${actual_duty}")

    # Calculate variance
    variance_usd = actual_duty - est_duty
    if est_duty > 0:
        variance_pct = (variance_usd / est_duty) * 100.0
    else:
        variance_pct = 0.0

    # Flag review if variance exceeds the 5% threshold
    requires_finance = abs(variance_pct) > 5.0
    logger.info(f"Calculated variance: ${variance_usd:,.2f} ({variance_pct:+.2f}%). requires_finance_review={requires_finance}")

    return {
        "estimated_duty_usd": est_duty,
        "variance_usd": round(variance_usd, 2),
        "variance_pct": round(variance_pct, 2),
        "requires_finance_review": requires_finance
    }

