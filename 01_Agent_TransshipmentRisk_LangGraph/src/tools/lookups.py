"""
src/tools/lookups.py — Registry lookup, watchlist search, COO extraction, tariff checks, and sanctions screening tools.
"""

from typing import Optional, List, Dict, Any


def UAE_manufacturer_registry_lookup(supplier_name: str, supplier_address: str) -> Dict[str, Any]:
    """Look up UAE manufacturer registries like Dubai Chamber or JAFZA portal.

    Returns:
        dict: {
            "registered_manufacturer": bool,
            "product_categories": list[str],
            "registration_number": Optional[str]
        }
    """
    name_lower = supplier_name.lower()
    address_lower = supplier_address.lower()

    # Simple mock logic based on name/address keywords
    is_registered = any(
        kw in name_lower or kw in address_lower
        for kw in ["manufactur", "factory", "indus", "plant", "producer", "cement", "metal"]
    )
    
    # Exclude trading terms explicitly
    if any(kw in name_lower for kw in ["trading", "logistic", "intermediary", "transit"]):
        is_registered = False

    categories = ["Petrochemicals", "Aluminum Products", "General Cargo"] if is_registered else []
    reg_num = f"UAE-MFG-{supplier_name[:4].upper()}-99" if is_registered else None

    return {
        "registered_manufacturer": is_registered,
        "product_categories": categories,
        "registration_number": reg_num
    }


def trade_intelligence_search(supplier_name: str, product_description: str) -> str:
    """Fuzzy-match search on public trade databases to identify company profile.

    Returns:
        str: "manufacturer" | "trading_company" | "unknown"
    """
    name_lower = supplier_name.lower()
    
    if any(kw in name_lower for kw in ["trading", "logistics", "transit", "intermediary", "distributor", "broker"]):
        return "trading_company"
    elif any(kw in name_lower for kw in ["manufactur", "factory", "indus", "plant", "producer", "mfg", "manufacturing"]):
        return "manufacturer"
    else:
        return "unknown"


def supplier_watchlist_check(supplier_name: str, supplier_address: str) -> List[Dict[str, Any]]:
    """Check known transshipment lists and OFAC/BIS databases for the supplier.

    Returns:
        list[dict]: Watchlist hit records.
    """
    name_lower = supplier_name.lower()
    address_lower = supplier_address.lower()
    hits = []

    if "iran" in name_lower or "tehran" in name_lower or "iran" in address_lower:
        hits.append({
            "party": supplier_name,
            "list_name": "OFAC SDN List",
            "match_score": 100,
            "reason": "Explicit Iranian nexus / sanctioned entity address."
        })
    
    if "russia" in name_lower or "moscow" in name_lower or "russia" in address_lower:
        hits.append({
            "party": supplier_name,
            "list_name": "BIS Entity List",
            "match_score": 100,
            "reason": "Explicit Russian nexus / denied entity address."
        })

    if "watchlist" in name_lower:
        hits.append({
            "party": supplier_name,
            "list_name": "CBP Transshipment Intermediary Watchlist",
            "match_score": 95,
            "reason": "Known transshipment intermediary matches watch list."
        })

    return hits


def extract_coo_certificate(coo_certificate_text: Optional[str]) -> Dict[str, Any]:
    """Parse text from the Certificate of Origin (COO) PDF.

    Returns:
        dict: Parsed COO attributes.
    """
    if not coo_certificate_text:
        return {
            "issuing_authority": None,
            "declared_manufacture_process": None,
            "form_type": None,
            "has_chamber_seal": False
        }

    text_lower = coo_certificate_text.lower()
    
    # Check Form type
    form_type = "UAE Chamber COO"
    if "form a" in text_lower or "gsp form a" in text_lower:
        form_type = "Form A"

    # Check authority
    authority = "Dubai Chamber of Commerce"
    if "jafza" in text_lower:
        authority = "JAFZA Authority"

    return {
        "issuing_authority": authority,
        "declared_manufacture_process": "Blending and refining" if "blending" in text_lower or "refine" in text_lower else "Assembly",
        "form_type": form_type,
        "has_chamber_seal": "seal" in text_lower or "stamp" in text_lower or "signed" in text_lower
    }


