"""
src/agent.py — LangGraph graph definition and conditional edge routing.

Wires all node functions into a StateGraph(AgentState) following the topology:
  orchestrator_planner
    → product_spec_extractor
    → hts_heading_candidate_search
    → gri_reasoning_agent
    → ruling_precedent_agent
    → classification_reconciler
    → [conditional: check_review_needed]
        → human_review_gate  (if review required)
        → audit_trail_writer (if no review required)
  human_review_gate → audit_trail_writer
  audit_trail_writer → END
"""

from langgraph.graph import StateGraph, END
from src.state import AgentState
from src.nodes import (
    orchestrator_planner,
    product_spec_extractor,
    hts_heading_candidate_search,
    gri_reasoning_agent,
    ruling_precedent_agent,
    classification_reconciler,
    human_review_gate,
    audit_trail_writer,
)


def check_review_needed(state: AgentState) -> str:
    """Determine routing based on whether human review is required and has occurred."""
    if state.result and state.result.requires_human_review:
        if state.reviewer_identity is None:
            return "human_review_gate"
    return "audit_trail_writer"


def build_graph():
    """Build and compile the StateGraph workflow."""
    workflow = StateGraph(AgentState)

    # Add all node functions
    workflow.add_node("orchestrator_planner", orchestrator_planner)
    workflow.add_node("product_spec_extractor", product_spec_extractor)
    workflow.add_node("hts_heading_candidate_search", hts_heading_candidate_search)
    workflow.add_node("gri_reasoning_agent", gri_reasoning_agent)
    workflow.add_node("ruling_precedent_agent", ruling_precedent_agent)
    workflow.add_node("classification_reconciler", classification_reconciler)
    workflow.add_node("human_review_gate", human_review_gate)
    workflow.add_node("audit_trail_writer", audit_trail_writer)

    # Set start node
    workflow.set_entry_point("orchestrator_planner")

    # Add standard edges
    workflow.add_edge("orchestrator_planner", "product_spec_extractor")
    workflow.add_edge("product_spec_extractor", "hts_heading_candidate_search")
    workflow.add_edge("hts_heading_candidate_search", "gri_reasoning_agent")
    workflow.add_edge("gri_reasoning_agent", "ruling_precedent_agent")
    workflow.add_edge("ruling_precedent_agent", "classification_reconciler")

    # Add conditional edge from the reconciler
    workflow.add_conditional_edges(
        "classification_reconciler",
        check_review_needed,
        {
            "human_review_gate": "human_review_gate",
            "audit_trail_writer": "audit_trail_writer",
        }
    )

    # Complete the graph paths
    workflow.add_edge("human_review_gate", "audit_trail_writer")
    workflow.add_edge("audit_trail_writer", END)

    # Compile the graph
    return workflow.compile()


__all__ = ["build_graph", "check_review_needed"]


graph = build_graph()
__all__.append('graph')
