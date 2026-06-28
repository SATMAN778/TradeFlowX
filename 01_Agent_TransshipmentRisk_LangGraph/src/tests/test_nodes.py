"""
src/tests/test_nodes.py — Unit tests for individual StateGraph nodes.
"""

import pytest
from src.state import TransshipmentRiskState
from src.nodes import (
    intake_router,
    supplier_profiler,
    coo_document_analyzer,
    origin_tracer,
    risk_scorer,
    verdict_publisher,
)


def test_intake_router_bypass():
    # Low risk bypass case (not JAFZA, declared COO not UAE)
    state = TransshipmentRiskState(
        shipment_ref="CASE-1",
        declared_coo="GERMANY",
        supplier_name="Berlin Parts Gmbh",
        supplier_address="Berlin, Germany",
        jafza_flag=False,
        hts_code="8471.30.0100",
        product_description="Computer parts"
    )
    updates = intake_router(state)
    assert updates["risk_score"] == 0
    assert updates["risk_level"] == "LOW"
    assert updates["true_coo_verdict"] == "GERMANY"
    assert updates["job_status"] == "completed"

    # Full analysis required (JAFZA)
    state_jafza = TransshipmentRiskState(
        shipment_ref="CASE-2",
        declared_coo="UAE",
        supplier_name="Dubai Tech",
        supplier_address="JAFZA, Dubai",
        jafza_flag=True,
        hts_code="8471.30.0100",
        product_description="Computer parts"
    )
    updates_jafza = intake_router(state_jafza)
    assert updates_jafza == {}


def test_supplier_profiler_node():
    state = TransshipmentRiskState(
        shipment_ref="CASE-2",
        declared_coo="UAE",
        supplier_name="JAFZA Watchlist Trading LLC",
        supplier_address="Jebel Ali Free Zone, Dubai, UAE",
        jafza_flag=True,
        hts_code="8471.30.0100",
        product_description="Computer parts"
    )
    updates = supplier_profiler(state)
    assert updates["supplier_type"] == "trading_company"
    assert len(updates["watchlist_hits"]) == 1
    assert updates["watchlist_hits"][0]["list_name"] == "CBP Transshipment Intermediary Watchlist"


def test_coo_document_analyzer_node():
    # Confirmed substantial transformation
    state_confirmed = TransshipmentRiskState(
        shipment_ref="CASE-2",
        declared_coo="UAE",
        supplier_name="Dubai Tech",
        supplier_address="JAFZA, Dubai",
        jafza_flag=True,
        hts_code="7604.21.0000",  # Aluminum profiles (highly plausible)
        product_description="Aluminum extruded profile",
        coo_certificate="Dubai Chamber of Commerce. Form A issued. Substantial transformation in UAE."
    )
    updates = coo_document_analyzer(state_confirmed)
    assert updates["substantial_transform"] is True

    # Denied transformation
    state_denied = TransshipmentRiskState(
        shipment_ref="CASE-2",
        declared_coo="UAE",
        supplier_name="Dubai Tech",
        supplier_address="JAFZA, Dubai",
        jafza_flag=True,
        hts_code="8542.31.0000",
        product_description="Microprocessors",
        coo_certificate="Repackaged and transit only. Non-transforming assembly."
    )
    updates_denied = coo_document_analyzer(state_denied)
    assert updates_denied["substantial_transform"] is False


def test_origin_tracer_node():
    state = TransshipmentRiskState(
        shipment_ref="CASE-3",
        declared_coo="UAE",
        supplier_name="Shenzhen Sourcing Dubai Branch",
        supplier_address="JAFZA, Dubai",
        jafza_flag=True,
        hts_code="7308.90.0000",  # Metal structure
        product_description="Steel structural frame sourced from China"
    )
    updates = origin_tracer(state)
    assert updates["third_country_origin"] == "China"
    assert updates["section_301_applicable"] is True
    assert updates["add_cvd_applicable"] is True
    assert updates["iran_russia_nexus"] is False


def test_risk_scorer_node():
    # Scenario: China transshipment (high risk)
    state = TransshipmentRiskState(
        shipment_ref="CASE-4",
        declared_coo="UAE",
        supplier_name="JAFZA Watchlist Trading LLC",
        supplier_address="Jebel Ali Free Zone, Dubai, UAE",
        jafza_flag=True,
        supplier_type="trading_company",
        substantial_transform=False,
        watchlist_hits=[{"party": "Supplier", "list_name": "CBP List", "match_score": 90}],
        third_country_origin="China",
        section_301_applicable=True,
        add_cvd_applicable=True,
        product_description="Metal fittings",
        hts_code="7307.19.3000"
    )
    updates = risk_scorer(state)
    assert updates["risk_score"] > 50
    assert updates["risk_level"] in ["HIGH", "CRITICAL"]
    assert updates["true_coo_verdict"] == "China"


def test_verdict_publisher_node():
    state = TransshipmentRiskState(
        shipment_ref="CASE-4",
        declared_coo="UAE",
        supplier_name="JAFZA Watchlist Trading LLC",
        supplier_address="Jebel Ali Free Zone, Dubai, UAE",
        jafza_flag=True,
        true_coo_verdict="China",
        risk_score=85,
        risk_level="CRITICAL",
        section_301_applicable=True,
        add_cvd_applicable=True,
        product_description="Metal fittings",
        hts_code="7307.19.3000"
    )
    updates = verdict_publisher(state)
    assert updates["job_status"] == "completed"
