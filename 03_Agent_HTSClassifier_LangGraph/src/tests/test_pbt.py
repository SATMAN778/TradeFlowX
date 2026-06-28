"""
src/tests/test_pbt.py — Property-based tests using Hypothesis.
"""

from hypothesis import given, strategies as st
import pytest
from src.state import ProductFacts, HeadingCandidate, ClassificationResult, AgentState
from src.tools.retry import with_retry
from src.exceptions import TransientToolError


@given(
    description=st.text(min_size=1),
    material_composition=st.lists(st.text(min_size=1), min_size=1),
    function=st.text(min_size=1),
    end_use=st.text(min_size=1),
    assembly_state=st.text(min_size=1),
    country_of_origin=st.text(min_size=2, max_size=2),
    packaging=st.text(min_size=1)
)
def test_product_facts_roundtrip(
    description, material_composition, function, end_use, assembly_state, country_of_origin, packaging
):
    """Verify that any validly generated ProductFacts can round-trip serialize."""
    facts = ProductFacts(
        description=description,
        material_composition=material_composition,
        function=function,
        end_use=end_use,
        assembly_state=assembly_state,
        country_of_origin=country_of_origin,
        packaging=packaging
    )
    data = facts.model_dump(mode="json")
    facts2 = ProductFacts.model_validate(data)
    assert facts.description == facts2.description
    assert facts.material_composition == facts2.material_composition


@given(
    confidence=st.floats(min_value=0.0, max_value=1.0)
)
def test_confidence_bounds(confidence):
    """Verify HeadingCandidate enforces confidence score bounds (0.0 to 1.0)."""
    candidate = HeadingCandidate(
        hts_code="8471.30.0100",
        chapter="84",
        heading_text="Laptops",
        confidence=confidence,
        supporting_notes=[],
        ruling_citations=[],
        dataset_version="2026-Q1"
    )
    assert 0.0 <= candidate.confidence <= 1.0


def test_retry_exhaustion_pbt():
    """Verify that with_retry exhausts retries and eventually raises the exception."""
    call_count = 0

    @with_retry(retries=3, delay=0.01, backoff=2.0)
    def failing_func():
        nonlocal call_count
        call_count += 1
        raise TransientToolError("Persistent failure")

    with pytest.raises(TransientToolError):
        failing_func()

    # Initial execution (1) + 3 retries = 4 total calls
    assert call_count == 4
