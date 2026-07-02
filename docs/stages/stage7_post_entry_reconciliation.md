# Stage 7: Document Management & Post-Entry

This document describes the design, execution steps, data bindings, and business logic for **Stage 7: Document Management & Post-Entry**.

---

## 1. Stage Overview

After cargo release, the post-entry stage completes the transaction lifecycle. It ensures that all customs forms, entry summaries, permits, and commercial invoices are permanently archived to meet statutory recordkeeping requirements. It reconciles estimated duties against actual assessed rates in the corporate ERP, and runs an AI Agent to identify potential post-entry savings (such as duty drawbacks or first-sale valuation programs).

*   **Required for Case Completion**: Yes
*   **Stage SLA**: N/A
    *   Document discrepancies are resolved within a **4-hour SLA**.
    *   Duty variance reviews have a **2-day SLA**.
    *   Duty savings opportunities are audited within a **5-day SLA**.

---

## 2. Stage Entry & Exit Conditions

### Entry Condition
Starts immediately after the shipment is released by CBP in Stage 6.
*   **Trigger**: `selected-stage-completed("Customs Entry Filing & CBP Clearance")`
*   **Condition**: `=js:vars.cbpStatus == "RELEASED"`

### Exit Condition
The case is closed and archived upon completion of all post-entry check tasks.
*   **Rule**: `required-tasks-completed` (Exit Type: `exit-only`)
*   **Case Gate Variable**: `caseState == "CLOSED"`

---

## 3. Document Archival Checklist & Retention Rules

Per CBP (19 CFR Part 163) and OFAC regulations, all documentation must be stored securely. The **DMS Archive Workflow** compiles the following package:
1.  **Commercial Invoice** (Original from supplier)
2.  **Packing List**
3.  **Bill of Lading** (Ocean/Air waybill)
4.  **Certificate of Origin** (UAE Chamber of Commerce)
5.  **ISF 10+2 Filing Confirmation**
6.  **PGA Permits & Authorizations** (if applicable)
7.  **OFAC screening audit records**
8.  **CBP Form 3461** (Cargo Release)
9.  **CBP Form 7501** (Entry Summary)

### Statutory Retention Timelines:
*   **Standard Entries**: 5 years from date of entry.
*   **Anti-Dumping / Countervailing Duty (ADD/CVD) Entries**: 7 years from date of liquidation.

---

## 4. Tasks Detail

### Task 7.1: DMS Archive Workflow
*   **Type**: `rpa`
*   **Run Only Once**: Yes
*   **Required**: Yes
*   **Description**: Unattended robot that retrieves all documents from the `ShipmentDocuments` Storage Bucket, zips them with an audit trail log, and uploads them to the corporate Document Management System (e.g. SharePoint, OpenText).
*   **Inputs**: `documentList`, `poNumber`, `entryNumber`
*   **Outputs**: `archivalStatus` (sets to `"COMPLETED"`)

### Task 7.2: ERP Landed Cost Workflow
*   **Type**: `rpa`
*   **Run Only Once**: Yes
*   **Required**: Yes
*   **Description**: Connects to the corporate ERP API to post the final customs duties, processing fees, and broker charges, updating the unit landed cost of the items.
*   **Inputs**: `poNumber`, `actualDutyUsd`, `mpfAmount`, `hmfAmount`
*   **Outputs**: `landedCostPosted` (boolean)

### Task 7.3: Duty Savings Analysis Agent
*   **Type**: `agent`
*   **Run Only Once**: Yes
*   **Required**: Yes
*   **Description**: A specialized Python Agent (`duty-savings-agent`) that reviews the case. It evaluates whether the transaction is eligible for duty drawback (re-exportation), first-sale valuation (using the lower manufacturer-to-middleman price instead of UAE middleman-to-US price), or tariff reductions.
*   **Inputs**: `htsCode`, `supplierCountry`, `totalValueUsd`, `actualDutyUsd`
*   **Outputs**: `dutySavingsOpportunity` (string), `estimatedSavingsUsd` (float)

### Task 7.4: HT-16 Document Discrepancy
*   **Type**: `action` (Action Center Human Task)
*   **Required**: No (Runs conditionally)
*   **Assignee Persona**: `ImporterOps`
*   **SLA**: 4 hours
*   **Entry Condition**: `=js:vars.documentationComplete == false`
*   **Description**: Assigned to Importer Ops if required documents (such as CBP 7501 or the UAE Certificate of Origin) are missing or fail signature checks.
*   **Outputs**: Sets `documentationComplete = true`.

### Task 7.5: HT-17 Duty Variance Review
*   **Type**: `action` (Action Center Human Task)
*   **Required**: No (Runs conditionally)
*   **Assignee Persona**: `Finance` (coordinating with `CustomsBroker`)
*   **SLA**: 2 days
*   **Entry Condition**: `=js:vars.dutyVariancePct > 5.0`
*   **Description**: Assigned to a finance auditor if the actual duties assessed by CBP deviate by more than 5% from the initial estimated duties calculated in Stage 3.
*   **Outputs**: Sets `caseState = "CLOSED"` (if accepted) or routes to protest.

### Task 7.6: HT-18 Duty Savings Opportunity
*   **Type**: `action` (Action Center Human Task)
*   **Required**: No (Runs conditionally)
*   **Assignee Persona**: `TradeCounsel`
*   **SLA**: 5 days
*   **Entry Condition**: `=js:vars.estimatedSavingsUsd > 1000`
*   **Description**: Triggered when the Duty Savings Agent flags an opportunity of over $1,000. Trade counsel reviews details to file for a duty drawback claim or implement first-sale valuation for future shipments.
*   **Outputs**: Sets `caseState = "CLOSED"`.
