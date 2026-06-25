"""
src/nodes/ruling_precedent.py — Ruling precedent agent node.

Queries CBP CROSS rulings to confirm classification precedents and adjusts candidate confidence.
"""

from src.state import AgentState, HeadingCandidate
from src.tools.cross_rulings import search_cross_rulings


def ruling_precedent_agent(state: AgentState) -> dict:
    """Evaluate candidates against CBP CROSS classification rulings."""
    state.validate_required_fields_at_node_boundary()

    if not state.product_facts or not state.candidates:
        return {}

    updated_candidates = []

    for candidate in state.candidates:
        # Search CROSS rulings for the product and the candidate HTS code
        rulings = search_cross_rulings(
            product_description=state.product_facts.description,
            hts_code=candidate.hts_code
        )

        ruling_citations = [r.ruling_number for r in rulings]
        
        # Adjust confidence based on found rulings
        confidence = candidate.confidence
        if rulings:
            # If legal precedents are found, increase confidence
            confidence = min(1.0, confidence + 0.05)
        else:
            # If no rulings are found, set default citation
            ruling_citations = ["no_ruling_found"]

        # Accumulate citations and merge with existing ones
        citations = list(set(candidate.ruling_citations + ruling_citations))
        if "no_ruling_found" in citations and len(citations) > 1:
            citations.remove("no_ruling_found")

        updated_candidates.append(HeadingCandidate(
            hts_code=candidate.hts_code,
            chapter=candidate.chapter,
            heading_text=candidate.heading_text,
            confidence=confidence,
            supporting_notes=candidate.supporting_notes,
            ruling_citations=citations,
            dataset_version=candidate.dataset_version
        ))

    # Sort candidates by confidence descending
    updated_candidates.sort(key=lambda c: c.confidence, reverse=True)
    return {"candidates": updated_candidates}
