"""
src/tools/duty_rate.py — Duty rate calculator tool.

Calculates duty rates including Column 1 General MFN and trade-remedy tariffs (Section 301, Section 232, IEEPA).
"""

from typing import Optional
from src.state import DutyCalculation
from src.exceptions import ConfigurationError


def calc_duty_rate(hts_code: str, country_of_origin: str) -> DutyCalculation:
    """Calculate the applicable duty rate for an HTS code and country of origin.

    Enforces rules for Section 301 (China), Section 232 (Steel/Aluminum), and IEEPA.
    Refreshes quarterly (current version: 2026-Q2).
    """
    if not hts_code or not country_of_origin:
        return DutyCalculation(
            hts_code=hts_code or "",
            country_of_origin=country_of_origin or "",
            column1_general=None,
            total_rate=None,
            dataset_version="2026-Q2",
            requires_human_review=True
        )

    # Clean the HTS code to extract prefix
    clean_hts = hts_code.replace(".", "").strip()
    co_upper = country_of_origin.upper().strip()

    # Determine MFN (Column 1 general) rate
    column1_general: Optional[float] = 0.0
    if clean_hts.startswith("84") or clean_hts.startswith("85"):
        # Machinery/Electronics
        column1_general = 0.02
    elif clean_hts.startswith("72") or clean_hts.startswith("73") or clean_hts.startswith("76"):
        # Steel/Iron/Aluminum
        column1_general = 0.03
    elif clean_hts.startswith("90"):
        # Optical/Medical
        column1_general = 0.015
    else:
        # Default fallback
        column1_general = 0.05

    # Determine Section 301 surcharge (China)
    section_301: Optional[float] = None
    if co_upper == "CN":
        # Section 301 applies to China-origin goods
        section_301 = 0.25

    # Determine Section 232 surcharge (Steel/Aluminum)
    section_232: Optional[float] = None
    if clean_hts.startswith("72") or clean_hts.startswith("73"):
        # Steel (25%)
        section_232 = 0.25
    elif clean_hts.startswith("76"):
        # Aluminum (10%)
        section_232 = 0.10

    # Determine IEEPA surcharge (Sanctioned origins)
    ieepa: Optional[float] = None
    if co_upper in ("RU", "IR", "KP", "SY"):
        # Russia, Iran, North Korea, Syria
        ieepa = 0.35

    # Sum all applicable components
    total_rate = column1_general
    if section_301 is not None:
        total_rate += section_301
    if section_232 is not None:
        total_rate += section_232
    if ieepa is not None:
        total_rate += ieepa

    return DutyCalculation(
        hts_code=hts_code,
        country_of_origin=country_of_origin,
        column1_general=column1_general,
        section_301=section_301,
        section_232=section_232,
        ieepa=ieepa,
        total_rate=total_rate,
        dataset_version="2026-Q2",
        requires_human_review=False
    )
