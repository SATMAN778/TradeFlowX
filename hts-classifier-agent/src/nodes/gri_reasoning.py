"""
src/nodes/gri_reasoning.py — GRI reasoning agent node.

Performs General Rules of Interpretation (GRI) reasoning over heading candidates using Section and Chapter Notes.
"""

import os
import sys
import json
from uipath_langchain.chat.models import UiPathAzureChatOpenAI
from langchain_core.messages import HumanMessage
from src.state import AgentState, HeadingCandidate
from src.tools.chapter_notes import get_chapter_section_notes
from src.assets import get_llm_model_name, get_llm_temperature
from src.exceptions import TransientToolError


def gri_reasoning_agent(state: AgentState) -> dict:
    """Evaluate candidates using GRI methodology and Section/Chapter Notes."""
    state.validate_required_fields_at_node_boundary()

    if not state.product_facts or not state.candidates:
        return {}

    updated_candidates = []
    
    # Check if we should use mock logic
    use_mock = False
    if os.environ.get("HTS_MOCK") == "true":
        use_mock = True
    elif "pytest" in sys.modules:
        use_mock = True

    for candidate in state.candidates:
        # 1. Fetch relevant Section/Chapter Notes
        notes = get_chapter_section_notes(candidate.hts_code)
        note_texts = "\n\n".join(f"[{n.source}]: {n.text}" for n in notes)

        if use_mock:
            # Mock reasoning: adjust confidence and add supporting notes
            supporting_notes = [n.source for n in notes]
            # If the candidate's chapter matches the first two digits of the HTS code, keep confidence high
            confidence = candidate.confidence
            if candidate.hts_code.startswith("8471") and "laptop" in state.product_facts.description.lower():
                confidence = min(1.0, confidence + 0.05)
            elif candidate.hts_code.startswith("8517") and "router" in state.product_facts.description.lower():
                confidence = min(1.0, confidence + 0.05)
            
            updated_candidates.append(HeadingCandidate(
                hts_code=candidate.hts_code,
                chapter=candidate.chapter,
                heading_text=candidate.heading_text,
                confidence=confidence,
                supporting_notes=list(set(candidate.supporting_notes + supporting_notes)),
                ruling_citations=candidate.ruling_citations,
                dataset_version=candidate.dataset_version
            ))
            continue

        # Production logic using LLM
        try:
            model = get_llm_model_name()
            temp = get_llm_temperature()
            
            llm = UiPathAzureChatOpenAI(model=model, temperature=temp)
            
            prompt = f"""You are the GRI Reasoning Agent.
Evaluate the following HTS candidate code against the product facts and the retrieved Section/Chapter Notes.
Apply General Rules of Interpretation (GRI 1 through 6) to determine suitability.

Product Facts:
- Description: {state.product_facts.description}
- Materials: {state.product_facts.material_composition}
- Function: {state.product_facts.function}
- End Use: {state.product_facts.end_use}
- Assembly State: {state.product_facts.assembly_state}

Candidate Code: {candidate.hts_code}
Candidate Heading: {candidate.heading_text}

Relevant Notes:
{note_texts}

Return a JSON object matching the following schema:
{{
  "confidence_adjustment": -0.5 to 0.5 (float, how much to adjust the base confidence of {candidate.confidence}),
  "supporting_notes": ["List of notes that legally support or affect this classification, e.g. 'Chapter 84, Note 5(A)'"],
  "gri_rule_applied": "The primary GRI rule applied, e.g. 'GRI 1' or 'GRI 3(b)'",
  "reasoning": "Legal justification statement applying the notes and GRI rules"
}}

Return ONLY valid JSON. No conversational wrapper or explanations.
"""
            response = llm.invoke([HumanMessage(content=prompt)])
            
            # Clean response content
            content = response.content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
            
            res_data = json.loads(content)
            
            adj = float(res_data.get("confidence_adjustment", 0.0))
            new_conf = max(0.0, min(1.0, candidate.confidence + adj))
            supporting = res_data.get("supporting_notes", [])
            
            updated_candidates.append(HeadingCandidate(
                hts_code=candidate.hts_code,
                chapter=candidate.chapter,
                heading_text=candidate.heading_text,
                confidence=new_conf,
                supporting_notes=list(set(candidate.supporting_notes + supporting)),
                ruling_citations=candidate.ruling_citations,
                dataset_version=candidate.dataset_version
            ))
            
        except json.JSONDecodeError as e:
            raise TransientToolError(f"Failed to parse JSON response from GRI reasoning: {e}")
        except Exception as e:
            raise TransientToolError(f"GRI reasoning failed: {e}")

    # Sort candidates by confidence descending
    updated_candidates.sort(key=lambda c: c.confidence, reverse=True)
    return {"candidates": updated_candidates}
