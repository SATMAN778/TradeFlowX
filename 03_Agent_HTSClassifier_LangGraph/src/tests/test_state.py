"""
src/tests/test_state.py — Unit tests for state.py models.
"""

import pytest
from pydantic import ValidationError
from src.state import AgentState, ClassificationResult, ProductFacts, HeadingCandidate


def test_product_facts_validation():
    """Verify that ProductFacts validates correct attributes."""
    facts = ProductFacts(
        description="Laptop Computer",
        material_composition=["aluminum", "silicon"],
        function="computing",
        end_use="personal office",
        assembly_state="finished good",
        country_of_origin="CN",
        packaging="cardboard box"
    )
    assert facts.description == "Laptop Computer"
    assert facts.material_composition == ["aluminum", "silicon"]


def test_classification_result_hts_format_validator():
    """Verify that HTS code format validation raises error on bad patterns."""
    # Valid pattern should pass
    res = ClassificationResult(
        final_hts_code="8471.30.0100",
        duty_rate=0.02,
        confidence=0.95,
        gri_rule_applied="GRI 1",
        reasoning_summary="Test narrative",
        citations=["Note 1"],
        requires_human_review=False
    )
    assert res.final_hts_code == "8471.30.0100"

    # Bad pattern should raise ValidationError
    with pytest.raises(ValidationError):
        ClassificationResult(
            final_hts_code="8471300100",  # missing dots
            duty_rate=0.02,
            confidence=0.95,
            gri_rule_applied="GRI 1",
            reasoning_summary="Test narrative",
            citations=["Note 1"],
            requires_human_review=False
        )


def test_enforce_null_hts_requires_review():
    """Verify that empty/absent HTS code requires human review to be True."""
    # Empty HTS code with requires_human_review=True is allowed
    res = ClassificationResult(
        final_hts_code="",
        duty_rate=None,
        confidence=0.0,
        gri_rule_applied="None",
        reasoning_summary="No candidate found",
        citations=[],
        requires_human_review=True
    )
    assert res.final_hts_code == ""

    # Empty HTS code with requires_human_review=False must raise ValidationError (Req 15.4)
    with pytest.raises(ValidationError):
        ClassificationResult(
            final_hts_code="",
            duty_rate=None,
            confidence=0.95,
            gri_rule_applied="GRI 1",
            reasoning_summary="No candidate found",
            citations=[],
            requires_human_review=False
        )


def test_agent_state_boundary_validation():
    """Verify that AgentState raises validation error if job_id or shipment_doc_path is empty at boundary."""
    # Missing job_id
    with pytest.raises(ValidationError):
        AgentState(
            job_id="",
            shipment_doc_path="document.pdf"
        )

    # Missing shipment_doc_path
    with pytest.raises(ValidationError):
        AgentState(
            job_id="123e4567-e89b-12d3-a456-426614174000",
            shipment_doc_path=""
        )

    # Valid state
    state = AgentState(
        job_id="123e4567-e89b-12d3-a456-426614174000",
        shipment_doc_path="document.pdf"
    )
    assert state.job_status == "running"
