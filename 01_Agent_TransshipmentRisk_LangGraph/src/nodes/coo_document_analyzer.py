"""
src/nodes/coo_document_analyzer.py — COO Document Analyzer node.
"""

from src.state import TransshipmentRiskState
from src.tools import (
    extract_coo_certificate,
    validate_substantial_transformation,
    product_manufacture_plausibility,
)


def coo_document_analyzer(state: TransshipmentRiskState) -> dict:
    """Analyze the Certificate of Origin and check for substantial transformation."""
    state.validate_required_fields_at_node_boundary()

    # 1. Extract COO certificate details
    parsed_coo = extract_coo_certificate(state.coo_certificate)

    # 2. Check substantial transformation
    substantial_transform = validate_substantial_transformation(
        state.hts_code,
        state.coo_certificate,
        state.product_description
    )

    # If substantial transformation is still None, let's look at plausibility
    plausibility = product_manufacture_plausibility(state.product_description, state.hts_code)
    
    # If plausibility is very low, and it's not confirmed by Form A, flag substantial transform as False
    if substantial_transform is None:
        if plausibility < 0.30:
            substantial_transform = False
        elif plausibility >= 0.90 and parsed_coo.get("form_type") == "Form A":
            substantial_transform = True

    return {
        "substantial_transform": substantial_transform
    }
