"""
src/nodes/hts_heading_search.py — HTS heading candidate search node.

Searches for matching tariff headings based on extracted product facts and chapter hints.
"""

from src.state import AgentState
from src.tools.hts_search import search_hts_headings


def hts_heading_candidate_search(state: AgentState) -> dict:
    """Search USITC headings for matching candidates."""
    state.validate_required_fields_at_node_boundary()

    if not state.product_facts:
        return {}

    # Query using product description and chapter_hint
    candidates = search_hts_headings(
        query=state.product_facts.description,
        chapter_hint=state.chapter_hint
    )

    return {"candidates": candidates}
