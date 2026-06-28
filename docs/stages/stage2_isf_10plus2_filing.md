# Stage 2: ISF 10+2 Filing

This document describes the design, execution steps, data bindings, and compliance requirements for **Stage 2: ISF 10+2 Filing**.

---

## 1. Stage Overview

The Importer Security Filing (ISF), commonly known as "10+2", is a US Customs and Border Protection (CBP) regulation. It requires importers to submit 10 key data elements, and carriers to submit 2 elements, at least **24 hours before cargo is loaded** onto a vessel bound for the United States. 

Missing this deadline triggers a minimum $5,000 fine per violation and a potential "Do Not Load" order at the port of departure (e.g., Jebel Ali, Dubai).

*   **Required for Case Completion**: Yes
*   **Stage SLA**: 24 hours
    *   **At-Risk**: Triggered at 60% (14.4 hours) → Notify `CustomsBroker` Team.
    *   **Breached**: Triggered at 100% (24 hours) → Notify `Trade Operations Manager` (ISF regulatory deadline at risk).

---

## 2. Stage Entry & Exit Conditions

### Entry Condition
The stage starts automatically upon the completion of the intake stage.
*   **Trigger**: `selected-stage-completed("Trade Order Intake")`

### Exit Condition
The stage completes and transitions when all required tasks are finished and the ISF is approved.
*   **Rule**: `required-tasks-completed` (Exit Type: `exit-only`)
*   **Case Gate Variable**: `isfStatus == "ACCEPTED"`

---

## 3. The 10 Importer Data Elements

The system compiles and validates the following 10 fields:
1.  **Seller**: Supplier Name & Address (from `=vars.supplierName` and `=vars.supplierAddress`).
2.  **Buyer**: Importer of Record Corporate Name & Address.
3.  **Importer of Record Number**: Corporate IRS or EIN tax identification number.
4.  **Consignee Number(s)**: CBP Importer Number.
5.  **Manufacturer (or Supplier)**: Extracted Supplier details.
6.  **Ship-to Party**: Name & Address of delivery location in the US.
7.  **Country of Origin**: Cargo country of origin (from `=vars.cooDeclaration` / `=vars.supplierCountry`).
8.  **Harmonized Tariff Schedule (HTS) Number**: 6-digit HTS code (from `=vars.htsCode`).
9.  **Container Stuffing Location**: Place where container was packed.
10. **Consolidator (Stuffer)**: Freight forwarder warehouse details.

---

## 4. Tasks Detail

### Task 2.1: ISF Data Collector Agent
*   **Type**: `agent`
*   **Run Only Once**: Yes
*   **Required**: Yes
*   **Description**: Analyzes available PO data, invoice records, and shipping instructions to pre-populate the 10 ISF fields. It also sets the `isfDeadlineUtc` timestamp based on vessel ETA.
*   **Inputs**: `poNumber`, `supplierName`, `supplierAddress`, `blNumber`, `portOfLoading`, `portOfEntry`, `documentList`
*   **Outputs**: `isfDataComplete` (boolean), `isfDeadlineUtc` (string)

### Task 2.2: ACE ISF Filing Workflow
*   **Type**: `api-workflow`
*   **Run Only Once**: Yes
*   **Required**: Yes
*   **Entry Condition**: `=js:vars.isfDataComplete == true`
*   **Description**: Directly interfaces with the CBP Automated Commercial Environment (ACE) API to file the electronic 10+2 document.
*   **Inputs**: `poNumber`, `isfDeadlineUtc`
*   **Outputs**: `isfTxnNumber` (string), `isfStatus` (string, initially set to `"SUBMITTED"`)

### Task 2.3: ACE ISF Status Poller
*   **Type**: `rpa`
*   **Run Only Once**: No
*   **Required**: Yes
*   **Entry Condition**: Executes after Task 2.2 completes.
*   **Description**: An unattended robot that logs into the ACE Portal or monitors API status updates to retrieve filing results. Runs periodically until status changes to `"ACCEPTED"` or `"DO_NOT_LOAD"`.
*   **Inputs**: `isfTxnNumber`
*   **Outputs**: `isfStatus`, `isfAmendmentRequired` (boolean)

### Task 2.4: HT-03 Missing ISF Elements
*   **Type**: `action` (Action Center Human Task)
*   **Required**: No (Runs conditionally)
*   **Assignee Persona**: `CustomsBroker`
*   **SLA**: 4 hours
*   **Entry Condition**: `=js:vars.isfDataComplete == false`
*   **Description**: Assigned to a Customs Broker if the agent is unable to resolve all 10 fields automatically. Shows a real-time countdown to the vessel departure deadline.
*   **Outputs**: `isfCollectionOutcome`, sets `isfDataComplete = true`.

### Task 2.5: HT-04 ISF Do Not Load
*   **Type**: `action` (Action Center Human Task)
*   **Required**: No (Runs conditionally)
*   **Assignee Persona**: `CustomsBroker` (coordinating with `LegalCounsel`)
*   **SLA**: 1 hour (Urgent)
*   **Entry Condition**: `=js:vars.isfStatus == "DO_NOT_LOAD"`
*   **Description**: Full-screen emergency alert triggered if CBP issues a Do Not Load order. The broker must immediately correct data errors or hold the container at Jebel Ali.
*   **Outputs**: `isfDoNotLoadOutcome` (e.g. `"CorrectedAndResubmitted"`, `"HoldShipment"`).

### Task 2.6: HT-05 ISF Material Amendment
*   **Type**: `action` (Action Center Human Task)
*   **Required**: No (Runs conditionally)
*   **Assignee Persona**: `CustomsBroker`
*   **SLA**: 2 hours
*   **Entry Condition**: `=js:vars.isfAmendmentRequired == true`
*   **Description**: Triggered if shipping details change post-filing (such as a B/L number update). The broker reviews the change and submits an amended ISF.
*   **Outputs**: `isfAmendmentOutcome`, resets `isfAmendmentRequired = false`.
