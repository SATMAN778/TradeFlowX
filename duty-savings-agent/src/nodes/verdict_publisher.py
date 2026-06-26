"""
src/nodes/verdict_publisher.py — Verdict Publisher node.

Publishes reconciled duty calculations and variances back to Data Service entities.
"""

import logging
from datetime import datetime
from src.state import AgentState
from src.assets import get_duty_entity_id, get_case_entity_id
from src.tools.entities_api import query_records_by_case, update_record, insert_record

logger = logging.getLogger(__name__)


def verdict_publisher(state: AgentState) -> dict:
    """Publish variance analysis outcomes back to Data Service Case and DutyCalculation entities."""
    logger.info("Entering verdict_publisher node")
    state.validate_required_fields_at_node_boundary()


    duty_entity = get_duty_entity_id()
    case_entity = get_case_entity_id()

    # 1. Update DutyCalculation Entity
    logger.info(f"Querying DutyCalculation for CaseRef: {state.shipment_ref}")
    duty_records = query_records_by_case(duty_entity, state.shipment_ref)
    
    duty_payload = {
        "CaseRef": state.shipment_ref,
        "HtsCode": state.hts_code,
        "ActualDutyUsd": state.actual_duty_usd,
        "VarianceUsd": state.variance_usd,
        "VariancePct": state.variance_pct,
        "TotalDutyUsd": state.estimated_duty_usd,
        "CalculatedAt": datetime.utcnow().isoformat()
    }

    if duty_records:
        record_id = duty_records[0].get("Id") or duty_records[0].get("id") or duty_records[0].get("ID")
        logger.info(f"Updating existing DutyCalculation record ID: {record_id} with payload: {duty_payload}")
        update_record(duty_entity, record_id, duty_payload)
    else:
        logger.info(f"No existing DutyCalculation record found. Inserting new record with payload: {duty_payload}")
        insert_record(duty_entity, duty_payload)

    # 2. Update ImportCaseRecord Entity
    logger.info(f"Querying ImportCaseRecord for CaseRef: {state.shipment_ref}")
    case_records = query_records_by_case(case_entity, state.shipment_ref)
    if case_records:
        record_id = case_records[0].get("Id") or case_records[0].get("id") or case_records[0].get("ID")
        case_payload = {
            "CaseRef": state.shipment_ref,
            # Update duty amount and mark as Audited
            "DutyAmountUsd": state.actual_duty_usd,
            "CaseState": "Audited"
        }
        logger.info(f"Updating ImportCaseRecord ID: {record_id} with payload: {case_payload}")
        update_record(case_entity, record_id, case_payload)
    else:
        logger.warning(f"No matching ImportCaseRecord found for CaseRef '{state.shipment_ref}'. CaseState cannot be set to Audited.")

    logger.info("verdict_publisher node execution completed successfully.")
    return {
        "job_status": "completed"
    }

