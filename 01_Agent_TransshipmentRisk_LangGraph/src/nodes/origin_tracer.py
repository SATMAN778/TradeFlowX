"""
src/nodes/origin_tracer.py — Origin Tracer node.
"""

from src.state import TransshipmentRiskState
from src.tools import (
    cbp_transshipment_watchlist_lookup,
    manufacturer_country_identifier,
    section_301_tariff_checker,
    add_cvd_order_lookup,
    iran_russia_nexus_check,
)


def origin_tracer(state: TransshipmentRiskState) -> dict:
    """Trace probable true country of origin and identify trade remedies."""
    state.validate_required_fields_at_node_boundary()

    # 1. Watchlist check
    watchlist_hits = cbp_transshipment_watchlist_lookup(state.supplier_name, state.supplier_address)
    current_hits = list(state.watchlist_hits) if state.watchlist_hits else []
    for hit in watchlist_hits:
        if hit not in current_hits:
            current_hits.append(hit)

    # 2. Identify probable true country of origin
    true_coo = manufacturer_country_identifier(
        state.product_description,
        state.hts_code,
        state.supplier_name
    )

    # 3. Check Section 301
    section_301_applicable = False
    if true_coo:
        sec301_res = section_301_tariff_checker(state.hts_code, true_coo)
        section_301_applicable = sec301_res.get("applicable", False)

    # 4. Check ADD/CVD
    add_cvd_applicable = False
    if true_coo:
        add_cvd_applicable = add_cvd_order_lookup(state.hts_code, true_coo)

    # 5. Sanctions nexus check
    nexus = iran_russia_nexus_check(state.supplier_name, state.supplier_address)

    return {
        "third_country_origin": true_coo,
        "section_301_applicable": section_301_applicable,
        "add_cvd_applicable": add_cvd_applicable,
        "watchlist_hits": current_hits,
        "iran_russia_nexus": nexus
    }
