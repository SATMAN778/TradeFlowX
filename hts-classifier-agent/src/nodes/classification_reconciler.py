"""
src/nodes/classification_reconciler.py — Classification reconciler node.

Reconciles heading candidates to select the final HTS code, calculates duty rates, and determines if human review is required.
"""

from src.state import AgentState, ClassificationResult
from src.tools.duty_rate import calc_duty_rate
from src.assets import get_confidence_threshold


def classification_reconciler(state: AgentState) -> dict:
    """Select the final HTS code and construct the classification result."""
    state.validate_required_fields_at_node_boundary()

    # If no candidates are found
    if not state.candidates:
        result = ClassificationResult(
            final_hts_code="",
            duty_rate=None,
            confidence=0.0,
            gri_rule_applied="None",
            reasoning_summary="No HTS heading candidates were found. Manual classification is required.",
            citations=[],
            requires_human_review=True
        )
        return {"result": result}

    # Select the top candidate
    top_candidate = state.candidates[0]
    
    # Check for confidence ties (Requirement 10.4)
    # If there is a tie, flag for human review
    is_tie = False
    if len(state.candidates) > 1:
        if abs(state.candidates[0].confidence - state.candidates[1].confidence) < 1e-9:
            is_tie = True

    # Calculate duty rate using the tool
    duty_calc = calc_duty_rate(top_candidate.hts_code, state.product_facts.country_of_origin)

    # Determine if human review is required based on confidence threshold and ties
    threshold = get_confidence_threshold()
    requires_human_review = False

    if is_tie:
        requires_human_review = True
        narrative = f"A tie was detected between heading candidates '{state.candidates[0].hts_code}' and '{state.candidates[1].hts_code}'. Human review is required."
    elif top_candidate.confidence < threshold:
        requires_human_review = True
        narrative = f"The classification confidence score {top_candidate.confidence:.2f} is below the threshold of {threshold:.2f}."
    elif duty_calc.requires_human_review:
        requires_human_review = True
        narrative = "The duty rate calculation failed or returned incomplete data. Human review is required."
    else:
        narrative = f"The product was successfully classified under HTS code {top_candidate.hts_code} with confidence {top_candidate.confidence:.2f}."

    # Build the full legal reasoning summary narrative
    reasoning_summary = (
        f"HTS Classification Narrative for product: {state.product_facts.description}.\n"
        f"Facts: Material={state.product_facts.material_composition}, Function={state.product_facts.function}, COO={state.product_facts.country_of_origin}.\n"
        f"GRI Analysis: Evaluated heading {top_candidate.hts_code}. Supporting notes cite: {', '.join(top_candidate.supporting_notes)}.\n"
        f"CROSS Precedents: Cited rulings: {', '.join(top_candidate.ruling_citations)}.\n"
        f"Reconciliation: {narrative}"
    )

    # Collect all citations
    citations = list(set(top_candidate.supporting_notes + top_candidate.ruling_citations))

    result = ClassificationResult(
        final_hts_code=top_candidate.hts_code,
        duty_rate=duty_calc.total_rate,
        confidence=top_candidate.confidence,
        gri_rule_applied="GRI 1",  # Primary default rule
        reasoning_summary=reasoning_summary,
        citations=citations,
        requires_human_review=requires_human_review
    )

    return {"result": result}
