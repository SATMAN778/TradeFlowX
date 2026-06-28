# Stage 3: HTS Classification & Duty

This document describes the design, execution steps, data bindings, and business logic for **Stage 3: HTS Classification & Duty**.

---

## 1. Stage Overview

Correct Harmonized Tariff Schedule (HTS) classification determines the import duty, fees, and regulatory requirements (such as PGA restrictions) for incoming cargo. This stage uses Intelligent Document Processing (IDP) to extract product descriptions and invoice details, queries a LangGraph-based AI Classification Agent, retrieves rates from the USITC Tariff API, and evaluates Partner Government Agency (PGA) flags.

*   **Required for Case Completion**: Yes
*   **Stage SLA**: 8 hours
    *   **At-Risk**: Triggered at 75% (6 hours) → Notify `ClassificationSpecialist` Team.
    *   **Breached**: Triggered at 100% (8 hours) → Notify `Trade Operations Manager`.

---

## 2. Stage Entry & Exit Conditions

### Entry Condition
Starts after the ISF filing is successfully accepted by CBP.
*   **Trigger**: `selected-stage-completed("ISF 10+2 Filing")`
*   **Condition**: `=js:vars.isfStatus == "ACCEPTED"`

### Exit Condition
The stage completes and transitions when classification and duty details are finalized.
*   **Rule**: `required-tasks-completed` (Exit Type: `exit-only`)
*   **Case Gate Variable**: `htsCode != ""`

---

## 3. LangGraph HTS Agent Routing Gate

The system employs a confidence-based routing model for HTS classification:

```
        HTS Classification Agent Output
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
    [Confidence Gate]     [Confidence < 70%] ──▶ HT-07: Specialist Classify
             │
      ┌──────┴──────┐
      ▼             ▼
  [>= 90%]       [70% - 89%]
Auto-Approve   HT-06: Broker Review
```

1.  **Auto-Approval (Confidence >= 90%)**: The system automatically accepts the top candidate HTS code and passes it directly to USITC duty lookup.
2.  **Broker Review (HT-06) (Confidence 70%–89%)**: Assigned to a Customs Broker to confirm the AI recommendation or select from the top 3 candidates.
3.  **Specialist Classification (HT-07) (Confidence < 70%)**: Routed directly to a Classification Specialist to classify the product from scratch.

---

## 4. Tasks Detail

### Task 3.1: IDP Document Pipeline
*   **Type**: `rpa`
*   **Run Only Once**: Yes
*   **Required**: Yes
*   **Description**: Unattended robot running UiPath Document Understanding against invoices and packing lists. It extracts product descriptions, part numbers, and quantities.
*   **Inputs**: `documentList`, `poNumber`
*   **Outputs**: `extractedFields`, `goodsDescription`

### Task 3.2: HTS Classification Agent
*   **Type**: `agent`
*   **Run Only Once**: Yes
*   **Required**: Yes
*   **Entry Condition**: Executes after Task 3.1 completes.
*   **Description**: A LangGraph AI Agent that takes the extracted `goodsDescription` and matches it against historical filings, USITC sections, and CBP CROSS (Customs Rulings Online Search System) records.
*   **Inputs**: `goodsDescription`, `supplierCountry`, `totalValueUsd`
*   **Outputs**: `htsCandidates` (JSON list of top 3), `htsCode` (top candidate), `htsConfidence` (score 0–100)

### Task 3.3: Duty Rate Lookup Workflow
*   **Type**: `api-workflow`
*   **Run Only Once**: Yes
*   **Required**: Yes
*   **Entry Condition**: Triggered when `htsConfidence >= 90` (either directly from Task 3.2 or after HT-06/HT-07 completions).
*   **Description**: Calls the USITC API to retrieve active duty rates (MFN, Section 301, ADD/CVD) and calculates fees.
*   **Inputs**: `htsCode`, `totalValueUsd`, `supplierCountry`
*   **Outputs**: `dutyRatePct`, `dutyAmountUsd`, `mpfAmount`, `hmfAmount`, sets `estimatedDutyUsd = vars.dutyAmountUsd`.

### Task 3.4: PGA Flag Workflow
*   **Type**: `api-workflow`
*   **Run Only Once**: Yes
*   **Required**: Yes
*   **Entry Condition**: Triggered when `htsConfidence >= 90`.
*   **Description**: Evaluates whether the classified HTS code requires Partner Government Agency (PGA) clearance.
*   **Inputs**: `htsCode`, `goodsDescription`
*   **Outputs**: `pgaFlag` (boolean), `pgaAgencies` (JSON array of agencies like FDA, USDA, EPA).

### Task 3.5: HT-06 HTS Review 70-90%
*   **Type**: `action` (Action Center Human Task)
*   **Required**: No (Runs conditionally)
*   **Assignee Persona**: `CustomsBroker`
*   **SLA**: 4 hours
*   **Entry Condition**: `=js:vars.htsConfidence >= 70 && vars.htsConfidence < 90`
*   **Description**: Displays the top 3 AI candidates with ruling citations for the broker to verify or override.
*   **Outputs**: `ConfirmedHtsCode`, sets `htsConfidence = 95` (which triggers USITC and PGA workflows).

### Task 3.6: HT-07 Manual HTS Classification
*   **Type**: `action` (Action Center Human Task)
*   **Required**: No (Runs conditionally)
*   **Assignee Persona**: `ClassificationSpecialist`
*   **SLA**: 8 hours
*   **Entry Condition**: `=js:vars.htsConfidence < 70`
*   **Description**: Task to manually research and input the correct 10-digit HTS code when the AI agent cannot provide a high-confidence match.
*   **Outputs**: `ManualHtsCode`, sets `htsConfidence = 100`.

### Task 3.7: HT-08 PGA Documentation Required
*   **Type**: `action` (Action Center Human Task)
*   **Required**: No (Runs conditionally)
*   **Assignee Persona**: `ComplianceOfficer`
*   **SLA**: 24 hours
*   **Entry Condition**: `=js:vars.pgaFlag == true`
*   **Description**: Prompts the compliance officer to upload the required certificates (e.g. FDA facility numbers, USDA certificates) into the storage bucket.
*   **Outputs**: Sets `pgaStatus` to `"DOCUMENTS_PREPARED"`.

---

## 5. Duty Components Formula

*   **MFN Duty**: `totalValueUsd * MFN_Rate`
*   **Section 301 Surcharge**: Applied if the Country of Origin is China (7.5% to 25%).
*   **Merchandise Processing Fee (MPF)**: `totalValueUsd * 0.003464` (Ocean formal entry: min $31.67, max $614.35).
*   **Harbor Maintenance Fee (HMF)**: `totalValueUsd * 0.00125` (ocean shipments).
