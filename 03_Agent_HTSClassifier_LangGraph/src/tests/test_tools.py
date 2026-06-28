"""
src/tests/test_tools.py — Unit tests for HTS classifier tools.
"""

import pytest
from src.exceptions import TransientToolError, CrossDataSourceError
from src.tools.retry import with_retry
from src.tools.hts_search import search_hts_headings
from src.tools.chapter_notes import get_chapter_section_notes
from src.tools.cross_rulings import search_cross_rulings
from src.tools.duty_rate import calc_duty_rate


def test_retry_decorator_sync():
    """Verify that with_retry handles TransientToolError and retries sync calls."""
    call_count = 0

    @with_retry(retries=2, delay=0.1, backoff=1.5)
    def test_func():
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise TransientToolError("Temporary failure")
        return "success"

    res = test_func()
    assert res == "success"
    assert call_count == 3


@pytest.mark.asyncio
async def test_retry_decorator_async():
    """Verify that with_retry handles TransientToolError and retries async calls."""
    call_count = 0

    @with_retry(retries=2, delay=0.1, backoff=1.5)
    async def test_async_func():
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise TransientToolError("Temporary failure")
        return "success"

    res = await test_async_func()
    assert res == "success"
    assert call_count == 3


def test_hts_search_mock():
    """Verify hts_search fallback functionality."""
    # Under mock mode, search should match keywords or return defaults
    candidates = search_hts_headings("laptop computer", chapter_hint="84")
    assert len(candidates) > 0
    assert candidates[0].chapter == "84"
    assert "8471" in candidates[0].hts_code


def test_chapter_notes_mock():
    """Verify chapter notes retrieval."""
    notes = get_chapter_section_notes("8471.30.0100")
    assert len(notes) > 0
    assert "Section XVI" in notes[0].source or "Chapter 84" in notes[0].source


def test_cross_rulings_mock():
    """Verify cross rulings lookup and 500 character excerpt limit."""
    rulings = search_cross_rulings("laptop computer", "8471.30.0100")
    assert len(rulings) > 0
    assert rulings[0].ruling_number.startswith("NY")
    # Enforce excerpt limit check
    assert len(rulings[0].excerpt) <= 500


def test_duty_rate_calculation():
    """Verify duty rate calculation results for MFN, Section 301, and Section 232."""
    # China Laptop (starts with 84, CN) -> MFN = 0.02, 301 = 0.25, Total = 0.27
    calc = calc_duty_rate("8471.30.0100", "CN")
    assert calc.column1_general == 0.02
    assert calc.section_301 == 0.25
    assert calc.section_232 is None
    assert calc.total_rate == 0.27
    assert calc.requires_human_review is False

    # Steel column (starts with 73, AE) -> MFN = 0.03, 232 = 0.25, Total = 0.28
    calc2 = calc_duty_rate("7308.90.9590", "AE")
    assert calc2.column1_general == 0.03
    assert calc2.section_301 is None
    assert calc2.section_232 == 0.25
    assert calc2.total_rate == 0.28

    # Non-existent HTS or missing origin -> review required
    calc3 = calc_duty_rate("", "AE")
    assert calc3.requires_human_review is True
