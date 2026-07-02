# TradeFlowX: Reference Tables & Compliance Specs

This document contains the detailed reference tables, database schemas, task matrices, and compliance definitions for **TradeFlowX**.

---

## 1. Stage-by-Stage Task Lists

### S1 · Trade Order Intake and Shipment Creation
| Task | Automation | Output |
|---|---|---|
| T1.1 Capture PO data | ERP API / email RPA | Case fields populated |
| T1.2 Validate shipment data | Rule engine | Entry type set; bond alert |
| T1.3 Confirm country of origin | AI agent reads supplier + COO cert | Transshipment flag if JAFZA |
| T1.4 Create case + notify | Maestro + email/Slack | S2 / S3 / S5 triggered immediately |

### S2 · ISF 10+2 Filing (Importer & Carrier Elements)
| # | Element | Source | Automation |
|---|---|---|---|
| 1 | Seller name and address | Supplier record / PO | ERP API |
| 2 | Buyer name and address | Importer master data | ERP API |
| 3 | Importer of record number | CBP bond / EIN | Master data lookup |
| 4 | Consignee number | CBP importer number | Master data lookup |
| 5 | Manufacturer / supplier | Supplier record | ERP / supplier portal |
| 6 | Ship-to party | Delivery record | ERP API |
| 7 | Country of origin | T1.3 output | Auto-populated |
| 8 | HTS-6 | T3 pre-fill | AI agent |
| 9 | Container stuffing location | Freight forwarder notice | Email extraction |
| 10 | Consolidator name and address | Freight forwarder notice | Email extraction |

*Carrier Elements (Monitor Only):*
*   Element 11: Vessel stow plan (carrier submits to ACE)
*   Element 12: Container status messages (carrier submits)

### S4 · PGA Agency Screening Guidelines
| Agency | Typical UAE Goods | Requirement |
|---|---|---|
| FDA | Food, cosmetics, medical devices, electronics | Prior notice; facility registration |
| USDA APHIS | Plants, wood packaging | Phytosanitary certificate |
| EPA | Chemicals, pesticides, engines | EPA declaration |
| CPSC | Consumer products, children's products | Certificate of compliance |
| FCC | Electronics, wireless devices | FCC ID / equipment authorization |
| DOT/NHTSA | Vehicles, tires, auto parts | DOT certification |

### S5 · OFAC Screening Actions
| Score | Action | SLA |
|---|---|---|
| < 85% match | Auto-clear, log result | — |
| ≥ 85% match | HT-11: Compliance review | 2 business hours |
| 100% exact | Immediate case block → HT-12 | Immediate |

### S6 · CBP Exam Responses
| CBP Status | Response |
|---|---|
| Released (green) | Trigger S7 |
| Exam selected (X-ray / CET / intensive) | HT-13: Port agent coordination |
| Hold — CF-28 (Request for Information) | Auto-populate from case; HT-14 for gaps (30-day deadline) |
| CF-29 (Notice of Action) | HT-15: Broker + Legal; protest deadline tracked |
| Seizure | Immediate legal escalation |

### S7 · Post-Entry Document Archive Checklist
*   Commercial invoice (original)
*   Packing list
*   Bill of lading (OBL or telex release)
*   Certificate of origin (UAE Chamber of Commerce)
*   ISF filing confirmation
*   PGA permits and releases (if applicable)
*   OFAC screening record
*   CBP entry summary (CBP 7501)
*   Arrival notice

---

## 2. Human Task Matrix

All human tasks are **UiPath Maestro Human Task activities** with defined SLA timers and escalation paths.

