"""
src/nodes/supplier_profiler.py — Supplier Profiler node.
"""

from src.state import TransshipmentRiskState
from src.tools import (
    UAE_manufacturer_registry_lookup,
    trade_intelligence_search,
    supplier_watchlist_check,
)


def supplier_profiler(state: TransshipmentRiskState) -> dict:
    """Assess if supplier is a genuine manufacturer or trading intermediary."""
    state.validate_required_fields_at_node_boundary()

    # 1. Look up registry
    registry_res = UAE_manufacturer_registry_lookup(state.supplier_name, state.supplier_address)
    
    # 2. Check trade intelligence profile
    supplier_type = trade_intelligence_search(state.supplier_name, state.product_description)
    if registry_res.get("registered_manufacturer"):
        supplier_type = "manufacturer"

    # 3. Watchlist check
    hits = supplier_watchlist_check(state.supplier_name, state.supplier_address)

    # Accumulate watchlist hits
    current_hits = list(state.watchlist_hits) if state.watchlist_hits else []
    for hit in hits:
        if hit not in current_hits:
            current_hits.append(hit)

    return {
        "supplier_type": supplier_type,
        "watchlist_hits": current_hits
    }
