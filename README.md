# 🚢 TradeFlow Maestro AI

### Agentic Import Operations Platform · UAE (Dubai / JAFZA) → USA

[![UiPath Maestro](https://img.shields.io/badge/UiPath-Maestro-FF6B35?style=for-the-badge&logo=uipath&logoColor=white)](https://www.uipath.com/product/maestro)
[![License](https://img.shields.io/badge/License-MIT-00B4D8?style=for-the-badge)](LICENSE)
[![Stage](https://img.shields.io/badge/Stage-Hackathon%20Build-E94560?style=for-the-badge)]()
[![Compliance](https://img.shields.io/badge/Compliance-CBP%20%7C%20OFAC%20%7C%20ISF%2010%2B2-0F3460?style=for-the-badge)]()

---

## Overview

**TradeFlow Maestro AI** is a fully orchestrated **Agentic Import Operations Platform** that autonomously manages the end-to-end US customs clearance lifecycle for shipments originating from **Dubai and JAFZA (UAE)**.

Built on UiPath Maestro, the platform acts as a **digital Import Operations Manager** — coordinating AI agents, RPA bots, live regulatory APIs, and human reviewers under a single governed workflow.

> **Scope**: US Importer of Record role only. UAE export obligations (EEI, export licenses) are explicitly out of scope.

---

## TradeX Portal Dashboard

The **TradeX Portal** is a Vite + React + TypeScript web application that serves as the central control room for import operations managers. It provides a visual dashboard of active cases, direct database records via the Data Fabric Registry, and a dedicated Task Inbox for human-in-the-loop approvals.

| Main Dashboard Overview | Data Fabric Case Details |
| :---: | :---: |
| ![TradeX Portal Main Dashboard](docs/images/dashboard_main.png) | ![Case Details Panel](docs/images/case_details_view.png) |

| Task Workstation & Approval Inbox |
| :---: |
| ![Action Tasks Workstation](docs/images/task_review_view.png) |

---

## The Problem & Manual Process Today

Importing goods from the UAE (Dubai/JAFZA) into the USA is a highly regulated, high-stakes supply chain operation. The transaction spans multiple cross-border stakeholders, compliance frameworks, documents, and regulatory deadlines. 

### Key Corridor Metrics (PPT-Ready)
*   🌐 **US–UAE trade hit $47.9B in 2024, growing 10.4% YoY** — yet the compliance infrastructure managing this corridor still runs on manual broker workflows and email chains that cannot scale. *(USTR, 2024)*
*   📋 **HTS misclassification drives 42% of all CBP penalties** — with Section 301 and IEEPA tariffs stacking to 40%+, one wrong digit can shift your effective duty rate by 20–50 percentage points overnight. *(Greenwich Mercantile, 2026)*
*   🚢 **60% of all GCC re-exports flow through UAE Free Zones** — making every JAFZA shipment a CBP scrutiny target for undeclared China/India origin, Section 301 exposure, and OFAC transshipment risk. *(UAE Customs Guide, 2026)*
*   ⚠️ **Late ISF filing costs $5,000–$10,000 per shipment** — and a manual broker handling 40–60 entries a month cannot guarantee the 24-hour Jebel Ali deadline on every ocean vessel departure. *(CBP / Great Lakes Customs Law)*

### What is Being Done Manually Today?

Currently, import compliance operations rely heavily on fragmented manual workflows:
*   📧 **Brokers collect shipment documents via email and manually re-key data into ACE** — commercial invoices, B/L, COO, and packing lists arrive as PDF attachments with no structured extraction; a single entry takes 2–4 hours of manual preparation with brokers reviewing just 5–10% of HTS codes before submission. *(Flexport Customs Brokerage — flexport.com, 2025)*
*   ⏰ **ISF 10+2 is filed manually by a customs broker racing a 24-hour clock** — brokers chase suppliers for missing data elements over email, hand-key all 10+2 fields into ACE, and rely on personal reminders rather than automated SLA enforcement to avoid the $5,000–$10,000 per-shipment penalty. *(Great Lakes Customs Law — greatlakescustomslaw.com, 2026)*
*   🔍 **HTS classification is done by a human expert per shipment, from scratch** — brokers manually search the 17,000-code HTSUS schedule, cross-reference CBP CROSS rulings, and check Section 301 lists individually; no institutional memory carries over from prior shipments of the same product. *(US International Trade Commission — hts.usitc.gov)*
*   🚨 **OFAC screening is performed at supplier onboarding only — then never again** — most importers run a one-time manual name search on OFAC's public web tool; the SDN list updates multiple times per week, meaning a supplier cleared at setup may be sanctioned today with no re-check triggered. *(OFAC Treasury Sanctions List Search — ofac.treasury.gov · Sanctions Lawyers, 2026)*
*   🏛️ **PGA requirements are researched manually per shipment across 5+ separate agency portals** — FDA, USDA, CPSC, EPA and FCC each maintain independent submission systems; importers discover PGA holds only after the container arrives at port, with demurrage running at $200–$400/day while documentation is gathered. *(USA Customs Clearance PGA Guide — usacustomsclearance.com · FreightAmigo, 2026)*
*   📂 **Post-entry reconciliation and duty payments are manually posted to ERP by the finance team** — CBP 7501 entry summaries, broker fee invoices, and duty calculations are reconciled via spreadsheet with no automated cross-check against declared values; 5-year record retention is managed through shared drives and email folders. *(Clearit USA Import Lifecycle — clearitusa.com, 2025)*


| Manual Challenge | Impact of Manual Failure |
|---|---|
| ISF 10+2 must file **24 hrs before vessel loads** at Jebel Ali | Missed deadlines trigger CBP penalties ($5,000–$10,000/violation) and cargo lading holds. |
| HTS classification errors | Wrong duty rates applied, leading to CBP exams, delays, and post-entry liquidation penalties. |
| JAFZA transshipment risk | Chinese-origin goods transiting UAE escape Section 301 tariffs, triggering major trade fraud violations. |
| OFAC / BIS / SAM.gov screening | Manual list checking misses fuzzy name matches, causing severe sanctions compliance violations. |
| Fragmented document handling | Discrepancies between invoice and packing list are only discovered at the port of entry, halting clearance. |

Traditional task automation cannot solve this. **TradeFlow Maestro AI orchestrates the entire import clearance operation.**

---

## Architecture

```
╔══════════════════════════════════════════════════════════════════════╗
║              TRADEFLOW MAESTRO AI — ORCHESTRATION LAYER              ║
║                        UiPath Maestro Case App                       ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  ┌─────────────┐   ┌──────────────┐   ┌───────────────────────────┐ ║
║  │  S1 ORDER   │──▶│  S2 ISF 10+2 │   │     S3 HTS CLASSIFICATION │ ║
║  │   INTAKE    │   │   FILING     │   │     + DUTY DETERMINATION  │ ║
║  │  ERP/EDI/   │   │  ACE API /   │   │  AI Agent + USITC API +   │ ║
║  │  Email RPA  │   │  RPA fallback│   │  CBP CROSS + ADD/CVD DB   │ ║
║  └─────────────┘   └──────┬───────┘   └──────────────┬────────────┘ ║
║         │                 │                           │              ║
║         │         ╔═══════╧═══════════════════════════╧════════╗    ║
║         │         ║    PARALLEL EXECUTION (Start at S1)        ║    ║
║         │         ║  S2 + S3 + S5 run simultaneously           ║    ║
║         │         ╚═══════════════════════════╤════════════════╝    ║
║         │                                     │                     ║
║         │   ┌─────────────────────────────────▼──────────────────┐  ║
║         │   │            S5 OFAC + DENIED-PARTY SCREENING        │  ║
║         │   │   OFAC SDN API · BIS Entity List · SAM.gov EPLS    │  ║
║         │   │   Fuzzy-match scoring · Transshipment intel agent  │  ║
║         │   └────────────────────────┬───────────────────────────┘  ║
║         │                            │                              ║
║         │   ┌─────────────┐          │   [PGA Flag = true]          ║
║         │   │ S4 PGA      │◀─────────┘   FDA · USDA · EPA ·        ║
║         │   │ SCREENING   │              FCC · CPSC · DOT          ║
║         │   │ Conditional │              (conditional parallel)     ║
║         │   └──────┬──────┘                                         ║
║         │          │                                                 ║
║         │   ╔══════╧══════════════════════════════════╗             ║
║         │   ║  ALL-CLEAR CONVERGENCE GATE             ║             ║
║         └──▶║  S2 ✓  +  S3 ✓  +  S5 ✓  = PROCEED    ║             ║
║             ╚══════════════════════════════╤══════════╝             ║
║                                            │                        ║
║             ┌──────────────────────────────▼───────────────────┐    ║
║             │         S6 CUSTOMS ENTRY FILING & CBP CLEARANCE  │    ║
║             │   CBP Form 3461 · ACE API · Duty Calculation      │    ║
║             │   CF-28 / CF-29 handling · Entry summary 7501    │    ║
║             └──────────────────────────────┬───────────────────┘    ║
║                                            │ CBP Release            ║
║             ┌──────────────────────────────▼───────────────────┐    ║
║             │      S7 DOCUMENT MANAGEMENT & POST-ENTRY         │    ║
║             │   IDP · DMS Archive · ERP Reconciliation         │    ║
║             │   Duty drawback · First-sale · C-TPAT audit      │    ║
║             └──────────────────────────────────────────────────┘    ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## Workflow Stages

### S1 · Trade Order Intake and Shipment Creation

**Trigger**: New PO received from UAE supplier (ERP event / email / EDI / portal webhook)
**Automation**: Integration + RPA | **Output**: Maestro case created, stakeholders notified

| Task | Automation | Output |
|---|---|---|
| T1.1 Capture PO data | ERP API / email RPA | Case fields populated |
| T1.2 Validate shipment data | Rule engine | Entry type set; bond alert |
| T1.3 Confirm country of origin | AI agent reads supplier + COO cert | Transshipment flag if JAFZA |
| T1.4 Create case + notify | Maestro + email/Slack | S2 / S3 / S5 triggered immediately |

> **Key logic**: JAFZA or UAE Free Zone supplier → auto-flag potential transshipment → HT-02 assigned to compliance for COO verification.

---

### S2 · ISF 10+2 Filing ⏱ *Time Critical*

**Deadline**: 24 hours before vessel loads at Jebel Ali / Dubai port
**Automation**: ACE API integration + RPA fallback | **SLA timer**: Active from T1.4

#### 10 Importer Elements (Importer Responsible)

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

#### Carrier +2 Elements (Monitor Only)
- Element 11: Vessel stow plan (carrier submits to ACE)
- Element 12: Container status messages (carrier submits)

> **Error handling**: ACE rejection → parse error code → HT-04 (Do Not Load → immediate escalation)

---

### S3 · HTS Classification and Duty Determination

**Trigger**: Parallel with S2 from case creation
**Automation**: AI Agent (LLM + USITC API + CBP CROSS) + human review queue

```
Product Description (IDP)
         │
         ▼
  AI Agent HTS Lookup
  (USITC API + CBP CROSS)
         │
  ┌──────┴──────────┐
  │ Confidence Gate │
  └──┬──────┬───────┘
     │      │         │
   >90%  70-90%     <70%
  Auto-  Broker   Specialist
 approve review    classify
  (HT-06)  (HT-07)
         │
         ▼
  Duty Rate Validation
  MFN + Section 301 + ADD/CVD
         │
         ▼
  Transshipment + True COO Check
  (T3.5 — critical for JAFZA goods)
```

**Duty components calculated**:
- MFN duty rate × declared value
- Section 301 surcharge (if true COO = China after T3.5 verification)
- ADD / CVD order rate (Commerce Department database)
- MPF: 0.3464% (min $31.67 / max $614.35)
- HMF: 0.125% (ocean shipments)

---

### S4 · PGA Screening *(Conditional — Only If S3 Flags)*

**Trigger**: PGA flag = true from T3.6
**Automation**: Integration + RPA | Parallel sub-cases per agency

| Agency | Typical UAE Goods | Requirement |
|---|---|---|
| FDA | Food, cosmetics, medical devices, electronics | Prior notice; facility registration |
| USDA APHIS | Plants, wood packaging | Phytosanitary certificate |
| EPA | Chemicals, pesticides, engines | EPA declaration |
| CPSC | Consumer products, children's products | Certificate of compliance |
| FCC | Electronics, wireless devices | FCC ID / equipment authorization |
| DOT/NHTSA | Vehicles, tires, auto parts | DOT certification |

> All PGA message sets transmitted to CBP/ACE. Status: May Proceed / May Examine / May Hold / Refuse.

---

### S5 · OFAC and Denied-Party Screening

**Trigger**: Runs in parallel with S2, S3, S4 from case creation
**Automation**: OFAC SDN API + BIS + SAM.gov | **Retention**: 5 years (CBP + OFAC requirement)

**Parties screened**: UAE supplier · freight forwarder · customs broker (UAE) · shipping line · notify party · L/C issuing bank · beneficial owner

**Lists checked**:
- OFAC SDN (ofac.treasury.gov)
- OFAC Consolidated Sanctions + non-SDN programs (Iran, Syria, Russia transshipment)
- BIS Entity List + Denied Persons List
- State Dept AECA Debarred List
- SAM.gov EPLS

**Scoring logic**:

| Score | Action | SLA |
|---|---|---|
| < 85% match | Auto-clear, log result | — |
| ≥ 85% match | HT-11: Compliance review | 2 business hours |
| 100% exact | Immediate case block → HT-12 | Immediate |

> **UAE-specific**: If true COO (T3.5) = China or Iran, original manufacturer and exporter also screened. Known Iran/Russia transshipment intermediaries trigger HT-12 automatically.

---

### S6 · Customs Entry Filing and CBP Clearance

**Trigger**: S2 ✓ + S3 ✓ + S5 ✓ (convergence gate)
**Automation**: RPA + ACE API + broker integration

**Entry types**:
- **Type 01** (Formal): value > $2,500 — requires continuous bond
- **Type 11** (Informal): value $801–$2,500
- **Type 86** (Section 321 / de minimis): value < $800 — duties waived

**CBP exam status monitoring** (polled every 2 hours):

| CBP Status | Response |
|---|---|
| Released (green) | Trigger S7 |
| Exam selected (X-ray / CET / intensive) | HT-13: Port agent coordination |
| Hold — CF-28 (Request for Information) | Auto-populate from case; HT-14 for gaps (30-day deadline) |
| CF-29 (Notice of Action) | HT-15: Broker + Legal; protest deadline tracked |
| Seizure | Immediate legal escalation |

---

### S7 · Document Management and Post-Entry Reconciliation

**Trigger**: CBP release confirmed
**Automation**: IDP + DMS API + ERP API | **Retention**: 5 years (7 years for ADD/CVD entries)

**Document set collected and archived**:
- Commercial invoice (original)
- Packing list
- Bill of lading (OBL or telex release)
- Certificate of origin (UAE Chamber of Commerce)
- ISF filing confirmation
- PGA permits and releases (if applicable)
- OFAC screening record
- CBP entry summary (CBP 7501)
- Arrival notice

**Post-entry checks**:
- Landed cost reconciliation (estimated vs. CBP-assessed duties) → ERP GL posting
- First-sale valuation opportunity flag (Dubai transshipment → manufacturer price may be lower)
- Duty drawback eligibility (manufacturing or unused merchandise)
- ISF timeliness audit → C-TPAT compliance scorecard
- KPI dashboard feed

---

## Human Task Matrix

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

## Maestro Parallel Execution Model

```
Case Created (S1)
      │
      ├──────────────────────────────────────┐
      │                                      │
      ▼                                      ▼
S2 ISF Filing            S3 HTS Classification        S5 OFAC Screening
(ACE API)                (AI Agent + USITC)            (OFAC + BIS + SAM)
      │                         │                            │
      │                         ▼                            │
      │               [PGA Flag = true?]                     │
      │                    │       │                         │
      │                   YES      NO                        │
      │                    │       │                         │
      │                    ▼       └──────────────────────────┤
      │              S4 PGA Screen                           │
      │              (Conditional)                           │
      │                    │                                 │
      └────────────────────┴─────────────────────────────────┘
                           │
                    ╔══════╧══════╗
                    ║ MERGE GATE  ║
                    ║ S2+S3+S5=✓ ║
                    ╚══════╤══════╝
                           │
                       S6 Entry Filing
                           │
                    CBP Release
                           │
                       S7 Post-Entry
                           │
                     Case Closed
```

---

## Key SLA Timers

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

## Technology Stack

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
| ERP (SAP / Oracle / NetSuite) | REST / BAPI | S1, S6, S7 |
| Document Management (SharePoint / ECM) | API | S7 |
| Customs Broker TMS | API or RPA | S6 |
| Email (Outlook / Gmail) | Integration connector | S1, S2, S7 |

---

## Maestro Case Fields

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

## Compliance Notes

### JAFZA Transshipment Risk

Goods shipped from Jebel Ali Free Zone (JAFZA) may not be of UAE origin. If a substantial transformation cannot be confirmed:

- True COO may be China → **Section 301 tariffs apply** (7.5%–25% surcharge)
- True COO may be subject to active ADD/CVD orders
- Mis-declared COO triggers CBP fraud risk (19 USC 1592)

The platform automatically flags all JAFZA-origin suppliers for T3.5 COO verification.

### Section 301 Tariffs

HTS codes with China COO are cross-referenced against the USTR Section 301 tariff lists (List 1–4A). Surcharge rates are dynamically pulled; hardcoded rates are never used.

### OFAC Record Retention

All OFAC screening results (including cleared parties, list versions, and reviewer decisions) are archived per 31 CFR Part 501 and CBP requirements. Retention: **5 years minimum**.

### C-TPAT

ISF filing timeliness and accuracy is tracked per shipment for C-TPAT compliance scoring. Amendments and reasons are logged in the case audit trail.

### First-Sale Valuation

Where goods transit Dubai without substantial transformation, the first-sale (manufacturer) price may be a lower valid customs value than the Dubai resale price. The platform flags this opportunity for trade counsel review (HT-18).

---

## Repository Structure

```
tradeflow-maestro-ai/
├── README.md
├── maestro-architecture.svg          # Architecture diagram (GitHub render)
├── docs/
│   ├── blueprint/
│   │   └── Dubai_USA_Import_Maestro_Case_Blueprint.md
│   ├── compliance/
│   │   ├── isf-10plus2-checklist.md
│   │   ├── ofac-screening-guide.md
│   │   └── hts-classification-sop.md
│   └── integrations/
│       ├── ace-api-integration.md
│       ├── ofac-api-integration.md
│       └── erp-api-mapping.md
├── maestro/
│   ├── cases/
│   │   └── DubaiUSAImport.case          # Maestro case app definition
│   ├── workflows/
│   │   ├── S1_OrderIntake.xaml
│   │   ├── S2_ISFFilingOrchestrator.xaml
│   │   ├── S3_HTSClassification.xaml
│   │   ├── S4_PGAScreening.xaml
│   │   ├── S5_OFACScreening.xaml
│   │   ├── S6_CustomsEntryFiling.xaml
│   │   └── S7_DocumentManagement.xaml
│   └── human-tasks/
│       ├── HT-01_MissingPOFields.form
│       ├── HT-02_TransshipmentCOO.form
│       ├── HT-04_ISFDoNotLoad.form
│       ├── HT-06_HTSReview.form
│       ├── HT-11_OFACFuzzyMatch.form
│       ├── HT-12_OFACHitBlock.form
│       └── ...
├── agents/
│   ├── intake_agent/
│   ├── document_verification_agent/
│   ├── trade_compliance_agent/
│   ├── ofac_screening_agent/
│   ├── hts_classification_agent/
│   └── communication_agent/
├── integrations/
│   ├── ace_api/
│   ├── ofac_api/
│   ├── usitc_api/
│   ├── bis_api/
│   ├── samgov_api/
│   └── erp_connector/
└── tests/
    ├── test_isf_validation.py
    ├── test_hts_confidence_gate.py
    ├── test_ofac_fuzzy_match.py
    └── test_duty_calculation.py
```

---

## Multi-Agent Roles

| Agent | Responsibilities | Key Outputs |
|---|---|---|
| **Shipment Intake Agent** | Receive shipment package · classify type · create Maestro case · trigger orchestration | Case ID · stage triggers |
| **Document Verification Agent** | Validate completeness · check consistency · detect missing fields | Verification report · confidence scores · missing data list |
| **Trade Compliance Agent** | Review import requirements · validate HTS · identify risks · flag restricted goods | Compliance status · risk assessment · escalation recommendations |
| **OFAC Screening Agent** | Screen all trade parties · fuzzy-match scoring · transshipment intel | Screening record · clear / hold / block decision |
| **Shipment Readiness Agent** | Consolidate all findings · calculate readiness score · determine next action | Ready / Needs Review / Blocked |
| **Communication Agent** | Notify stakeholders · request missing documents · generate status updates | Email / Teams / UiPath Apps notifications |
| **Exception Resolution Agent** | Analyze errors · recommend corrective actions · route to humans | Escalation tasks · corrective action log |

---

## Getting Started

### Prerequisites

- UiPath Orchestrator (Cloud or On-Prem) with Maestro enabled
- UiPath Studio 2024.10+
- API credentials for: CBP ACE, OFAC SDN, USITC, BIS, SAM.gov
- ERP API access (SAP / Oracle / NetSuite)
- OpenAI API key (or enterprise LLM endpoint)

### Configuration

1. Clone this repository
2. Import the Maestro case definition from `maestro/cases/DubaiUSAImport.case`
3. Configure API credentials in UiPath Orchestrator Assets:
   - `ACE_API_KEY`
   - `OFAC_API_KEY`
   - `USITC_API_BASE_URL`
   - `ERP_BASE_URL` + `ERP_API_KEY`
   - `LLM_API_KEY`
4. Deploy workflows from `maestro/workflows/` to your Orchestrator tenant
5. Publish human task forms from `maestro/human-tasks/`
6. Configure SLA timers per the [Key SLA Timers](#key-sla-timers) table

### Running a Test Case

```bash
# Trigger a test intake via the Orchestrator API
curl -X POST https://your-orchestrator/api/jobs/StartJobs \
  -H "Authorization: Bearer $UIPATH_TOKEN" \
  -d '{
    "startInfo": {
      "ReleaseKey": "<S1_OrderIntake_ReleaseKey>",
      "Strategy": "All",
      "InputArguments": {
        "PONumber": "TEST-PO-001",
        "SupplierName": "Test Supplier LLC",
        "SupplierCountry": "UAE",
        "ShipmentValue": 15000,
        "PortOfLoading": "Jebel Ali"
      }
    }
  }'
```

---

## Business Impact

| Metric | Traditional Process | TradeFlow Maestro AI |
|---|---|---|
| ISF filing time | Manual, 4–8 hrs average | Automated, < 30 min |
| HTS classification accuracy | Depends on broker expertise | AI-assisted with confidence gating |
| OFAC screening coverage | Spot checks, manual | All parties, every shipment |
| Document discrepancy detection | At port (too late) | Pre-filing cross-validation |
| Compliance audit trail | Fragmented across email/files | Single Maestro case, full timeline |
| Duty savings identification | Ad hoc, often missed | Systematic first-sale + drawback flags |

---

## Hackathon Vision

> *Most automation solutions focus on task automation. TradeFlow Maestro AI focuses on operational decision automation.*

Instead of automating one activity, this platform orchestrates an **entire import operation** using coordinated AI agents, business rules, human approvals, and RPA — all under a single Maestro governance model.

The result is a next-generation **Agentic Supply Chain Operations** demonstration: trusted AI agents operating within governed business processes, fully auditable, scalable, and enterprise-ready.

---

## Future Enhancements

- [ ] Real-time carrier tracking integration (vessel AIS / container ETA)
- [ ] Predictive delay detection (weather, port congestion, CBP exam risk scoring)
- [ ] Trade regulation knowledge graph (auto-update on Federal Register changes)
- [ ] Autonomous supplier communication (request COO certs, packing lists)
- [ ] Multi-country import support (EU, India, UK corridors)
- [ ] AI shipment risk forecasting (ADD/CVD initiation risk, Section 301 expansion watch)
- [ ] Protest filing automation (CF-29 protest deadline tracking + auto-draft)

---

## Compliance References & Key Terms

### Key Reference URLs

| Resource | URL |
|---|---|
| CBP Import Process | [cbp.gov/trade/basic-import-export](https://www.cbp.gov/trade/basic-import-export) |
| ACE Portal | [cbp.gov/trade/automated](https://www.cbp.gov/trade/automated) |
| ISF 10+2 Filing | [cbp.gov/cargo-security/importer-security-filing-102](https://www.cbp.gov/border-security/ports-entry/cargo-security/importer-security-filing-102) |
| HTS Schedule | [hts.usitc.gov](https://hts.usitc.gov) |
| CBP CROSS Rulings | [rulings.cbp.gov](https://rulings.cbp.gov) |
| Section 301 Tariffs | [ustr.gov/enforcement/section-301-investigations](https://www.ustr.gov/issue-areas/enforcement/section-301-investigations) |
| ADD/CVD Orders | [enforceandprotect.trade.gov](https://enforceandprotect.trade.gov) |
| OFAC SDN Search | [sanctionssearch.ofac.treas.gov](https://sanctionssearch.ofac.treas.gov) |
| BIS Entity List | [bis.doc.gov/parties-of-concern](https://www.bis.doc.gov/index.php/policy-guidance/lists-of-parties-of-concern) |
| SAM.gov Excluded Parties | [sam.gov](https://www.sam.gov) |
| FDA Prior Notice | [fda.gov/food/importing-food/prior-notice](https://www.fda.gov/food/importing-food/prior-notice) |
| USDA APHIS | [aphis.usda.gov/import-export](https://www.aphis.usda.gov/import-export) |
| JAFZA Free Zone | [jafza.ae](https://www.jafza.ae) |
| Dubai Customs | [dubaicustoms.gov.ae](https://www.dubaicustoms.gov.ae) |
| UAE Certificate of Origin | [dubaichamber.com/certificate-of-origin](https://www.dubaichamber.com/services/certificate-of-origin) |

### Key Import Terms

| Term | What It Means |
|---|---|
| **ISF 10+2** | 10 importer + 2 carrier data elements filed 24 hrs before vessel loads at Jebel Ali |
| **HTS Code** | 10-digit product classification code that determines your US duty rate |
| **MFN Rate** | Standard duty duty rate applied to WTO members (including UAE) |
| **Section 301** | Extra US tariff (7.5%–100%) on Chinese-origin goods — applies even via UAE transit |
| **ADD / CVD** | Anti-Dumping / Countervailing Duties on subsidized or below-market-price imports |
| **CBP 3461** | Entry form filed to release cargo from port before full duty assessment |
| **CBP 7501** | Entry Summary — final duty declaration filed within 10 working days of entry |
| **MPF** | Merchandise Processing Fee — 0.3464% of value (min $31.67 / max $614.35) |
| **HMF** | Harbor Maintenance Fee — 0.125% of value on all ocean cargo |
| **IOR** | Importer of Record — entity legally responsible for CBP compliance and duty payment |
| **ACE** | CBP's single digital window for all US import, export and PGA filings |
| **PGA** | Partner Government Agency — FDA, USDA, EPA, CPSC, FCC regulate specific goods |
| **OFAC SDN** | Specially Designated Nationals list — transacting with any listed party is prohibited |
| **JAFZA** | Jebel Ali Free Zone — UAE's largest FTZ; CBP scrutinizes all outbound shipments |
| **COO** | Certificate of Origin — determines tariff treatment and Section 301 applicability |
| **Transshipment** | Routing goods via UAE to hide true origin — triggers CBP enhanced scrutiny |
| **C-TPAT** | CBP trusted trader program — fewer exams, faster clearance for certified importers |
| **CF-28** | CBP Request for Information — issued when CBP needs clarification post-entry |
| **CF-29** | CBP Notice of Action — formal duty change or penalty notice requiring response |
| **Substantial Transformation** | Legal test for UAE origin — goods must be genuinely manufactured, not repackaged |

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Author

Built for the **UiPath Maestro Hackathon** by [Satish](https://rpabotsworld.com)

[![rpabotsworld.com](https://img.shields.io/badge/Blog-rpabotsworld.com-FF6B35?style=for-the-badge)](https://rpabotsworld.com)

---

*Blueprint version: Dubai–USA import, UiPath Maestro, June 2025*
*US Importer of Record role only. UAE exporter obligations (EEI, export license) are out of scope.*