| Task ID | Stage | Trigger | Assignee | SLA |
|---|---|---|---|---|
| HT-01 | S1 | Missing PO fields | Ops team | 2 hrs |
| HT-02 | S1 | Transshipment flag — verify COO | Compliance | 4 hrs |
| HT-03 | S2 | Missing ISF elements | Broker | 4 hrs (before deadline) |
| HT-04 | S2 | ISF Do Not Load | Broker + Legal | **Immediate** |
| HT-05 | S2 | ISF material amendment | Broker | 2 hrs |
| HT-06 | S3 | HTS confidence 70–90% | Broker | 4 hrs |
| HT-07 | S3 | HTS confidence < 70% | Classification specialist | 8 hrs |
| HT-08 | S3 | COO documentation required | Supplier mgmt | 24 hrs |
| HT-09 | S4 | PGA May Hold | Broker | 4 hrs |
| HT-10 | S4 | PGA Refusal | Compliance + Legal | **Immediate** |
| HT-11 | S5 | OFAC fuzzy match ≥ 85% | Compliance | 2 hrs |
| HT-12 | S5 | Confirmed OFAC / DPL hit | Legal + Management | **Immediate** |
| HT-13 | S6 | CBP exam selected | Port agent | 4 hrs |
| HT-14 | S6 | CF-28 unanswered questions | Broker + Ops | 5 days |
| HT-15 | S6 | CF-29 / CBP action | Broker + Legal | 2 days |
| HT-16 | S7 | Document discrepancy | Ops | 4 hrs |
| HT-17 | S7 | Duty variance | Finance | 2 days |
| HT-18 | S7 | Duty savings opportunity | Trade counsel | 5 days |

---

## 3. Key SLA Timers

| SLA | Deadline | Maestro Timer Starts |
|---|---|---|
| ISF filing | Vessel departure − 24 hrs | T1.4 case creation |
| OFAC fuzzy match review | 2 business hours | HT-11 assignment |
| HTS human review | 4 business hours | HT-06 / HT-07 assignment |
| CBP exam coordination | 4 business hours | T6.5 exam notification |
| CF-28 response (internal) | 5 business days | T6.6 CF-28 receipt |
| CF-28 response (CBP statutory) | 30 calendar days | T6.6 CF-28 receipt |
| Entry summary CBP 7501 | 10 working days from entry | T6.4 entry filing |
| Document retention | 5 years (7 for ADD/CVD) | T7.3 archive |

---

## 4. Maestro Case Fields

These fields are visible across all stages in the Maestro case header.

| Field | Type | Populated By |
|---|---|---|
| Case ID | Auto-generated | Maestro |
| Shipment reference | Text | T1.1 |
| Supplier name (UAE) | Text | T1.1 |
| Importer of record | Text | T1.1 |
| Country of origin (declared) | Dropdown | T1.3 |
| Country of origin (verified) | Dropdown | T3.5 |
| Port of loading | Text | T1.1 (Dubai / Jebel Ali) |
| Port of entry (USA) | Dropdown | T1.1 |
| HTS code | Text | T3.2 |
| Shipment value (USD) | Currency | T1.2 |
| Entry type | Dropdown | T6.1 (01 / 11 / 86) |
| ISF filing status | Status badge | T2.3 |
| OFAC screening result | Status badge | T5.6 |
| CBP release status | Status badge | T6.5 |
| Case status | Status badge | Maestro auto |
| Assigned broker | Text | T1.4 |
| ERP PO number | Text | T1.1 |

---

## 5. Technology Stack Specs

### Core Platform
| Component | Technology | Purpose |
|---|---|---|
| Orchestration | UiPath Maestro | Case app, human tasks, SLA timers, agent coordination |
| AI Agents | UiPath Agents + LLM | HTS classification, COO analysis, transshipment intel |
| RPA | UiPath Attended / Unattended | ACE portal, ERP scraping, document upload |
| Document Intelligence | UiPath Document Understanding (IDP) | Invoice, B/L, packing list extraction + cross-validation |
| Human Interaction | UiPath Apps + Action Center | Broker portal, compliance dashboard, exception review |
| Process Governance | UiPath Orchestrator | Bot fleet management, queue management, audit trail |

### Multi-Agent Framework
| Component | Technology | Role |
|---|---|---|
| Agent state management | LangGraph | Durable execution, state persistence across agents |
| Multi-agent collaboration | CrewAI | Specialized agents (intake, verification, compliance, comms) |
| LLM backbone | OpenAI / Enterprise LLM | HTS lookup, document reasoning, transshipment intel |

