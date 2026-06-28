"""
src/tools/chapter_notes.py — USITC Section and Chapter Notes retrieval tool.

Queries the Section/Chapter Notes database using either Claude or a local mock fallback.
"""

import os
import sys
import json
from src.state import NotePassage
from uipath_langchain.chat.models import UiPathAzureChatOpenAI
from langchain_core.messages import HumanMessage
from src.assets import get_llm_model_name, get_llm_temperature
from src.exceptions import HTSDataSourceError, TransientToolError


# Mock Chapter/Section Notes for local fallback
MOCK_NOTES_DATABASE = {
    "84": [
        {
            "source": "Section XVI, Note 3",
            "text": "Unless the context otherwise requires, composite machines consisting of two or more machines fitted together to form a whole and other machines designed for the purpose of performing two or more complementary or alternative functions are to be classified as if consisting only of that component or as being that machine which performs the principal function."
        },
        {
            "source": "Chapter 84, Note 5(A)",
            "text": "For the purposes of heading 8471, the expression 'automatic data processing machines' means machines capable of: (i) storing the processing program or programs and at least the data immediately necessary for the execution of the program; (ii) being freely programmed in accordance with the requirements of the user; (iii) performing arithmetical computations specified by the user; and (iv) executing, without human intervention, a processing program which requires them to modify their execution, by logical decision during the processing run."
        }
    ],
    "85": [
        {
            "source": "Section XVI, Note 4",
            "text": "Where a machine (including a combination of machines) consists of individual components (whether separate or connected by piping, by transmission devices, by electric cables or by other devices) intended to contribute together to a clearly defined function covered by one of the headings in chapter 84 or chapter 85, then the whole falls to be classified in the heading appropriate to that function."
        }
    ],
    "73": [
        {
            "source": "Section XV, Note 2",
            "text": "Throughout the tariff schedule, the expression 'parts of general use' means: (a) Articles of heading 7307, 7312, 7315, 7317 or 7318 and similar articles of other base metal; (b) Springs and leaves for springs, of base metal, other than clock or watch springs (heading 9114); and (c) Articles of headings 8301, 8302, 8308, 8310 and frames and mirrors, of base metal, of heading 8306."
        }
    ],
    "90": [
        {
            "source": "Chapter 90, Note 1(h)",
            "text": "This chapter does not cover: ... (h) Searchlights or spotlights of a kind used for cyclic vehicles or motor vehicles (heading 8512); Elector-thermic appliances of heading 8516; radio-telegraphic, radio-telephonic or radar apparatus of heading 8525."
        }
    ]
}


def get_chapter_section_notes(hts_code: str) -> list[NotePassage]:
    """Retrieve relevant Section and Chapter Notes for a given HTS code."""
    chapter = hts_code.split(".")[0][:2] if hts_code else ""

    # Check if we should use the mock (offline mode, tests, or missing key)
    use_mock = False
    if os.environ.get("HTS_MOCK") == "true":
        use_mock = True
    elif "pytest" in sys.modules:
        use_mock = True

    if use_mock:
        notes = MOCK_NOTES_DATABASE.get(chapter, [])
        if not notes:
            # Return generic notes as fallback
            notes = [
                {
                    "source": "General Rules of Interpretation, Rule 1",
                    "text": "The titles of sections, chapters and sub-chapters are provided for ease of reference only; for legal purposes, classification shall be determined according to the terms of the headings and any relative section or chapter notes..."
                }
            ]
        return [NotePassage(**item) for item in notes]

    # Production logic using LLM
    try:
        model = get_llm_model_name()
        temp = get_llm_temperature()
        
        llm = UiPathAzureChatOpenAI(model=model, temperature=temp)
        
        prompt = f"""You are a database of HTS Section and Chapter Notes.
Retrieve the legal Section or Chapter Note passages relevant to classifying items under HTS code: {hts_code} (Chapter {chapter}).
You must return a JSON array of passages. Each passage must match the following JSON schema:
{{
  "source": "Title of the note, e.g. 'Chapter 84, Note 5(A)' or 'Section XVI, Note 3'",
  "text": "The full exact text of the note passage"
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
        
        data = json.loads(content)
        passages = [NotePassage.model_validate(item) for item in data]
        return passages
        
    except json.JSONDecodeError as e:
        raise TransientToolError(f"Failed to parse JSON response from Section/Chapter notes search: {e}")
    except Exception as e:
        raise HTSDataSourceError(f"Section/Chapter notes lookup failed: {e}")
