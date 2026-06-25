"""
src/tests/test_nodes.py — Unit tests for LangGraph nodes and graph compilation.
"""

import pytest
from src.state import AgentState, ProductFacts, ClassificationResult
from src.nodes.orchestrator import orchestrator_planner
from src.nodes.product_spec_extractor import product_spec_extractor
from src.nodes.hts_heading_search import hts_heading_candidate_search
from src.nodes.gri_reasoning import gri_reasoning_agent
from src.nodes.ruling_precedent import ruling_precedent_agent
from src.nodes.classification_reconciler import classification_reconciler
from src.nodes.human_review_gate import human_review_gate
from src.nodes.audit_trail_writer import audit_trail_writer
from src.agent import build_graph, check_review_needed


def test_orchestrator_planner():
    """Verify that orchestrator_planner sets the plan."""
    state = AgentState(
        job_id="123e4567-e89b-12d3-a456-426614174000",
        shipment_doc_path="document.txt"
    )
    res = orchestrator_planner(state)
    assert "Plan" in res["plan"]


def test_product_spec_extractor_mock():
    """Verify product extractor fallback logic with mock keywords."""
    state = AgentState(
        job_id="123e4567-e89b-12d3-a456-426614174000",
        shipment_doc_path="This shipment contains laptop computers with batteries"
    )
    res = product_spec_extractor(state)
    facts = res["product_facts"]
    assert isinstance(facts, ProductFacts)
    assert "Laptop" in facts.description
    assert facts.assembly_state == "finished good"
    assert facts.country_of_origin == "CN"


def test_reconciler_and_confidence_gate():
    """Verify that recombiner selects the top candidate and checks threshold."""
    # Build a state with candidates
    from src.state import HeadingCandidate
    candidates = [
        HeadingCandidate(
            hts_code="8471.30.0100",
            chapter="84",
            heading_text="Laptops",
            confidence=0.92,
            supporting_notes=[],
            ruling_citations=[],
            dataset_version="2026-Q1"
        )
    ]
    facts = ProductFacts(
        description="Laptop Computer",
        material_composition=["silicon"],
        function="computing",
        end_use="personal office",
        assembly_state="finished good",
        country_of_origin="CN",
        packaging="box"
    )
    state = AgentState(
        job_id="123e4567-e89b-12d3-a456-426614174000",
        shipment_doc_path="document.txt",
        candidates=candidates,
        product_facts=facts
    )

    res = classification_reconciler(state)
    result = res["result"]
    assert isinstance(result, ClassificationResult)
    assert result.final_hts_code == "8471.30.0100"
    
    # Confidence 0.92 is above confidence threshold 0.85 -> requires_human_review should be False
    assert result.requires_human_review is False

    # Low confidence should set requires_human_review = True
    candidates[0].confidence = 0.60
    state = AgentState(
        job_id="123e4567-e89b-12d3-a456-426614174000",
        shipment_doc_path="document.txt",
        candidates=candidates,
        product_facts=facts
    )
    res2 = classification_reconciler(state)
    assert res2["result"].requires_human_review is True


def test_routing_edge():
    """Verify check_review_needed returns correct node target."""
    result_ok = ClassificationResult(
        final_hts_code="8471.30.0100",
        duty_rate=0.02,
        confidence=0.95,
        gri_rule_applied="GRI 1",
        reasoning_summary="Narrative",
        citations=[],
        requires_human_review=False
    )
    result_fail = ClassificationResult(
        final_hts_code="8471.30.0100",
        duty_rate=0.02,
        confidence=0.60,
        gri_rule_applied="GRI 1",
        reasoning_summary="Narrative",
        citations=[],
        requires_human_review=True
    )

    # 1. OK classification -> directly to audit writer
    state = AgentState(
        job_id="123e4567-e89b-12d3-a456-426614174000",
        shipment_doc_path="document.txt",
        result=result_ok
    )
    assert check_review_needed(state) == "audit_trail_writer"

    # 2. Review needed, no reviewer -> human review gate
    state = AgentState(
        job_id="123e4567-e89b-12d3-a456-426614174000",
        shipment_doc_path="document.txt",
        result=result_fail
    )
    assert check_review_needed(state) == "human_review_gate"

    # 3. Review needed, reviewer present (resumed) -> audit writer
    state = AgentState(
        job_id="123e4567-e89b-12d3-a456-426614174000",
        shipment_doc_path="document.txt",
        result=result_fail,
        reviewer_identity="John Doe"
    )
    assert check_review_needed(state) == "audit_trail_writer"


def test_compiled_graph():
    """Verify that build_graph compiles cleanly."""
    graph = build_graph()
    assert graph is not None
