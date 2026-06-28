# Stage 6: Customs Entry Filing & CBP Clearance

This document describes the design, execution steps, data bindings, and audit workflows for **Stage 6: Customs Entry Filing & CBP Clearance**.

---

## 1. Stage Overview

The Customs Entry Filing stage represents the formal submission of customs declarations to US Customs and Border Protection (CBP) using CBP Form 3461 (Immediate Delivery / Entry). This stage coordinates the filing, calculates final duties, and monitors for inspections, physical exams, or regulatory inquiries (CF-28 Request for Information and CF-29 Notice of Action).

*   **Required for Case Completion**: Yes
*   **Stage SLA**: N/A (Dependent on CBP response times)
    *   CBP exam response holds have a **4-hour SLA**.
    *   CF-28 responses have a **5-day internal SLA** (30-day statutory limit).

---

## 2. The All-Clear Convergence Gate

This stage cannot start until the **Convergence Gate** validates that all preliminary compliance checks are complete:

```
 Stage 2 (ISF ACCEPTED) ─────┐
 Stage 3 (HTS Code set) ─────┼──▶ [ Convergence Gate ] ──▶ Stage 6 (Customs Entry Start)
 Stage 5 (OFAC CLEAR) ───────┤
 Stage 4 (PGA CLEAR / N/A) ──┘
```

This prevents formal filing of shipments that are flagged for sanctions risk, lack approved ISF filings, or miss required PGA permits.

---

## 3. Customs Entry Types

The system determines the entry classification based on the shipment value:
1.  **Type 01 (Formal Entry)**: Declared value is **over $2,500**. Requires a continuous or single entry customs bond.
2.  **Type 11 (Informal Entry)**: Declared value is between **$801 and $2,500**.
3.  **Type 86 (Section 321 / De Minimis)**: Declared value is **$800 or under**. Duties and taxes are waived.

---

## 4. Tasks Detail

### Task 6.1: CBP 3461 Form Bot
*   **Type**: `rpa`
*   **Run Only Once**: Yes
*   **Required**: Yes
*   **Description**: Unattended robot that inputs invoice data and HTS classifications into the ACE Broker Portal to compile and submit CBP Form 3461.
*   **Inputs**: `poNumber`, `supplierName`, `totalValueUsd`, `htsCode`, `blNumber`, `portOfEntry`
*   **Outputs**: `entryNumber` (string), `cbpStatus` (initially `"FILED"`)

### Task 6.2: CBP Status Polling Workflow
*   **Type**: `api-workflow`
*   **Run Only Once**: No
*   **Required**: Yes
*   **Description**: Queries the ACE Status Notification API every 2 hours to monitor for clearance decisions or exam flags.
*   **Inputs**: `entryNumber`
*   **Outputs**: `cbpStatus` (e.g. `"EXAM"`, `"RELEASED"`, `"HOLD"`), `examType` (string)

### Task 6.3: Duty Calculation Workflow
*   **Type**: `api-workflow`
*   **Run Only Once**: Yes
*   **Required**: Yes
*   **Entry Condition**: Triggered when `cbpStatus == "RELEASED"`.
*   **Description**: Performs the final duty calculation and generates the CBP Form 7501 (Entry Summary) layout.
*   **Inputs**: `htsCode`, `totalValueUsd`, `dutyRatePct`, `mpfAmount`, `hmfAmount`
*   **Outputs**: `actualDutyUsd`, `dutyVarianceUsd`, `dutyVariancePct`

### Task 6.4: HT-13 CBP Exam Selected
*   **Type**: `action` (Action Center Human Task)
*   **Required**: No (Runs conditionally)
*   **Assignee Persona**: `PortAgent` (coordinating with `CustomsBroker`)
*   **SLA**: 4 hours
*   **Entry Condition**: `=js:vars.cbpStatus == "EXAM"`
*   **Description**: Triggered if CBP selects the container for an inspection. Options include Non-Intrusive Inspection (NII / X-Ray) or Intensive Examination. The port agent coordinates container transfer.
*   **Outputs**: Sets `cbpStatus = "RELEASED"` (if cleared).

### Task 6.5: HT-14 CF-28 Unanswered Questions
*   **Type**: `action` (Action Center Human Task)
*   **Required**: No (Runs conditionally)
*   **Assignee Persona**: `CustomsBroker` (coordinating with `ImporterOps`)
*   **SLA**: 5 days
*   **Entry Condition**: `=js:vars.cbpStatus == "CF-28"`
*   **Description**: Assigned when CBP issues a Form CF-28 (Request for Information) querying HTS codes or value. The broker must compile and upload supporting catalogs/invoices.
*   **Outputs**: Sets `cf28Questions` (updated JSON), returns status to poll.

### Task 6.6: HT-15 CF-29 CBP Action
*   **Type**: `action` (Action Center Human Task)
*   **Required**: No (Runs conditionally)
*   **Assignee Persona**: `CustomsBroker` (coordinating with `LegalCounsel`)
*   **SLA**: 2 days
*   **Entry Condition**: `=js:vars.cbpStatus == "CF-29"`
*   **Description**: Assigned when CBP issues a Form CF-29 (Notice of Action) imposing rate advances or duty adjustments. The broker files protests or pays duty differences.
*   **Outputs**: Sets `cf29ActionType` (string).
