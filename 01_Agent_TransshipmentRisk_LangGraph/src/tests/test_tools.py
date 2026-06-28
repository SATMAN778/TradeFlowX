"""
src/tests/test_tools.py — Unit tests for lookups.py tools.
"""

from src.tools import (
    UAE_manufacturer_registry_lookup,
    trade_intelligence_search,
    supplier_watchlist_check,
    extract_coo_certificate,
    validate_substantial_transformation,
    product_manufacture_plausibility,
    section_301_tariff_checker,
    add_cvd_order_lookup,
)


def test_uae_manufacturer_registry_lookup():
    # Genuine manufacturer keywords in name
    res = UAE_manufacturer_registry_lookup("Dubai Cement Factory", "Industrial City Dubai")
    assert res["registered_manufacturer"] is True
    assert "Petrochemicals" in res["product_categories"]
    assert res["registration_number"].startswith("UAE-MFG-")

    # Trading company keyword override
    res = UAE_manufacturer_registry_lookup("Dubai Cement Factory Trading LLC", "Dubai")
    assert res["registered_manufacturer"] is False


def test_trade_intelligence_search():
    assert trade_intelligence_search("Logistics Ltd", "cargo") == "trading_company"
    assert trade_intelligence_search("Dubai Tech Mfg", "electronics") == "manufacturer"
    assert trade_intelligence_search("Unknown Corp", "item") == "unknown"


def test_supplier_watchlist_check():
    # Iran hit
    hits = supplier_watchlist_check("Tehran Cargo Transit", "Tehran, Iran")
    assert len(hits) == 1
    assert hits[0]["list_name"] == "OFAC SDN List"

    # Clean supplier
    hits = supplier_watchlist_check("Clean Trading LLC", "JAFZA, Dubai")
    assert len(hits) == 0


def test_extract_coo_certificate():
    text = "Dubai Chamber of Commerce and Industry. COO Certificate issued under Form A rules."
    res = extract_coo_certificate(text)
    assert res["form_type"] == "Form A"
    assert res["issuing_authority"] == "Dubai Chamber of Commerce"

    res_empty = extract_coo_certificate(None)
    assert res_empty["issuing_authority"] is None


def test_validate_substantial_transformation():
    assert validate_substantial_transformation("8471.30", "Substantial transformation occurred.", "Computer") is True
    assert validate_substantial_transformation("8471.30", "Repackaged and assembled only.", "Computer") is False
    assert validate_substantial_transformation("8471.30", "Unknown processing details.", "Computer") is None


def test_product_manufacture_plausibility():
    # Petrochemicals are highly plausible
    assert product_manufacture_plausibility("Refined petroleum oil", "2710.12.0000") == 0.95
    # Semiconductor processors are implausible
    assert product_manufacture_plausibility("Integrated circuit microprocessor", "8542.31.0000") == 0.25


def test_section_301_tariff_checker():
    res = section_301_tariff_checker("8471.30.0100", "China")
    assert res["applicable"] is True
    assert res["surcharge_rate"] == "25%"

    res_uae = section_301_tariff_checker("8471.30.0100", "UAE")
    assert res_uae["applicable"] is False


def test_add_cvd_order_lookup():
    assert add_cvd_order_lookup("7308.90.0000", "China") is True  # Steel structures
    assert add_cvd_order_lookup("8471.30.0100", "China") is False  # Laptop
