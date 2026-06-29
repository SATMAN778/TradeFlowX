# System Architecture: TradeFlowX

TradeFlowX is a regulated **Agentic Import Operations Platform** designed to manage and orchestrate the full customs clearance lifecycle for imports from Dubai/JAFZA (UAE) to the USA. 

The platform bridges the gap between structured business processes, automated RPA bots, external regulatory APIs, human decision-makers, and autonomous AI agents.

---

## Technical Stack Overview

The platform uses a layered, multi-technology architecture designed for enterprise-grade compliance, auditability, and speed:

| Layer | Component / Tool | Purpose |
|---|---|---|
| **Orchestration** | **UiPath Maestro Case App** | Manages stage transitions, case variables, SLA timers, and parallel execution path orchestration. |
| **User Interface** | **TradeX Portal (Vite/TS Coded App)** | Provides operational dashboards, case header details, and interface views for human operators. |
| **Human Validation** | **UiPath Action Center** | Renders specialized tasks (forms) for compliance, custom brokers, and managers with SLA tracking. |
| **Intelligent Agents** | **LangGraph AI Agents** | Executes complex, non-deterministic tasks (HTS classification, transshipment risk analysis, and duty savings identification). |
| **Data Extraction** | **UiPath Document Understanding** | Extracts structured fields from commercial invoices, bills of lading, and packing lists. |
| **System Operations** | **UiPath Unattended Robots** | Handles browser-based automation on government portals (ACE) and ERP data entry. |
| **Regulatory APIs** | **CBP ACE, USITC, OFAC SDN** | Queries live regulatory and compliance endpoints. |

---

## Architectural Flow Diagram

The following Mermaid diagram shows the lifecycle of a single import shipment case in the system:

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

## Parallel Execution & Sync Model

The platform leverages UiPath Maestro's capability to run stages concurrently. S2 (ISF Filing), S3 (HTS Classification), and S5 (OFAC Screening) kick off immediately following S1 completion.

### The Merge Gate (Convergence Gate)
Stage 6 (Customs Entry Filing) is locked until the following conditions are met:
1.  **ISF 10+2 is Filed & Accepted**: `isfStatus == "ACCEPTED"` (Stage 2 complete).
2.  **HTS Classification is Finalized**: `htsCode != ""` (Stage 3 complete).
3.  **OFAC Screening is Cleared**: `ofacClearStatus == "CLEAR"` (Stage 5 complete).
4.  **PGA Screening is Complete (If Required)**: `pgaStatus == "MAY_PROCEED"` or `pgaFlag == false` (Stage 4 complete or skipped).

This prevents premature customs entry submissions, which are highly regulated and difficult to amend without incurring audits or penalties.

---

## Component Integration Patterns

### 1. LangGraph AI Agents
The three AI agents reside in their respective subdirectories (`03_Agent_HTSClassifier_LangGraph`, `01_Agent_TransshipmentRisk_LangGraph`, `07_Agent_DutySavings_LangGraph`). They are structured using the LangGraph library to maintain state and handle complex branching:
*   **Input/Output Binding**: Triggered via API Workflow tasks that pass JSON parameters and write outputs back into Maestro Case Variables.
*   **State Persistence**: Enables recovery if an LLM call fails or a connection times out.

### 2. TradeX Portal (Coded Web App)
A client-facing web application that queries the active case state. It communicates with Maestro via the `@uipath/uipath-typescript` SDK:
*   **Action Schema (`action-schema.json`)**: Configures custom action-cards for human operators.
*   **Orchestration Bindings**: Map parameters directly into the case workspace for direct dashboard updates.

### 3. Integration Service Connectors
Abstracts standard authentication mechanisms for:
*   **Microsoft Outlook 365**: Listens for intake emails.
*   **Salesforce**: Listens for object creation events.
*   **USITC and OFAC**: Reusable connection models mapped in `bindings_v2.json` to handle API rate-limiting and access token renewal automatically.
