"""
src/tests/__init__.py — Test package for the HTS Classifier Agent.

Test modules (implemented in Tasks 20–34):
  test_models_pbt.py    — PBT: Properties 1, 2, 3, 8, 10 (state/model round-trips,
                          HTS format, tied candidates, null HTS code)
  test_confidence.py    — PBT: Properties 5, 6, 7 (chapter hint, confidence bounds,
                          GRI confidence range)
  test_human_review.py  — PBT: Property 9 (human review gate trigger invariant)
  test_retry.py         — PBT: Property 11 (retry exhaustion behavior)
  test_audit.py         — PBT: Property 12 (audit record completeness)
  test_state.py         — Unit: state.py model validation
  test_tools.py         — Unit: tool wrapper behavior
  test_nodes.py         — Unit: LangGraph node behavior

All PBT tests use hypothesis==6.112.2.
"""
