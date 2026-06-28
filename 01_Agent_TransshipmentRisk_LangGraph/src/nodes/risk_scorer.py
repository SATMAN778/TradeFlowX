"""
src/nodes/risk_scorer.py — Risk Scorer node.
"""

import re
from src.state import TransshipmentRiskState


def risk_scorer(state: TransshipmentRiskState) -> dict:
    """Aggregate all findings and calculate risk score, level, and true COO verdict."""
    state.validate_required_fields_at_node_boundary()

    score = 0

    # 1. Supplier in JAFZA / Free Zone (+10)
    if state.jafza_flag:
        score += 10

    # 2. Supplier type
    if state.supplier_type == "trading_company":
        score += 25
    elif state.supplier_type == "unknown":
        score += 15

    # 3. Substantial transformation
    if state.substantial_transform is False:
        score += 35
    elif state.substantial_transform is None:
        score += 20

    # 4. True COO = China (Section 301 goods) (+30)
    if state.third_country_origin == "China" and state.section_301_applicable:
        score += 30

    # 5. True COO = Iran (+50)
    if state.third_country_origin == "Iran":
        score += 50

    # 6. ADD/CVD order active (+25)
    if state.add_cvd_applicable:
        score += 25

    # 7. CBP watchlist hit (+40)
    if state.watchlist_hits:
        score += 40

    # 8. Iran/Russia nexus signal (+50)
    if state.iran_russia_nexus:
        score += 50

    # 9. Deductions
    # Human reviewer confirmed UAE transformation (-30)
    confirmed_uae = False
    if state.human_review_notes:
        notes_lower = state.human_review_notes.lower()
        if any(kw in notes_lower for kw in ["confirm uae", "accept uae", "valid uae", "approve uae", "clear uae", "override: uae"]):
            score -= 30
            confirmed_uae = True
        elif any(kw in notes_lower for kw in ["confirm", "accept", "valid", "approve", "clear", "override", "genuine"]):
            # Generic confirmation
            score -= 30
            confirmed_uae = True

    # Valid Form A / UAE Chamber COO attached (-20)
    if state.coo_certificate:
        cert_lower = state.coo_certificate.lower()
        if any(kw in cert_lower for kw in ["form a", "chamber", "seal", "stamp"]):
            score -= 20

    # Bound risk score between 0 and 100
    risk_score = max(0, min(100, score))

    # Determine risk level
    if risk_score <= 20:
        risk_level = "LOW"
    elif risk_score <= 45:
        risk_level = "MEDIUM"
    elif risk_score <= 70:
        risk_level = "HIGH"
    else:
        risk_level = "CRITICAL"

    # Determine true country of origin verdict
    true_coo = None
    
    # Check for human review overrides or instructions
    if state.human_review_notes:
        notes_lower = state.human_review_notes.lower()
        # Parse override: <Country>
        match = re.search(r"override:\s*([a-zA-Z\s]+)", notes_lower)
        if match:
            true_coo = match.group(1).strip().title()
        elif "accept declared" in notes_lower or "accept uae" in notes_lower or "confirm uae" in notes_lower:
            true_coo = "UAE"
        elif "china" in notes_lower:
            true_coo = "China"
        elif "india" in notes_lower:
            true_coo = "India"
        elif "iran" in notes_lower:
            true_coo = "Iran"

    if not true_coo:
        if state.substantial_transform is True:
            true_coo = "UAE"
        elif state.substantial_transform is False and state.third_country_origin:
            true_coo = state.third_country_origin
        elif state.substantial_transform is None:
            if state.human_escalation:
                true_coo = "UNRESOLVED — CBP ruling required"
            elif state.third_country_origin:
                true_coo = state.third_country_origin
            else:
                true_coo = "UNRESOLVED — CBP ruling required"
        else:
            # Fallback
            true_coo = state.declared_coo

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "true_coo_verdict": true_coo,
        "job_status": "completed"
    }
