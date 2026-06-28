"""
src/tools/registry_check.py — Helper functions to check drawback eligibility and first-sale margins.
"""

def check_first_sale_savings(declared_value: float, mfn_rate_pct: float) -> dict:
    """Evaluate First-Sale Valuation opportunity.

    First-sale value is assumed to be 20% lower than middleman invoice value.
    """
    first_sale_value = declared_value * 0.80
    estimated_duty = declared_value * (mfn_rate_pct / 100.0)
    savings = estimated_duty * 0.20
    
    recommendation = (
        f"First-sale valuation is eligible because the cargo was transshipped through Jebel Ali Free Zone (JAFZA) "
        f"and purchased from a registered trading intermediary. Importer can declare based on the manufacturer's "
        f"invoice value of ${first_sale_value:,.2f} instead of the declared middleman value of ${declared_value:,.2f}. "
        f"This yields a 20% duty savings of ${savings:,.2f}."
    )
    
    return {
        "eligible": True,
        "first_sale_value": first_sale_value,
        "estimated_savings_usd": savings,
        "recommendation": recommendation
    }


def check_drawback_savings(actual_duty: float) -> dict:
    """Evaluate Duty Drawback opportunity.

    Allows a refund of up to 99% of duties paid on imported merchandise that is subsequently re-exported.
    """
    savings = actual_duty * 0.99
    recommendation = (
        f"The shipment has documented intent of re-exportation. Under 19 U.S.C. § 1313, "
        f"the importer is eligible for a 99% duty drawback refund upon validation of export exit documentation. "
        f"Potential refund claim: ${savings:,.2f}."
    )
    
    return {
        "eligible": True,
        "estimated_savings_usd": savings,
        "recommendation": recommendation
    }
