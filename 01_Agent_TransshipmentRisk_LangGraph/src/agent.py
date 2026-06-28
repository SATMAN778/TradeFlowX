"""
src/agent.py — LangGraph graph definition and conditional edge routing.
"""

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from src.state import TransshipmentRiskState
from src.nodes import (
    intake_router,
    supplier_profiler,
    coo_document_analyzer,
    origin_tracer,
    human_escalation,
    risk_scorer,
    verdict_publisher,
)


def route_after_intake(state: TransshipmentRiskState) -> str:
    """Intake routing: bypass directly to publisher if low risk, else do full analysis."""
    if state.risk_level == "LOW" and state.job_status == "completed":
        return "low_risk_exit"
    return "full_analysis"


def route_after_coo(state: TransshipmentRiskState) -> str:
    """COO Document Analyzer routing: bypass tracer if transformation is confirmed."""
    if state.substantial_transform is True:
        return "confirmed"
    elif state.substantial_transform is False:
        return "denied"
    else:
        return "inconclusive"


def route_after_origin(state: TransshipmentRiskState) -> str:
    """Origin Tracer routing: route to human review if critical triggers hit or inconclusive."""
    # Critical flag: Iran origin, Iran/Russia nexus, or watchlist hits
    if state.third_country_origin == "Iran" or state.iran_russia_nexus or state.watchlist_hits:
        return "critical_flag"
    
    # Inconclusive flag: substantial transform is unconfirmed (None)
    if state.substantial_transform is None:
        return "inconclusive"
        
    return "clear"


# Shared checkpointer instance to persist state across graph builds in testing/runtime
_shared_checkpointer = MemorySaver()


def build_graph():
    """Build and compile the StateGraph workflow with MemorySaver checkpointer."""
    workflow = StateGraph(TransshipmentRiskState)

    # 1. Add all node functions
    workflow.add_node("intake_router", intake_router)
    workflow.add_node("supplier_profiler", supplier_profiler)
    workflow.add_node("coo_document_analyzer", coo_document_analyzer)
    workflow.add_node("origin_tracer", origin_tracer)
    workflow.add_node("human_escalation", human_escalation)
    workflow.add_node("risk_scorer", risk_scorer)
    workflow.add_node("verdict_publisher", verdict_publisher)

    # 2. Set start node
    workflow.set_entry_point("intake_router")

    # 3. Add conditional edge from intake router
    workflow.add_conditional_edges(
        "intake_router",
        route_after_intake,
        {
            "low_risk_exit": "verdict_publisher",
            "full_analysis": "supplier_profiler"
        }
    )

    # 4. Standard edge to COO document analyzer
    workflow.add_edge("supplier_profiler", "coo_document_analyzer")

    # 5. Add conditional edge from COO analyzer
    workflow.add_conditional_edges(
        "coo_document_analyzer",
        route_after_coo,
        {
            "confirmed": "risk_scorer",
            "denied": "origin_tracer",
            "inconclusive": "origin_tracer"
        }
    )

    # 6. Add conditional edge from origin tracer
    workflow.add_conditional_edges(
        "origin_tracer",
        route_after_origin,
        {
            "critical_flag": "human_escalation",
            "inconclusive": "human_escalation",
            "clear": "risk_scorer"
        }
    )

    # 7. Add exit path edges
    workflow.add_edge("human_escalation", "risk_scorer")
    workflow.add_edge("risk_scorer", "verdict_publisher")
    workflow.add_edge("verdict_publisher", END)

    # 8. Compile graph with standard checkpointer for interrupt/resume capabilities
    return workflow.compile(checkpointer=_shared_checkpointer)


__all__ = [
    "build_graph",
    "route_after_intake",
    "route_after_coo",
    "route_after_origin",
]


graph = build_graph()
__all__.append('graph')
