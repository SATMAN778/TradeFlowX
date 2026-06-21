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

Note: LLM clients are NEVER constructed at module import time — they are
initialized lazily inside node function bodies (see individual node modules).

Requirement: 3.3, 3.6, 10.4, 10.7, 13.1
"""

# Graph wiring implementation lives in Task 18.
# This stub is the module placeholder created in Task 1.

__all__ = ["build_graph", "check_review_needed"]
