# 🚢 TradeFlowX

### Agentic Import Operations Platform · UAE (Dubai / JAFZA) → USA

[![UiPath Maestro](https://img.shields.io/badge/UiPath-Maestro-FF6B35?style=for-the-badge&logo=uipath&logoColor=white)](https://www.uipath.com/product/maestro)
[![License](https://img.shields.io/badge/License-MIT-00B4D8?style=for-the-badge)](LICENSE)
[![Stage](https://img.shields.io/badge/Stage-Hackathon%20Build-E94560?style=for-the-badge)]()
[![Compliance](https://img.shields.io/badge/Compliance-CBP%20%7C%20OFAC%20%7C%20ISF%2010%2B2-0F3460?style=for-the-badge)]()

---

## Overview

**TradeFlowX** is a fully orchestrated **Agentic Import Operations Platform** that autonomously manages the end-to-end US customs clearance lifecycle for shipments originating from **Dubai and JAFZA (UAE)**.

Built on UiPath Maestro, the platform acts as a **digital Import Operations Manager** — coordinating AI agents, RPA bots, live regulatory APIs, and human reviewers under a single governed workflow.

> **Scope**: US Importer of Record role only. UAE export obligations (EEI, export licenses) are explicitly out of scope.

---

## TradeX Portal Dashboard

The **TradeX Portal** is a Vite + React + TypeScript web application that serves as the central control room for import operations managers. It provides a visual dashboard of active cases, direct database records via the Data Fabric Registry, a dedicated Task Inbox for human-in-the-loop approvals, and a detailed Action History trail.

| Operator Login Page | Main Dashboard Overview |
| :---: | :---: |
| ![Operator Login Page](docs/images/login_page.png) | ![TradeX Portal Main Dashboard](docs/images/dashboard_main.png) |

| Data Fabric Case Details | Action History Page |
| :---: | :---: |
| ![Case Details Panel](docs/images/case_details_view.png) | ![Action History Trail](docs/images/action_history.png) |

| Task Workstation & Approval Inbox |
| :---: |
| ![Action Tasks Workstation](docs/images/task_review_view.png) |

---

## The Problem & Manual Process Today

Importing goods from the UAE (Dubai/JAFZA) to the USA requires complex customs compliance under tight deadlines. Today, this process is highly manual, error-prone, and slow:

*   ⏳ **ISF 10+2 Filing Race**: Brokers manually gather and key in 10+2 data elements under a strict 24-hour pre-loading deadline, risking $5,000–$10,000 penalties for late filings.
*   🔍 **Manual HTS Classification**: Humans manually classify products against the 17,000-code HTSUS schedule, risking misclassification penalties (42% of all CBP penalties) or incorrect duty applications.
*   🚨 **Transshipment & Sanction Risks**: Free Zones like JAFZA introduce high risks of undeclared Chinese/Iranian origin (escaping Section 301 tariffs) and OFAC screening gaps, as manual SDN checks are rarely re-run continuously.
*   🏛️ **Fragmented PGA & Post-Entry Work**: Coordinating Partner Government Agencies (FDA, USDA, FCC) and manually reconciling CBP 7501 entries to ERP is slow and causes demurrage delays.

Traditional task automation cannot solve this. **TradeFlowX orchestrates the entire import clearance operation.**

---

## Architecture

```mermaid
graph TD
    %% Case Initiation
    EmailTrigger[Email Trade Order Trigger] --> S1[Stage 1: Trade Order Intake]
    SFDCTrigger[Salesforce Record Trigger] --> S1
    
    subgraph Stage 1: Intake
        S1 --> POFetch[PO Data Fetch]
        POFetch --> DocCollect[Email Document Collector]
        DocCollect --> COORisk[COO Classification Agent]
        COORisk --> HT01{Missing Fields?}
        HT01 -- Yes --> HT01Task[HT-01: Complete PO Data]
        HT01 -- No --> HT02{Transshipment Risk?}
        HT02 -- Yes --> HT02Task[HT-02: Compliance COO Verification]
        HT02 -- No --> Transition1[Transition Gate]
    end

    %% Parallel Processing Route
    Transition1 --> ParallelStart{Fork Stages}
    
    subgraph Stage 2: ISF 10+2
        ParallelStart --> S2[Stage 2: ISF Filing]
        S2 --> ISFCollect[ISF Data Collector Agent]
        ISFCollect --> ACEFile[ACE ISF Filing Workflow]
        ACEFile --> ACEPoll[ACE ISF Status Poller]
        ACEPoll --> HT04{Do Not Load?}
        HT04 -- Yes --> HT04Task[HT-04: ISF Do Not Load Alert]
        HT04 -- No --> S2Done[ISF Accepted]
    end

    subgraph Stage 3: HTS Classification
        ParallelStart --> S3[Stage 3: HTS & Duty]
        S3 --> IDPPipeline[IDP Document Pipeline]
        IDPPipeline --> HTSAgent[HTS Classification Agent]
        HTSAgent --> ConfGate{Confidence >= 90%?}
        ConfGate -- Yes --> DutyLookup[Duty Rate Lookup]
        ConfGate -- 70-90% --> HT06Task[HT-06: Broker HTS Review]
        ConfGate -- <70% --> HT07Task[HT-07: Specialist Classification]
        HT06Task --> DutyLookup
        HT07Task --> DutyLookup
        DutyLookup --> PGALookup[PGA Flag Workflow]
    end

    subgraph Stage 4: PGA Screening [Conditional]
        PGALookup -- PGA Required --> S4[Stage 4: PGA Screening]
        S4 --> PGACoord[PGA Agency Coordinator]
        PGACoord --> PGAPoll[PGA Status Polling Bot]
        PGAPoll --> S4Done[PGA May Proceed]
    end
    
    subgraph Stage 5: OFAC Screening
        ParallelStart --> S5[Stage 5: OFAC & Denied Party]
        S5 --> PartyExtract[Party Extraction Agent]
        PartyExtract --> TransRisk[Transshipment Risk Agent]
        TransRisk --> OFACAPI[OFAC SDN API Workflow]
        OFACAPI --> MatchGate{Fuzzy Match >= 85%?}
        MatchGate -- Yes --> HT11Task[HT-11: OFAC Fuzzy Match Review]
        MatchGate -- No --> S5Done[OFAC Cleared]
        HT11Task --> S5Done
    end

    %% Synchronization
    S2Done --> MergeGate{All Clear Merge Gate}
    PGALookup -- No PGA --> MergeGate
    S4Done --> MergeGate
    S5Done --> MergeGate

    subgraph Stage 6: Customs Entry
        MergeGate --> S6[Stage 6: Customs Entry Filing]
        S6 --> CBP3461[CBP 3461 Form Bot]
        CBP3461 --> CBPPoll[CBP Status Polling]
        CBPPoll --> DutyCalc[Duty Calculation Workflow]
        DutyCalc --> S6Done[CBP Released]
    end

    subgraph Stage 7: Post-Entry
        S6Done --> S7[Stage 7: Post-Entry Reconciliation]
        S7 --> DMSArchive[DMS Archive Workflow]
        DMSArchive --> ERPLand[ERP Landed Cost Workflow]
        ERPLand --> SavingsAgent[Duty Savings Analysis Agent]
        SavingsAgent --> CaseClose[Case Closed]
    end
```

---

## Workflow Stages

TradeFlowX manages the end-to-end import lifecycle across seven governed stages inside a single case:

1.  **Stage 1 — Trade Order Intake:** Captures PO data from ERP, email, or EDI; validates fields; flags JAFZA transshipment risk and creates the case.
2.  **Stage 2 — ISF 10+2 Filing:** Gathers all 10 importer elements and files with CBP via the ACE API within 24 hours of vessel departure.
3.  **Stage 3 — HTS Classification:** AI classification agent queries the tariff schedule and CBP CROSS rulings to determine HTS-10 codes and duty rates.
4.  **Stage 4 — PGA Agency Screening (Conditional):** Submits PGA message sets (FDA, USDA, FCC, etc.) to ACE and tracks approval status.
5.  **Stage 5 — OFAC & Denied-Party Screening:** Fuzzy-screens suppliers, forwarders, banks, and vessels against sanctions lists (SDN, BIS, SAM.gov).
6.  **Stage 6 — Customs Entry Filing:** Calculates fees, prepares and submits CBP Form 3461 via ACE, and coordinates port release.
7.  **Stage 7 — Post-Entry Reconciliation:** Audits documents via Document Understanding, posts landed costs to ERP, and flags drawback opportunities.

---

## Coded Agents

> ✅ This project uses UiPath coded agents — eligible for judging bonus points.

TradeFlowX deploys **five coded agents** handling distinct compliance domains:

*   **HTS Classification Agent** (LangGraph) — queries the USITC tariff schedule via RAG and scores HTS candidates by confidence.
*   **Transshipment Risk Agent** (LangGraph) — stateful six-node graph that suspends at human checkpoints and resumes on broker approval.
*   **Duty Savings Agent** (LangGraph) — post-entry analysis for First-Sale Valuation and Duty Drawback opportunities.
*   **COO Classifier Agent** (UiPath low-code) — evaluates 13 shipment variables to determine UAE origin and flag transshipment risk.
*   **OFAC Screening Agent** (UiPath low-code) — fuzzy-matches all trade parties against OFAC SDN, BIS Entity List, and SAM.gov.

---

## How AI Helped Us Build Faster

**Claude** was our primary coding partner throughout the build. Using Claude Code with UiPath-specific skills, it authored the entire Maestro case plan, wired all 19 automation tasks and 18 human tasks, scaffolded the coded RPA processes in C#, and handled every deployment cycle — validate, pack, publish, deploy — from the terminal. When something wasn't triggering, Claude diagnosed the structural defect and fixed it. What would have taken days of documentation-reading and trial-and-error became hours.

The **UiPath TypeScript SDK** powered the frontend human task forms. Claude used it to wire all 18 approval forms directly to Maestro Action Center with no backend required — a pattern that kept the entire portal as a single deployable app.

**Gemini** handled trade compliance research — mapping HTS chapters to PGA agencies, compiling ISF 10+2 filing requirements, and drafting CBP query response language for the human review forms. It gave us accurate regulatory content fast, without us having to read through CFR chapters manually.

The split was clean: Gemini for domain knowledge, Claude for building. Together they let a small team deliver a production-grade, seven-stage import compliance platform in hackathon time.

---

## Maestro Parallel Execution Model

```mermaid
graph TD
    %% Define Nodes
    S1["Stage 1: Trade Order Intake"]
    S2["Stage 2: ISF 10+2 Filing"]
    S3["Stage 3: HTS Classification & Duty"]
    S4["Stage 4: PGA Screening (Conditional)"]
    S5["Stage 5: OFAC & Denied-Party Screening"]
    S6["Stage 6: Customs Entry Filing & CBP Clearance"]
    S7["Stage 7: Document Management & Post-Entry"]

    %% Define Case Entry
    Start([Case Entered]) --> S1

    %% Parallel Forking after S1 completion
    S1 --> S2
    S1 --> S3
    S1 --> S5

    %% Conditional PGA Screening after HTS/Duty Stage
    S3 -->|pgaFlag == true| S4

    %% All-Clear Convergence Gate
    S2 -->|isfStatus == 'ACCEPTED'| Gate{All-Clear Merge Gate}
    S3 -->|pgaFlag == false| Gate
    S4 -->|pgaStatus == 'MAY_PROCEED'| Gate
    S5 -->|ofacClearStatus == 'CLEAR'| Gate

    %% Post-Gate Transition
    Gate --> S6
    
    %% Final Transition
    S6 -->|cbpStatus == 'RELEASED'| S7
    S7 -->|Complete| End([Case Closed])

    %% Styling
    classDef default fill:#F8FAFC,stroke:#E2E8F0,stroke-width:1px,color:#0F172A;
    classDef stage fill:#EFF6FF,stroke:#3B82F6,stroke-width:2px,color:#1E3A8A;
    classDef gate fill:#F5F3FF,stroke:#8B5CF6,stroke-width:2px,color:#4C1D95;
    classDef event fill:#ECFDF5,stroke:#10B981,stroke-width:2px,color:#064E3B;
    
    class S1,S2,S3,S4,S5,S6,S7 stage;
    class Gate gate;
    class Start,End event;
```

---

## Challenges we ran into

*   **Transshipment Complexity:** JAFZA is a UAE free zone — goods manufactured in China but re-exported through JAFZA may or may not qualify as UAE-origin. Resolving this required building a COO Classifier Agent with 13 injected variables to assess "substantial transformation" rather than relying on a static dropdown.
*   **Parallel Stage Sync with Merge Gates:** Coordinating stages 2, 3, and 5 to run in parallel and ensuring Stage 6 does not open until all three are cleared was a complex design challenge. We structured the Maestro case plan so that gate logic is dynamically enforced without creating deadlocks or race conditions.
*   **Accurate SLA Timer Anchoring:** The ISF must be filed 24 hours before vessel loading at Jebel Ali (not before US arrival). Maestro's SLA timer is anchored directly to the vessel departure event sourced from freight forwarder notifications.
*   **Unified Human Task Form Registry:** All 18 forms were successfully packaged inside one Coded Web App without requiring a backend, using a clean registry pattern to handle operations ranging from document uploads to financial data entry and legal escalations.

---

## Accomplishments that we're proud of

*   **End-to-end coverage:** Seven stages, 18 human tasks, full SLA enforcement, and documented integration points for every external system — this is not a demo workflow; it is a production-grade blueprint with task-level automation specs.
*   **True parallel orchestration:** ISF filing, HTS classification, and OFAC screening run simultaneously from case creation — not sequentially — which mirrors how a real customs broker team operates and saves 12–24 hours on a typical clearance timeline.
*   **COO Classifier Agent architecture:** A fully wired `agent.json` with 29 `contentTokens` blocks and 13 runtime-injected variables handling the UAE transshipment / substantial transformation determination — one of the hardest compliance judgments in US import law.
*   **Single-app HT form architecture:** All 18 human-task forms delivered inside one Coded Web App with a clean registry pattern — demonstrating that Maestro human tasks do not require a proliferation of separate deployments.
*   **Compliance depth:** Section 301 tariffs, ADD/CVD, MPF/HMF, ISF 10+2, OFAC SDN, BIS Entity List, PGA message sets, CF-28/CF-29, CBP 7501, duty drawback, first-sale valuation — every relevant US import compliance requirement is modeled as a task or decision gate in the platform.

---

## What we learned

*   **Maestro case plans are the right abstraction for multi-stage import workflows:** The stage-group / task / human-task / SLA-timer model maps almost perfectly to how customs clearance actually works — with parallel tracks, merge gates, and role-based human intervention.
*   **LangGraph's `interrupt()` pattern is the correct primitive for human-in-the-loop AI agents:** Suspending agent state at a decision point, surfacing a task in Maestro Action Center, and resuming the graph on approval is exactly the handshake that enterprise agentic workflows need.
*   **Country-of-origin determination cannot be a rule — it must be an agent decision:** The UAE transshipment / JAFZA scenario involves too many variables (supplier type, product category, manufacturing evidence, certificate text) to encode as a lookup table. LLM-based COO classification with confidence scoring is the correct approach.
*   **UiPath Coded Apps architecture decisions matter early:** The single-app / no-backend constraint had to be established before writing any component code — it fundamentally shapes how `Tasks.complete()` is called and how the form registry is structured.

---

## What's next for TradeFlowX

*   **Live ACE API Integration** — Move from modeled integration to live CBP ACE API calls in a CBP certification environment.
*   **TMS Connector** — Direct integrations with major freight forwarder Transportation Management Systems (e.g., Descartes, CargoWise).
*   **Real-time Vessel Tracking** — Ingest live AIS vessel positioning to dynamically update ETA and departure alerts.
*   **Predictive Exam Selection** — AI model to analyze HTS and supplier combinations to predict the probability of a CBP physical examination.
*   **Global Expansion** — Extend the compliance guidelines and rulesets to additional trade corridors such as India → USA and China → USA.

---

## Reference Guides & Technical Data

All raw schemas, case headers, SLA lists, tech stack breakdowns, and compliance reference terms have been moved to dedicated specification documents:

*   📘 **[Detailed Reference Tables & Compliance Specs](docs/reference_tables.md)** (Human Task Matrix, SLA Timers, Tech Stack APIs, Case Fields, Regulatory Terms)
*   📘 **[System Getting Started Guide](docs/getting_started.md)** (Deployment commands, local setup, run configurations)
*   📘 **[Architecture Guide](docs/architecture.md)** (Deep-dive on Maestro state-machine flow and integration topologies)
*   📘 **[Publishing & Deployment Guide](docs/publishing_and_deployment.md)** (UiPath solution syncing, packing, and staging commands)

---

## License & Author

MIT License — see [LICENSE](LICENSE) for details.

Built for the **UiPath Maestro Hackathon** by [Satish](https://rpabotsworld.com) ([rpabotsworld.com](https://rpabotsworld.com))