"""
run_test.py — Python-based local test executor to verify the agent workflow
including pause and resume checkpoint operations.
"""

import os
import dotenv
import logging
import sys
from langchain_core.globals import set_debug

# Configure standard python logging to print execution traces to console stdout
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("run_test")

# Load environment variables from .env (e.g. LangChain tracing API keys)
dotenv.load_dotenv()

# Disable mock mode — run real Claude call via UiPath LLM Gateway
# (remove or set to "false" to re-enable mock)
os.environ.pop("HTS_MOCK", None)

active_model = os.environ.get("AGENT_MODEL_ID", "anthropic.claude-sonnet-4-20250514-v1:0")
logger.info(f"Test will use LLM model: {active_model}")

# Enable LangChain debug mode to output all LLM calls, prompts, and tool calls to console
set_debug(True)


if os.environ.get("LANGCHAIN_TRACING_V2") == "true":
    logger.info(f"LangChain tracing is active. Project: {os.environ.get('LANGCHAIN_PROJECT', 'default')}")


from main import main, DutySavingsInput


def test_agent_run():
    inp = DutySavingsInput(
        shipment_ref="TF-CASE-001",
        hts_code="8471.30.0100",
        declared_coo="UAE",
        shipment_value_usd=125000.0,
        estimated_duty_usd=18750.0,
        actual_duty_usd=18750.0,
        jafza_flag=True,
        transshipment_flag=True,
        has_reexport_intent=True
    )

    print("Executing agent workflow with test inputs...")
    try:
        out = main(inp)
        print("\nWorkflow Initial Result:")
        print(out.model_dump_json(indent=2))

        if out.job_status == "interrupted":
            print("\nWorkflow was interrupted! Simulating Action Center review resume...")
            # We mock the human reviewer providing decision notes
            resume_inp = DutySavingsInput(
                shipment_ref=inp.shipment_ref,
                hts_code=inp.hts_code,
                declared_coo=inp.declared_coo,
                shipment_value_usd=inp.shipment_value_usd,
                estimated_duty_usd=inp.estimated_duty_usd,
                actual_duty_usd=inp.actual_duty_usd,
                jafza_flag=inp.jafza_flag,
                transshipment_flag=inp.transshipment_flag,
                has_reexport_intent=inp.has_reexport_intent,
                counsel_review_notes="Approved: Pursue savings of $18,562.50"
            )
            out_resume = main(resume_inp)
            print("\nWorkflow Resumed Result:")
            print(out_resume.model_dump_json(indent=2))

    except Exception as e:
        print(f"\nExecution failed with error: {e}")


if __name__ == "__main__":
    test_agent_run()
