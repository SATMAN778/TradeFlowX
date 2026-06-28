"""
src/tests/test_agent.py — Integration tests for compiled LangGraph.
"""

import pytest
from src.agent import build_graph
from src.state import TransshipmentRiskState
from src.nodes.human_escalation import human_escalation
from main import main, TransshipmentInput, TransshipmentOutput, JobAttachment


def test_agent_low_risk_auto_clear():
    """Verify that a non-JAFZA supplier with a non-UAE COO auto-clears at Node 0."""
    graph = build_graph()
    
    initial_state = TransshipmentRiskState(
        shipment_ref="REF-LOW-RISK",
        declared_coo="GERMANY",
        supplier_name="Berlin Automotive",
        supplier_address="123 Berlin Way, Germany",
        jafza_flag=False,
        hts_code="8708.29.5060",
        product_description="Steel bracket parts"
    )
    
    config = {"configurable": {"thread_id": "thread-low"}}
    final_dict = graph.invoke(initial_state.model_dump(mode="json"), config)
    final_state = TransshipmentRiskState.model_validate(final_dict)
    
    assert final_state.risk_score == 0
    assert final_state.risk_level == "LOW"
    assert final_state.true_coo_verdict == "GERMANY"
    assert final_state.job_status == "completed"


def test_agent_confirmed_uae_manufacturer():
    """Verify that JAFZA supplier with confirmed UAE transformation bypasses tracer node."""
    graph = build_graph()
    
    initial_state = TransshipmentRiskState(
        shipment_ref="REF-CONFIRMED-MFG",
        declared_coo="UAE",
        supplier_name="Dubai Industrial Extrusions",
        supplier_address="JAFZA, Dubai, UAE",
        jafza_flag=True,
        hts_code="7604.21.0000",
        product_description="Extruded aluminum frames",
        coo_certificate="Dubai Chamber of Commerce. Form A seal. Substantial transformation in UAE."
    )
    
    config = {"configurable": {"thread_id": "thread-mfg"}}
    final_dict = graph.invoke(initial_state.model_dump(mode="json"), config)
    final_state = TransshipmentRiskState.model_validate(final_dict)
    
    assert final_state.substantial_transform is True
    # Bypassed origin_tracer, so third_country_origin remains None
    assert final_state.third_country_origin is None
    # Deductions applied (-30 confirmed, -20 Chamber Form A) -> score is 0
    assert final_state.risk_score == 0
    assert final_state.true_coo_verdict == "UAE"


def test_agent_interrupt_and_resume_cycle():
    """Verify the interrupt and resume workflow (Node 4 human escalation)."""
    # 1. Run main() for high-risk inconclusive transshipment (should trigger interrupt)
    inp = TransshipmentInput(
        shipment_ref="REF-HITL-100",
        declared_coo="UAE",
        supplier_name="Watchlist Trading LLC",
        supplier_address="JAFZA, Dubai, UAE",
        jafza_flag=True,
        hts_code="8542.31.0000",
        product_description="Microprocessors",
        coo_certificate="Repackaged in Dubai, source unknown."
    )
    
    out: TransshipmentOutput = main(inp)
    
    # Verify it returned intermediate/interrupted output
    assert out.human_escalation_triggered is True
    assert out.true_coo_verdict == "UNRESOLVED — Compliance Review Task Triggered"
    assert "Compliance reviewer action center task HT-08 created" in out.recommendation
    
    # 2. Resume by calling main() again with review notes (override origin: China)
    resume_inp = TransshipmentInput(
        shipment_ref="REF-HITL-100",
        declared_coo="UAE",
        supplier_name="Watchlist Trading LLC",
        supplier_address="JAFZA, Dubai, UAE",
        jafza_flag=True,
        hts_code="8542.31.0000",
        product_description="Microprocessors",
        coo_certificate="Repackaged in Dubai, source unknown.",
        human_review_notes="Reviewer verified sourcing; override: China"
    )
    
    resume_out: TransshipmentOutput = main(resume_inp)
    
    # Verify the graph completed successfully after resuming
    assert resume_out.human_escalation_triggered is True
    assert resume_out.human_review_notes == "Reviewer verified sourcing; override: China"
    assert resume_out.true_coo_verdict == "China"
    assert resume_out.risk_level in ["HIGH", "CRITICAL"]
    assert resume_out.section_301_applicable is True
