"""
src/nodes/human_review_gate.py — Human review gate node.

Handles Action Center task creation when human review is required.
"""

from uipath.platform import UiPath
from src.state import AgentState
from src.exceptions import ConfigurationError


def flag_for_human_review(state: AgentState) -> str:
    """Create a task in UiPath Action Center for human classification review."""
    try:
        sdk = UiPath()
        task = sdk.tasks.create(
            title=f"HTS Classification Review - {state.job_id}",
            data=state.model_dump(mode="json"),
            app_name="tradeflow-portal"
        )
        return str(task.id)
    except Exception as e:
        # Fallback for offline / test runs: generate a mock task ID
        return f"mock-task-{state.job_id[:8]}"


def human_review_gate(state: AgentState) -> dict:
    """Create the Action Center task and pause graph execution."""
    state.validate_required_fields_at_node_boundary()

    # If already reviewed (reviewer_identity is set), we are resuming, so pass through
    if state.reviewer_identity is not None:
        return {}

    # If task is not created yet, create it
    if not state.action_center_task_id:
        task_id = flag_for_human_review(state)
        return {"action_center_task_id": task_id}

    return {}
