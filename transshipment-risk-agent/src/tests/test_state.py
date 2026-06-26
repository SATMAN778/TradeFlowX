"""
src/tests/test_state.py — Unit tests for state.py models.
"""

import pytest
from pydantic import ValidationError
from src.state import TransshipmentRiskState


def test_transshipment_risk_state_validation():
    """Verify that a valid TransshipmentRiskState validates correctly."""
    state = TransshipmentRiskState(
        shipment_ref="CASE-1234",
        declared_coo="UAE",
        supplier_name="JAFZA Logistics LLC",
        supplier_address="Jebel Ali Free Zone, Dubai, UAE",
        jafza_flag=True,
        hts_code="8471.30.0100",
        product_description="Laptop computers"
    )
    assert state.shipment_ref == "CASE-1234"
    assert state.declared_coo == "UAE"
    assert state.jafza_flag is True
    assert state.job_status == "running"


def test_transshipment_risk_state_boundary_validation():
    """Verify that required fields raise ValueError at boundaries if missing or empty."""
    # Missing shipment_ref
    with pytest.raises(ValidationError):
        TransshipmentRiskState(
            shipment_ref="",
            declared_coo="UAE",
            supplier_name="JAFZA Logistics LLC",
            supplier_address="Jebel Ali Free Zone, Dubai, UAE",
            jafza_flag=True,
            hts_code="8471.30.0100",
            product_description="Laptop computers"
        )

    # Missing declared_coo
    with pytest.raises(ValidationError):
        TransshipmentRiskState(
            shipment_ref="CASE-1234",
            declared_coo="  ",
            supplier_name="JAFZA Logistics LLC",
            supplier_address="Jebel Ali Free Zone, Dubai, UAE",
            jafza_flag=True,
            hts_code="8471.30.0100",
            product_description="Laptop computers"
        )

    # Missing supplier_name
    with pytest.raises(ValidationError):
        TransshipmentRiskState(
            shipment_ref="CASE-1234",
            declared_coo="UAE",
            supplier_name="",
            supplier_address="Jebel Ali Free Zone, Dubai, UAE",
            jafza_flag=True,
            hts_code="8471.30.0100",
            product_description="Laptop computers"
        )