### Regulatory API Integrations
| System | Integration | Stages |
|---|---|---|
| CBP ACE | REST API + RPA fallback | S2, S3, S4, S6 |
| OFAC SDN | REST API (ofac.treasury.gov) | S5 |
| USITC Tariff Schedule | REST API | S3 |
| CBP CROSS Rulings | Web scrape / API | S3 |
| Commerce Dept ADD/CVD DB | Web scrape | S3 |
| BIS Entity List / DPL | REST API or file sync | S5 |
| SAM.gov EPLS | REST API | S5 |
| ERP API | REST / Webhook | S1, S6, S7 |
| Document Management (SharePoint / ECM) | API | S7 |
| Customs Broker TMS | API or RPA | S6 |
| Email (Outlook / Gmail) | Integration connector | S1, S2, S7 |

---

## 6. Compliance References & Key Terms

### Key Reference URLs
*   **CBP Import Process:** [cbp.gov/trade/basic-import-export](https://www.cbp.gov/trade/basic-import-export)
*   **ACE Portal:** [cbp.gov/trade/automated](https://www.cbp.gov/trade/automated)
*   **ISF 10+2 Filing:** [cbp.gov/cargo-security/importer-security-filing-102](https://www.cbp.gov/border-security/ports-entry/cargo-security/importer-security-filing-102)
*   **HTS Schedule:** [hts.usitc.gov](https://hts.usitc.gov)
*   **CBP CROSS Rulings:** [rulings.cbp.gov](https://rulings.cbp.gov)
*   **Section 301 Tariffs:** [ustr.gov/enforcement/section-301-investigations](https://www.ustr.gov/issue-areas/enforcement/section-301-investigations)
*   **ADD/CVD Orders:** [enforceandprotect.trade.gov](https://enforceandprotect.trade.gov)
*   **OFAC SDN Search:** [sanctionssearch.ofac.treas.gov](https://sanctionssearch.ofac.treas.gov)
*   **BIS Entity List:** [bis.doc.gov/parties-of-concern](https://www.bis.doc.gov/index.php/policy-guidance/lists-of-parties-of-concern)
*   **SAM.gov Excluded Parties:** [sam.gov](https://www.sam.gov)
*   **FDA Prior Notice:** [fda.gov/food/importing-food/prior-notice](https://www.fda.gov/food/importing-food/prior-notice)
*   **USDA APHIS:** [aphis.usda.gov/import-export](https://www.aphis.usda.gov/import-export)
*   **JAFZA Free Zone:** [jafza.ae](https://www.jafza.ae)
*   **Dubai Customs:** [dubaicustoms.gov.ae](https://www.dubaicustoms.gov.ae)
*   **UAE Certificate of Origin:** [dubaichamber.com/certificate-of-origin](https://www.dubaichamber.com/services/certificate-of-origin)

### Key Import Terms
*   **ISF 10+2:** 10 importer + 2 carrier data elements filed 24 hrs before vessel loads at Jebel Ali
*   **HTS Code:** 10-digit product classification code that determines your US duty rate
*   **MFN Rate:** Standard duty rate applied to WTO members (including UAE)
*   **Section 301:** Extra US tariff (7.5%–100%) on Chinese-origin goods — applies even via UAE transit
*   **ADD / CVD:** Anti-Dumping / Countervailing Duties on subsidized or below-market-price imports
*   **CBP 3461:** Entry form filed to release cargo from port before full duty assessment
*   **CBP 7501:** Entry Summary — final duty declaration filed within 10 working days of entry
*   **MPF:** Merchandise Processing Fee — 0.3464% of value (min $31.67 / max $614.35)
*   **HMF:** Harbor Maintenance Fee — 0.125% of value on all ocean cargo
*   **IOR:** Importer of Record — entity legally responsible for CBP compliance and duty payment
*   **ACE:** CBP's single digital window for all US import, export and PGA filings
*   **PGA:** Partner Government Agency — FDA, USDA, EPA, CPSC, FCC regulate specific goods
*   **Substantial Transformation:** Legal test for UAE origin — goods must be genuinely manufactured, not repackaged
