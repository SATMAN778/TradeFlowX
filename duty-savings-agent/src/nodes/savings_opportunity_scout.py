"""
src/nodes/savings_opportunity_scout.py — Savings Opportunity Scout node.

Uses the UiPath LLM Gateway to generate trade counsel legal recommendations when savings
opportunities (First-Sale or Drawback) are identified.
"""

import os
import sys
import logging
from uipath_langchain.chat.models import UiPathAzureChatOpenAI
from langchain_core.messages import HumanMessage
from src.state import AgentState
from src.tools.registry_check import check_first_sale_savings, check_drawback_savings

logger = logging.getLogger(__name__)


def savings_opportunity_scout(state: AgentState) -> dict:
    """Scout for post-entry savings opportunities and generate recommendations."""
    logger.info("Entering savings_opportunity_scout node")
    state.validate_required_fields_at_node_boundary()

    opp_type = "None"
    savings = 0.0
    rec = None


    # Evaluate Duty Drawback opportunity
    drawback_savings = 0.0
    drawback_rec = None
    if state.has_reexport_intent:
        logger.info("Evaluating Duty Drawback savings opportunity...")
        res = check_drawback_savings(state.actual_duty_usd or state.estimated_duty_usd or 0.0)
        drawback_savings = res["estimated_savings_usd"]
        drawback_rec = res["recommendation"]
        logger.info(f"Duty Drawback evaluated: savings=${drawback_savings}")

    # Evaluate First-Sale Valuation opportunity
    first_sale_savings = 0.0
    first_sale_rec = None
    if (state.jafza_flag or state.transshipment_flag) and state.shipment_value_usd > 0:
        logger.info("Evaluating First-Sale Valuation savings opportunity...")
        rate = (state.estimated_duty_usd / state.shipment_value_usd) * 100.0 if state.estimated_duty_usd > 0 else 2.5
        res = check_first_sale_savings(state.shipment_value_usd, rate)
        first_sale_savings = res["estimated_savings_usd"]
        first_sale_rec = res["recommendation"]
        logger.info(f"First-Sale evaluated: savings=${first_sale_savings}")

    # Select the opportunity with the higher yield
    if drawback_savings > 0 or first_sale_savings > 0:
        if drawback_savings >= first_sale_savings:
            opp_type = "Duty Drawback"
            savings = drawback_savings
            rec = drawback_rec
        else:
            opp_type = "First-Sale Valuation"
            savings = first_sale_savings
            rec = first_sale_rec

    requires_counsel = savings > 0
    logger.info(f"Scout results: opp_type={opp_type}, estimated_savings_usd=${savings:,.2f}, requires_counsel_review={requires_counsel}")

    # If savings are found, invoke trade counsel LLM to customize the recommendation narrative
    if requires_counsel:
        use_mock = False
        if os.environ.get("HTS_MOCK") == "true" or "pytest" in sys.modules:
            use_mock = True
            
        if not use_mock:
            try:
                logger.info("Invoking trade counsel LLM (gpt-4o-2024-08-06) to generate custom narrative...")
                llm = UiPathAzureChatOpenAI(model="gpt-4o-2024-08-06", temperature=0.2)
                prompt = f"""You are the Custom Trade Counsel Agent.
Formulate a highly professional legal counsel recommendation for a post-entry duty savings opportunity.
Opportunity Type: {opp_type}
Estimated Savings: ${savings:,.2f}
Shipment Case Ref: {state.shipment_ref}
HTS Code: {state.hts_code}
Country of Origin: {state.declared_coo}
Value: ${state.shipment_value_usd:,.2f}
Base recommendation details: {rec}

Explain:
1. The legal basis (e.g., first-sale valuation rules under CBP guidelines, or duty drawback under 19 U.S.C. § 1313).
2. The exact steps the importer must take to pursue these savings (Action Center review).
3. The estimated savings calculations.

Write a concise, professional paragraph recommendation. Do not prefix with 'Here is my recommendation' or similar.
"""
                response = llm.invoke([HumanMessage(content=prompt)])
                rec = response.content.strip()
                logger.info("Trade counsel legal recommendation generated successfully.")
            except Exception as e:
                logger.exception("Exception occurred in trade counsel LLM recommendation generation. Using base recommendation fallback.")
                # Use fallback base recommendation
                pass
        else:
            logger.info("Using local mock for trade counsel legal recommendation.")

    return {
        "opportunity_type": opp_type,
        "estimated_savings_usd": round(savings, 2),
        "counsel_recommendation": rec,
        "requires_counsel_review": requires_counsel
    }

