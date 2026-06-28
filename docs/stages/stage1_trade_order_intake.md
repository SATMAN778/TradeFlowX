# Stage 1: Trade Order Intake

This document describes the design, execution steps, data bindings, and business logic for **Stage 1: Trade Order Intake**.

---

## 1. Stage Overview

The Trade Order Intake stage initiates the entire import lifecycle. It automatically captures shipment requests from external sources, extracts documents, validates that the purchase order (PO) details are complete, and screens the declared Country of Origin (COO) for potential transshipment risk.

*   **Required for Case Completion**: Yes
*   **Stage SLA**: 4 hours
    *   **At-Risk**: Triggered at 75% (3 hours) → Notify `ImporterOps` Team.
    *   **Breached**: Triggered at 100% (4 hours) → Notify `Trade Operations Manager`.

---

## 2. Stage Entry & Exit Conditions

### Entry Condition
The stage starts immediately upon case creation.
*   **Trigger**: `case-entered`

### Exit Condition
The stage completes and transitions when all required tasks within this stage are completed.
*   **Rule**: `required-tasks-completed` (Exit Type: `exit-only`)

---

## 3. Stage Variables Populated

The following variables are initialized or updated in this stage:
*   `triggerSource`: `"EMAIL"` or `"SALESFORCE"`
*   `poNumber`: Extracted purchase order reference.
*   `supplierName` / `supplierAddress` / `supplierCountry`: Exporter metadata.
*   `goodsDescription`: Text description of imported cargo.
*   `totalValueUsd`: Dollar value of goods.
*   `documentList`: JSON array referencing files uploaded to the `ShipmentDocuments` Storage Bucket.
*   `transshipmentFlag` (boolean): Flag set if potential transshipment routing is detected.
*   `transshipmentRisk` (string): Low, Medium, or High.

---

## 4. Tasks Detail

### Task 1.1: PO Data Fetch
*   **Type**: `api-workflow`
*   **Run Only Once**: Yes
*   **Required**: Yes
*   **Description**: Pulls structured PO details from the Salesforce API (if SFDC triggered) or reads the structured output extracted from the incoming email.
*   **Inputs**:
    *   `triggerSource` (from `=vars.triggerSource`)
    *   `sfRecordId` (from `=vars.sfRecordId`)
    *   `emailSubject` (from `=vars.emailSubject`)
*   **Outputs**: Populates core variables `poNumber`, `supplierName`, `supplierAddress`, `supplierCountry`, `goodsDescription`, `quantity`, `unitPriceUsd`, `totalValueUsd`, `incoterms`, `expectedShipDate`, `portOfLoading`, `portOfEntry`, `blNumber`, `cooDeclaration`, and sets `poDataComplete` flag.

### Task 1.2: Email Document Collector
*   **Type**: `agent`
*   **Run Only Once**: Yes
*   **Required**: No (Runs conditionally)
*   **Entry Condition**: `=js:vars.triggerSource == "EMAIL"`
*   **Description**: A UiPath Agent that scans the incoming email inbox, parses email attachments (invoices, packing lists, B/Ls), uploads them to the Orchestrator storage bucket, and generates a structured file list.
*   **Inputs**: `senderEmail`, `emailSubject`, `poNumber`
*   **Outputs**: `documentList`

### Task 1.3: COO Classification Agent
*   **Type**: `agent`
*   **Run Only Once**: Yes
*   **Required**: Yes
*   **Entry Condition**: Executes after Task 1.1 `PO Data Fetch` completes.
*   **Description**: Evaluates the declared Country of Origin against potential transshipment risk indicators (e.g. shipping from JAFZA/Jebel Ali, matching port routing, and historical supplier profiles).
*   **Inputs**: `cooDeclaration`, `supplierCountry`, `portOfLoading`, `goodsDescription`, `totalValueUsd`
*   **Outputs**: `transshipmentFlag`, `transshipmentRisk`, `cooVerificationRequired`

### Task 1.4: HT-01 Missing PO Fields
*   **Type**: `action` (Action Center Human Task)
*   **Required**: No (Runs conditionally)
*   **Assignee Persona**: `ImporterOps`
*   **SLA**: 2 hours
*   **Entry Condition**: `=js:vars.poDataComplete == false`
*   **Description**: Assigned to Importer Operations when mandatory PO fields are missing. The operator reviews the discrepancy and inputs the correct data.
*   **Outputs**: Maps action output to `caseState` and sets `poDataComplete = true`.

### Task 1.5: HT-02 COO Verification
*   **Type**: `action` (Action Center Human Task)
*   **Required**: No (Runs conditionally)
*   **Assignee Persona**: `ComplianceOfficer`
*   **SLA**: 4 hours
*   **Entry Condition**: `=js:vars.cooVerificationRequired == true`
*   **Description**: Assigned to a Compliance Officer when the COO Agent flags a transshipment risk. The officer must confirm the true origin of the cargo or request documentation.
*   **Outputs**: Sets `cooVerified` to `true` (if confirmed) or maps `caseState` to `"REJECTED"` if the shipment is refused.

---

## 5. Critical Business Logic

### UAE Free Zones (JAFZA) Transshipment Audit
Goods entering Jebel Ali Free Zone (JAFZA) and shipping from Dubai are frequently manufactured elsewhere (e.g., China or India). 
If the `supplierAddress` contains "JAFZA", "Jebel Ali Free Zone", or the `portOfLoading` is "Jebel Ali", the **COO Classification Agent** flags the shipment:
1.  Sets `transshipmentFlag = true`
2.  Sets `transshipmentRisk = "HIGH"`
3.  Sets `cooVerificationRequired = true`
This automatically triggers **HT-02** to prevent circumvention of Section 301 tariffs or anti-dumping duties.
