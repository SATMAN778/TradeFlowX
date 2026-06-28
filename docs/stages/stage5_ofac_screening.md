# Stage 5: OFAC & Denied-Party Screening

This document describes the design, execution steps, data bindings, and compliance thresholds for **Stage 5: OFAC & Denied-Party Screening**.

---

## 1. Stage Overview

All entities involved in a US import transaction must be screened against denied-party, debarred, and sanctioned entity lists. Given the proximity of Dubai and JAFZA to heavily sanctioned regions, this screening is highly critical. The stage extracts all parties from invoices and shipping documents, runs fuzzy name-matching against the Office of Foreign Assets Control (OFAC) SDN list, and handles escalations.

*   **Required for Case Completion**: Yes
*   **Stage SLA**: N/A (Parallel execution with Stage 2 and 3)
    *   Fuzzy match human reviews have a **2-hour SLA**.
    *   Exact match hits trigger an **immediate** case block.

---

## 2. Stage Entry & Exit Conditions

### Entry Condition
Starts immediately in parallel with Stage 2 and 3 after the intake stage finishes.
*   **Trigger**: `selected-stage-completed("Trade Order Intake")`

### Exit Condition
The stage completes when all parties are verified as cleared.
*   **Rule**: `required-tasks-completed` (Exit Type: `exit-only`)
*   **Case Gate Variable**: `ofacClearStatus == "CLEAR"`

---

## 3. Parties & Sanction Lists Screened

The **Party Extraction Agent** pulls the names and addresses of all involved parties, including:
1.  **UAE Exporter / Supplier**
2.  **Original Manufacturer**
3.  **Freight Forwarder / NVOCC**
4.  **Ocean Shipping Line / Carrier**
5.  **Notify Party** (recipient of arrival notice)
6.  **Beneficial Owners** (if declared)

### Checked Lists:
*   **OFAC SDN List** (Specially Designated Nationals).
*   **BIS Entity List** and **Denied Persons List** (Bureau of Industry and Security).
*   **State Department AECA Debarred List**.
*   **SAM.gov EPLS** (Excluded Parties List System).

---

## 4. Tasks Detail

### Task 5.1: Party Extraction Agent
*   **Type**: `agent`
*   **Run Only Once**: Yes
*   **Required**: Yes
*   **Description**: Analyzes the packing list, commercial invoice, and bill of lading using NLP to compile a complete list of party names and addresses.
*   **Inputs**: `documentList`
*   **Outputs**: `partyNames` (JSON array of names)

### Task 5.2: Transshipment Risk Agent
*   **Type**: `agent`
*   **Run Only Once**: Yes
*   **Required**: Yes
*   **Description**: Refines the transshipment assessment from Stage 1. It checks the shipping line routing and transshipment hubs (e.g. tracking JAFZA shipping patterns) for potential trade circumvention.
*   **Inputs**: `supplierCountry`, `portOfLoading`, `partyNames`
*   **Outputs**: `transshipmentRisk` (updated rating)

### Task 5.3: OFAC SDN API Workflow
*   **Type**: `api-workflow`
*   **Run Only Once**: Yes
*   **Required**: Yes
*   **Entry Condition**: Executes after Task 5.1 and 5.2 complete.
*   **Description**: Sends the list of compiled party names to the OFAC SDN lookup endpoint, returning fuzzy-match scores (0–100).
*   **Inputs**: `partyNames`
*   **Outputs**: `ofacScreeningResults` (JSON), `ofacMatchScore` (float), `ofacClearStatus` (string, initially `"PENDING"`)

### Task 5.4: HT-11 OFAC Fuzzy Match
*   **Type**: `action` (Action Center Human Task)
*   **Required**: No (Runs conditionally)
*   **Assignee Persona**: `ComplianceOfficer`
*   **SLA**: 2 hours
*   **Entry Condition**: `=js:vars.ofacMatchScore >= 85 && vars.ofacMatchScore < 100`
*   **Description**: Assigned to a Compliance Officer if a party name has a high-scoring fuzzy match on a sanctioned list. The officer reviews name variations, addresses, and passports.
*   **Outputs**: Sets `ofacClearStatus = "CLEAR"` (if false positive) or escalates to exact hit.

### Task 5.5: HT-12 Confirmed OFAC Hit
*   **Type**: `action` (Action Center Human Task)
*   **Required**: No (Runs conditionally)
*   **Assignee Persona**: `ComplianceOfficer` (coordinating with `LegalCounsel` and Management)
*   **SLA**: **Immediate** (High Priority)
*   **Entry Condition**: `=js:vars.ofacMatchScore == 100` or `=js:vars.ofacClearStatus == "CONFIRMED_HIT"`
*   **Description**: Lockout task triggered if a party is confirmed on a sanctions list. The case is blocked, and the compliance officer must coordinate block procedures with banks and port authorities.
*   **Outputs**: Sets `caseState = "SANCTION_BLOCK"`.

---

## 5. Compliance Threshold Action Matrix

| Score Range | Action | Status Variable Set |
|---|---|---|
| **Under 85% Match** | Auto-clear and log in database. | `ofacClearStatus = "CLEAR"` |
| **85% - 99.9% Match** | Route to Compliance Officer for manual audit (**HT-11**). | `ofacClearStatus = "FUZZY_MATCH"` |
| **100% Match** | Block case immediately; assign warning task (**HT-12**). | `ofacClearStatus = "CONFIRMED_HIT"` |