def validate_substantial_transformation(
    hts_code: str,
    coo_text: Optional[str],
    product_description: str
) -> Optional[bool]:
    """Verify if substantial transformation happened in the UAE.

    Returns:
        bool | None: True if verified, False if denied, None if inconclusive.
    """
    if not coo_text:
        return None

    text_lower = coo_text.lower()

    if any(kw in text_lower for kw in ["non-transforming", "re-packaged", "assembled only", "transit only", "no change"]):
        return False
    elif any(kw in text_lower for kw in ["inconclusive", "unknown origin", "mixed parts"]):
        return None
    elif any(kw in text_lower for kw in ["substantial transformation", "form a", "manufactured in uae", "processing complete"]):
        return True
    
    # Fallback to None if not explicitly stated
    return None


def product_manufacture_plausibility(product_description: str, hts_code: str) -> float:
    """Assess whether it is plausible this type of product is manufactured in the UAE.

    Returns:
        float: Plausibility score (0.0 to 1.0)
    """
    desc_lower = product_description.lower()
    
    # Petrochemicals, aluminum, basic metals, cement are highly plausible UAE manufactures
    if any(kw in desc_lower or hts_code.startswith(prefix) for kw in ["petrol", "oil", "aluminum", "cement", "metal"] for prefix in ["27", "76", "25", "72"]):
        return 0.95
    
    # Complex electronics (e.g. semiconductor chips) are generally low plausibility
    if any(kw in desc_lower or hts_code.startswith(prefix) for kw in ["microchip", "semiconductor", "processor", "integrated circuit"] for prefix in ["8541", "8542"]):
        return 0.25

    return 0.60


def cbp_transshipment_watchlist_lookup(supplier_name: str, supplier_address: str) -> List[Dict[str, Any]]:
    """Lookup supplier details directly in CBP watchlists.

    Same as watchlist check but specific to CBP databases.
    """
    return supplier_watchlist_check(supplier_name, supplier_address)


def manufacturer_country_identifier(
    product_description: str,
    hts_code: str,
    supplier_name: str
) -> Optional[str]:
    """Trace the actual third-country origin for untransformed/inconclusive goods.

    Returns:
        str | None: "China" | "India" | "Iran" | None
    """
    name_lower = supplier_name.lower()
    desc_lower = product_description.lower()

    if "china" in name_lower or "shenzhen" in name_lower or "china" in desc_lower:
        return "China"
    if "iran" in name_lower or "tehran" in name_lower or "iran" in desc_lower:
        return "Iran"
    if "india" in name_lower or "mumbai" in name_lower or "india" in desc_lower:
        return "India"
    
    # If no keywords, but it's JAFZA and transformation failed, default to China for safety screening
    if "watchlist" in name_lower:
        return "China"

    return None


def section_301_tariff_checker(hts_code: str, true_coo: str) -> Dict[str, Any]:
    """Check if Section 301 tariffs apply to the true country of origin.

    Returns:
        dict: { "applicable": bool, "surcharge_rate": str }
    """
    if true_coo == "China":
        return {
            "applicable": True,
            "surcharge_rate": "25%"
        }
    return {
        "applicable": False,
        "surcharge_rate": "0%"
    }


def add_cvd_order_lookup(hts_code: str, true_coo: str) -> bool:
    """Check if an active ADD/CVD order applies to the HTS and true country of origin."""
    # Active orders commonly on metal articles (chapters 72, 73, 76) from China/India
    clean_hts = hts_code.replace(".", "")
    is_metal = any(clean_hts.startswith(ch) for ch in ["72", "73", "76"])
    
    if is_metal and true_coo in ["China", "India"]:
        return True
    return False


def iran_russia_nexus_check(supplier_name: str, supplier_address: str) -> bool:
    """Checks for OFAC / BIS / Sanctions evasion indicators to Iran or Russia."""
    combined = (supplier_name + " " + supplier_address).lower()
    return any(kw in combined for kw in ["iran", "tehran", "russia", "moscow", "sanctioned"])
