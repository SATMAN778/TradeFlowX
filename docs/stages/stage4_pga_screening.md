# Stage 4: PGA Screening (Conditional)

This document describes the design, execution steps, data bindings, and agency escalation workflows for **Stage 4: PGA Screening**.

---

## 1. Stage Overview

Certain imported products (e.g. food, cosmetics, medical devices, chemicals, or electronics) are regulated by **Partner Government Agencies (PGAs)** in addition to US Customs (CBP). This stage is conditional and triggers only if the HTS classification flags a PGA requirement. It coordinates filings to agencies like the FDA, USDA, or EPA, and handles responses such as holds or refusals.

*   **Required for Case Completion**: No (Conditional stage)
*   **Stage SLA**: N/A (determined by individual human tasks)

---

## 2. Stage Entry & Exit Conditions

### Entry Condition
Triggers in parallel with Stage 2, 3, and 5, but remains pending until Stage 3 finishes and evaluates the PGA flag:
*   **Trigger**: `selected-stage-completed("HTS Classification & Duty")`
*   **Condition**: `=js:vars.pgaFlag == true`

### Exit Condition
The stage completes when the agencies issue an approval or a "May Proceed" decision:
*   **Rule**: `required-tasks-completed` (Exit Type: `exit-only`)
*   **Case Gate Variable**: `pgaStatus == "MAY_PROCEED"`

---

## 3. Partner Government Agencies & Typical UAE Goods

The matrix of agencies that the platform handles includes:

| Agency | Common UAE Import Goods | Regulatory Requirement |
|---|---|---|
| **FDA (Food & Drug Administration)** | Foods, dates, JAFZA-packed cosmetics, medical devices. | Prior Notice submission; facility registration check. |
| **USDA APHIS** | Plants, agricultural items, wood packaging. | Phytosanitary certificates, pest reviews. |
| **EPA (Environmental Protection Agency)**| UAE refined chemical blends, fuels, vehicle engines. | EPA declarations (form 3520-1/21). |
| **FCC (Federal Communications Commission)**| UAE-distributed electronics or transshipped hardware. | FCC identifier registration (Form 740). |
| **CPSC (Consumer Product Safety Commission)**| Children's toys or apparel. | Children's Product Certificate (CPC). |

---

## 4. Tasks Detail

### Task 4.1: PGA Agency Coordinator
*   **Type**: `api-workflow`
*   **Run Only Once**: Yes
*   **Required**: Yes
*   **Description**: Combines the case data and the uploaded documents (from HT-08 PGA Documentation Required) and transmits the electronic PGA message sets (such as FDA Prior Notice) to the CBP Automated Commercial Environment (ACE).
*   **Inputs**: `htsCode`, `goodsDescription`, `pgaAgencies`, `documentList`
*   **Outputs**: `pgaStatus` (initially set to `"FILED"`)

### Task 4.2: PGA Status Polling Bot
*   **Type**: `rpa`
*   **Run Only Once**: No
*   **Required**: Yes
*   **Description**: Unattended robot that regularly polls the ACE portal for customs status updates. It monitors for status updates such as `May Proceed`, `May Examine`, `Hold`, or `Refused`.
*   **Inputs**: `poNumber`
*   **Outputs**: `pgaStatus`

### Task 4.3: HT-09 PGA Hold
*   **Type**: `action` (Action Center Human Task)
*   **Required**: No (Runs conditionally)
*   **Assignee Persona**: `CustomsBroker`
*   **SLA**: 4 hours
*   **Entry Condition**: `=js:vars.pgaStatus == "HOLD"` or `=js:vars.pgaStatus == "MAY_EXAMINE"`
*   **Description**: Assigned to a broker when an agency flags the shipment for inspection or holds it at the port of arrival. The broker must coordinate documentation with port agents.
*   **Outputs**: Sets `pgaStatus = "RESOLVED"` (if inspection clears) or escalates.

### Task 4.4: HT-10 PGA Refusal
*   **Type**: `action` (Action Center Human Task)
*   **Required**: No (Runs conditionally)
*   **Assignee Persona**: `ComplianceOfficer` (coordinating with `LegalCounsel`)
*   **SLA**: **Immediate** (High Priority)
*   **Entry Condition**: `=js:vars.pgaStatus == "REFUSED"`
*   **Description**: Critical alert triggered when a PGA refuses entry of the cargo. The compliance officer must arrange for immediate cargo re-export or destruction under CBP supervision.
*   **Outputs**: Sets `caseState = "REFUSED"`.
