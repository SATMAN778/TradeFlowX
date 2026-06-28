# SDD — TradeXCase

> **⚠️ Generated with complexity exceeding standard thresholds.**
> Counts at generation time: 7 stages, 39 tasks, 5+ integrations, 9 personas.
> Review carefully before approving. This scope is intentional for a full cross-border import operations platform.

A Case Definition Blueprint for the TradeX Import Operations Platform built on UiPath Maestro. The case manages the end-to-end customs and compliance lifecycle for a single trade shipment — from purchase order intake through post-entry duty reconciliation — orchestrating automated agents, RPA bots, API workflows, and 18 human decision tasks across seven sequential stages.

---

## Table of Contents

1. [Case Definition](#section-1-case-definition) — Metadata, SLA, Triggers, Exit Conditions, Variables
2. [Stages & Tasks](#section-2-stages--tasks)
   - [Stage 1: Trade Order Intake](#stage-1-trade-order-intake) — 5 tasks
   - [Stage 2: ISF 10+2 Filing](#stage-2-isf-102-filing) — 6 tasks
   - [Stage 3: HTS Classification & Duty](#stage-3-hts-classification--duty) — 7 tasks
   - [Stage 4: PGA Screening](#stage-4-pga-screening) — 4 tasks (conditional)
   - [Stage 5: OFAC & Denied-Party Screening](#stage-5-ofac--denied-party-screening) — 5 tasks
   - [Stage 6: Customs Entry Filing & CBP Clearance](#stage-6-customs-entry-filing--cbp-clearance) — 6 tasks
   - [Stage 7: Document Management & Post-Entry](#stage-7-document-management--post-entry) — 6 tasks
3. [Personas & App Views](#section-3-personas--app-views) — 9 Personas, Process App Views
4. [Integrations](#section-4-integrations) — Integration Service Connectors, External Agents

---

## Section 1: Case Definition

### Case Metadata

| Property | Value |
|----------|-------|
| Case Name | TradeXCase |
| Case Description | Manages the full cross-border import lifecycle for a single shipment — from PO intake and ISF 10+2 filing through HTS classification, PGA screening, OFAC denied-party screening, CBP customs entry, and post-entry duty reconciliation. Each case represents one shipment and drives automated agents, RPA bots, and 18 human review tasks to completion. |
| Case Identifier | Type: external. Source: `=vars.poNumber` |
| Priority | Choiceset: Standard, Urgent, Compliance-Hold — Default: Standard |
| Case-Level SLA | 10 d |
| SLA Type | time-based |

### Case-Level SLA Escalation Rules

| SLA Status | Threshold | Action |
|------------|-----------|--------|
| At-Risk | 75% of SLA duration | Notify: Trade Operations Manager |
| Breached | 100% of SLA duration | Notify: Trade Operations Manager, Compliance Officer |

### Case Triggers

| T# | Trigger Type | Source | Configuration |
|----|-------------|--------|---------------|
| T02 | Intsvc.EventTrigger | Microsoft Outlook 365 | Email Received in Inbox; filter: subject contains "TRADE ORDER" |
| T03 | Intsvc.EventTrigger | Salesforce | Record Created for Trade Order object |

### Case Exit Conditions

| WHEN | IF | THEN | Marks Case Complete | Display Name |
|------|-----|------|---------------------|--------------|
| required-stages-completed | — | Case exited | Yes | Complete Rule 1 |

### Case Variables

| Name | Category | Type | sourceTriggers | sourceFields | Default | Description |
|------|----------|------|----------------|--------------|---------|-------------|
| triggerSource | Variable | string | T02, T03 | T02: response.triggerType; T03: response.triggerType | "MANUAL" | Which trigger initiated the case: EMAIL or SALESFORCE |
| emailSubject | Variable | string | T02 | response.subject | | Subject line of the incoming trade order email |
| senderEmail | Variable | string | T02 | response.from | | Email address of the sender |
| sfRecordId | Variable | string | T03 | response.recordId | | Salesforce record ID of the trade order |
| poNumber | Variable | string | | | | Purchase order number — populated by PO Data Fetch task |
| supplierName | Variable | string | | | | Supplier / exporter name |
| supplierAddress | Variable | string | | | | Supplier full address |
| supplierCountry | Variable | string | | | | Supplier country (declared country of origin) |
| goodsDescription | Variable | string | | | | Description of goods being imported |
| quantity | Variable | integer | | | 0 | Quantity of goods |
| unitPriceUsd | Variable | float | | | 0 | Unit price in USD |
| totalValueUsd | Variable | float | | | 0 | Total shipment value in USD |
| incoterms | Variable | string | | | | Trade terms (FOB, CIF, DDP, etc.) |
| expectedShipDate | Variable | date | | | | Expected ship date from origin |
| portOfLoading | Variable | string | | | | Origin port of loading |
| portOfEntry | Variable | string | | | | US port of entry |
| blNumber | Variable | string | | | | Bill of lading number |
| cooDeclaration | Variable | string | | | | Declared country of origin |
| cooVerified | Variable | boolean | | | false | Whether COO has been verified by compliance |
| transshipmentFlag | Variable | boolean | | | false | Whether transshipment risk detected |
| transshipmentRisk | Variable | string | | | "LOW" | Transshipment risk level: LOW / MEDIUM / HIGH |
| poDataComplete | Variable | boolean | | | false | Whether all required PO fields are present |
| cooVerificationRequired | Variable | boolean | | | false | Whether COO requires human verification |
| documentList | Variable | jsonSchema | | | | List of documents saved to UiPath Storage |
| isfStatus | Variable | string | | | "PENDING" | ISF filing status: PENDING / SUBMITTED / REJECTED / ACCEPTED |
| isfTxnNumber | Variable | string | | | | ISF transaction number from ACE |
| isfDeadlineUtc | Variable | string | | | | ISF 24-hour pre-departure deadline (ISO UTC) |
| isfDataComplete | Variable | boolean | | | false | Whether all 10+2 ISF elements are collected |
| isfAmendmentRequired | Variable | boolean | | | false | Whether ISF requires material amendment |
| htsCode | Variable | string | | | | Confirmed HTS code |
| htsCandidates | Variable | jsonSchema | | | | AI HTS classification candidates (top 3 with confidence scores) |
| htsConfidence | Variable | float | | | 0 | Confidence score of top AI HTS candidate (0–100) |
| dutyRatePct | Variable | float | | | 0 | Applicable duty rate percentage |
| dutyAmountUsd | Variable | float | | | 0 | Calculated total duty amount in USD |
| mpfAmount | Variable | float | | | 0 | Merchandise Processing Fee |
| hmfAmount | Variable | float | | | 0 | Harbor Maintenance Fee |
| pgaFlag | Variable | boolean | | | false | Whether PGA (Partner Government Agency) review is required |
| pgaAgencies | Variable | jsonSchema | | | | List of PGA agencies requiring review |
| pgaStatus | Variable | string | | | "NOT_REQUIRED" | PGA screening status |
| partyNames | Variable | jsonSchema | | | | List of parties (seller, manufacturer, importer, carrier) for OFAC screening |
| ofacScreeningResults | Variable | jsonSchema | | | | OFAC SDN screening results per party |
| ofacMatchScore | Variable | float | | | 0 | Highest OFAC match score across all parties (0–100) |
| ofacClearStatus | Variable | string | | | "PENDING" | OFAC status: PENDING / CLEAR / FUZZY_MATCH / CONFIRMED_HIT |
| entryNumber | Variable | string | | | | CBP customs entry number |
| cbpStatus | Variable | string | | | "PENDING" | CBP entry status: PENDING / FILED / EXAM / RELEASED / LIQUIDATED |
| examType | Variable | string | | | | CBP exam type if selected (INTENSIVE, CET, NII) |
| cf28Questions | Variable | jsonSchema | | | | CF-28 questions from CBP |
| cf29ActionType | Variable | string | | | | CF-29 action type from CBP |
| estimatedDutyUsd | Variable | float | | | 0 | Estimated duty at entry filing |
| actualDutyUsd | Variable | float | | | 0 | Actual duty assessed by CBP |
| dutyVarianceUsd | Variable | float | | | 0 | Variance between estimated and actual duty |
| dutyVariancePct | Variable | float | | | 0 | Variance percentage |
| documentationComplete | Variable | boolean | | | false | Whether all 9 required shipment documents are present |
| archivalStatus | Variable | string | | | "PENDING" | DMS archival status |
| landedCostPosted | Variable | boolean | | | false | Whether landed cost has been posted to ERP |
| dutySavingsOpportunity | Variable | string | | | "NONE" | Type of duty savings opportunity identified |
| estimatedSavingsUsd | Variable | float | | | 0 | Estimated savings from duty optimization |
| caseState | Variable | string | | | "ACTIVE" | Overall case state |

---

## Section 2: Stages & Tasks

---

### Stage 1: Trade Order Intake

**Type:** Stage
**Description:** Initiates on either an email trade order or a Salesforce integration trigger. Fetches and validates all purchase order fields, saves documents to UiPath Storage, and runs the COO classification agent to assess transshipment risk. Human review handles missing PO data and COO verification.
**Required for Case Completion:** Yes

#### Stage Entry Conditions

| WHEN | IF | Interrupting | Display Name |
|------|-----|-------------|--------------|
| case-entered | — | No | Entry Rule 1 |

#### Stage Exit Conditions

| WHEN | IF | Exit Type | Marks Stage Complete | Display Name |
|------|-----|-----------|---------------------|--------------|
| required-tasks-completed | — | exit-only | Yes | Complete Rule 1 |

#### Stage SLA

| SLA | Unit | At-Risk | At-Risk Action | Breach Action |
|-----|------|---------|----------------|---------------|
| 4 | h | 75% | Notify: ImporterOps Team | Notify: Trade Operations Manager |

#### Tasks

| # | Task Name | Type | Required | Run Only Once | Persona | SLA |
|---|-----------|------|----------|---------------|---------|-----|
| 1 | PO Data Fetch | api-workflow | Yes | Yes | — | — |
| 2 | Email Document Collector | agent | No | Yes | — | — |
| 3 | COO Classification Agent | agent | Yes | Yes | — | — |
| 4 | HT-01 Missing PO Fields | action | No | No | ImporterOps | 2 h |
| 5 | HT-02 COO Verification | action | No | No | ComplianceOfficer | 4 h |

---

##### Task 1.1: PO Data Fetch

**Type:** api-workflow
**Description:** Fetches full PO details from Salesforce when triggered by the Salesforce event, or extracts structured PO data parsed by the Email Document Collector when triggered by email. Populates core shipment fields (poNumber, supplierName, totalValueUsd, incoterms, portOfEntry, etc.) and sets poDataComplete flag. If coming from Salesforce, also downloads all attached documents.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| current-stage-entered | — | Entry Rule 1 |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| triggerSource | string | =vars.triggerSource |
| sfRecordId | string | =vars.sfRecordId |
| emailSubject | string | =vars.emailSubject |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| response.poNumber | -> poNumber |
| response.supplierName | -> supplierName |
| response.supplierAddress | -> supplierAddress |
| response.supplierCountry | -> supplierCountry |
| response.goodsDescription | -> goodsDescription |
| response.quantity | -> quantity |
| response.unitPriceUsd | -> unitPriceUsd |
| response.totalValueUsd | -> totalValueUsd |
| response.incoterms | -> incoterms |
| response.expectedShipDate | -> expectedShipDate |
| response.portOfLoading | -> portOfLoading |
| response.portOfEntry | -> portOfEntry |
| response.blNumber | -> blNumber |
| response.cooDeclaration | -> cooDeclaration |
| response.isComplete | -> poDataComplete |

---

##### Task 1.2: Email Document Collector

**Type:** agent
**Description:** UiPath Agent that reads the trade order email, parses attachments (commercial invoice, packing list, bill of lading), and saves all documents to UiPath Storage Buckets. Produces a structured document list for downstream use. Runs only when trigger source is EMAIL.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| current-stage-entered | =js:vars.triggerSource == "EMAIL" | Entry Rule 1 |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| senderEmail | string | =vars.senderEmail |
| emailSubject | string | =vars.emailSubject |
| poNumber | string | =vars.poNumber |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| response.documentList | -> documentList |

---

##### Task 1.3: COO Classification Agent

**Type:** agent
**Description:** UiPath COO Classification Agent assesses the declared country of origin against transshipment risk indicators — supplier zone, declared COO, routing, and bill of lading origin. Outputs a risk level (LOW/MEDIUM/HIGH) and determines whether human COO verification is required.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("PO Data Fetch") | — | Entry Rule 1 |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| cooDeclaration | string | =vars.cooDeclaration |
| supplierCountry | string | =vars.supplierCountry |
| portOfLoading | string | =vars.portOfLoading |
| goodsDescription | string | =vars.goodsDescription |
| totalValueUsd | float | =vars.totalValueUsd |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| response.transshipmentFlag | -> transshipmentFlag |
| response.transshipmentRisk | -> transshipmentRisk |
| response.cooVerificationRequired | -> cooVerificationRequired |

---

##### Task 1.4: HT-01 Missing PO Fields

**Type:** action
**Description:** Human task for ImporterOps to complete any missing PO data fields identified during PO Data Fetch. Operator reviews the missing fields list and provides correct values. Outcomes: Complete (all fields provided) or Escalate.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("PO Data Fetch") | =js:vars.poDataComplete == false | Entry Rule 1 |

**HITL Implementation:** Action App: `<UNRESOLVED: HT-01 Missing PO Fields Action App>`

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| poNumber | String | =vars.poNumber | Yes |
| supplierName | String | =vars.supplierName | Yes |
| goodsDescription | String | =vars.goodsDescription | No |
| totalValueUsd | Number | =vars.totalValueUsd | No |
| missingFieldsList | String | =js:vars.poDataComplete | Yes |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| Action | -> caseState |
| — | poDataComplete = true |

**Actions:**

| Button | Maps To | Behavior |
|--------|---------|----------|
| Complete | caseState = "ACTIVE" | Complete task — PO data now complete |
| Escalate | caseState = "ESCALATED" | Complete task and escalate to manager |

---

##### Task 1.5: HT-02 COO Verification

**Type:** action
**Description:** Compliance Officer verifies the true country of origin when the COO Classification Agent flags a transshipment risk or verification requirement. Reviews COO declaration, supplier zone, and uploaded evidence documents. Outcomes: ConfirmCOO, RejectShipment, or RequestDocuments.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("COO Classification Agent") | =js:vars.cooVerificationRequired == true | Entry Rule 1 |

**HITL Implementation:** Action App: `<UNRESOLVED: HT-02 COO Verification Action App>`

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| cooDeclaration | String | =vars.cooDeclaration | Yes |
| supplierCountry | String | =vars.supplierCountry | Yes |
| transshipmentRisk | String | =vars.transshipmentRisk | Yes |
| transshipmentFlag | Boolean | =vars.transshipmentFlag | Yes |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| Action | -> cooClearStatus |
| — | cooVerified = =js:vars.cooClearStatus == "ConfirmCOO" |

**Actions:**

| Button | Maps To | Behavior |
|--------|---------|----------|
| Confirm COO | cooVerified = true | Complete task — COO confirmed |
| Reject Shipment | caseState = "REJECTED" | Complete task — shipment rejected |
| Request Documents | cooVerificationRequired = true | Complete task — additional docs requested |

---

### Stage 2: ISF 10+2 Filing

**Type:** Stage
**Description:** Prepares and submits the ISF 10+2 filing to CBP via the ACE portal. The agent collects all required ISF elements, files via the ACE API, and polls for acceptance. Human tasks handle missing elements, Do Not Load orders, and material amendments.
**Required for Case Completion:** Yes

#### Stage Entry Conditions

| WHEN | IF | Interrupting | Display Name |
|------|-----|-------------|--------------|
| selected-stage-completed("Trade Order Intake") | — | No | Entry Rule 1 |

#### Stage Exit Conditions

| WHEN | IF | Exit Type | Marks Stage Complete | Display Name |
|------|-----|-----------|---------------------|--------------|
| required-tasks-completed | — | exit-only | Yes | Complete Rule 1 |

#### Stage SLA

| SLA | Unit | At-Risk | At-Risk Action | Breach Action |
|-----|------|---------|----------------|---------------|
| 24 | h | 60% | Notify: CustomsBroker Team | Notify: Trade Operations Manager — ISF regulatory deadline at risk |

#### Tasks

| # | Task Name | Type | Required | Run Only Once | Persona | SLA |
|---|-----------|------|----------|---------------|---------|-----|
| 1 | ISF Data Collector Agent | agent | Yes | Yes | — | — |
| 2 | ACE ISF Filing Workflow | api-workflow | Yes | Yes | — | — |
| 3 | ACE ISF Status Poller | rpa | Yes | No | — | — |
| 4 | HT-03 Missing ISF Elements | action | No | No | CustomsBroker | 4 h |
| 5 | HT-04 ISF Do Not Load | action | No | No | CustomsBroker | 1 h |
| 6 | HT-05 ISF Material Amendment | action | No | No | CustomsBroker | 2 h |

---

##### Task 2.1: ISF Data Collector Agent

**Type:** agent
**Description:** UiPath ISF Data Collector Agent prepares all 10+2 ISF elements from available case data (PO details, document list, bill of lading). Identifies missing elements and sets the ISF filing deadline based on vessel departure schedule.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| current-stage-entered | — | Entry Rule 1 |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| poNumber | string | =vars.poNumber |
| supplierName | string | =vars.supplierName |
| supplierAddress | string | =vars.supplierAddress |
| blNumber | string | =vars.blNumber |
| portOfLoading | string | =vars.portOfLoading |
| portOfEntry | string | =vars.portOfEntry |
| documentList | jsonSchema | =vars.documentList |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| response.isfDataComplete | -> isfDataComplete |
| response.isfDeadlineUtc | -> isfDeadlineUtc |

---

##### Task 2.2: ACE ISF Filing Workflow

**Type:** api-workflow
**Description:** Submits the assembled ISF 10+2 data to CBP ACE via the filing API. Returns the ISF transaction number and initial filing status. Executes only when all ISF data elements are present.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("ISF Data Collector Agent") | =js:vars.isfDataComplete == true | Entry Rule 1 |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| poNumber | string | =vars.poNumber |
| isfDeadlineUtc | string | =vars.isfDeadlineUtc |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| response.isfTxnNumber | -> isfTxnNumber |
| response.isfStatus | -> isfStatus |

---

##### Task 2.3: ACE ISF Status Poller

**Type:** rpa
**Description:** RPA bot polls the CBP ACE portal for ISF acceptance or rejection status using the ISF transaction number. Updates isfStatus and triggers human tasks on rejection (Do Not Load) or amendment requirements.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("ACE ISF Filing Workflow") | — | Entry Rule 1 |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| isfTxnNumber | string | =vars.isfTxnNumber |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| response.isfStatus | -> isfStatus |
| response.isfAmendmentRequired | -> isfAmendmentRequired |

---

##### Task 2.4: HT-03 Missing ISF Elements

**Type:** action
**Description:** Customs Broker completes missing ISF 10+2 elements that the agent could not automatically collect from available documents. Shows a live countdown to the ISF regulatory deadline. Outcomes: SubmitISF, RequestFromCarrier, or Escalate.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("ISF Data Collector Agent") | =js:vars.isfDataComplete == false | Entry Rule 1 |

**HITL Implementation:** Action App: `<UNRESOLVED: HT-03 Missing ISF Elements Action App>`

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| isfDeadlineUtc | String | =vars.isfDeadlineUtc | Yes |
| poNumber | String | =vars.poNumber | Yes |
| supplierName | String | =vars.supplierName | Yes |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| Action | -> isfCollectionOutcome |
| — | isfDataComplete = true |

**Actions:**

| Button | Maps To | Behavior |
|--------|---------|----------|
| Submit ISF | isfDataComplete = true | Complete task — all elements collected |
| Request From Carrier | isfDataComplete = false | Complete task — waiting on carrier |
| Escalate | caseState = "ESCALATED" | Complete task and escalate |

---

##### Task 2.5: HT-04 ISF Do Not Load

**Type:** action
**Description:** Full-screen alert task for CustomsBroker and LegalCounsel when CBP issues a Do Not Load order. No dismiss without a decision. Shows ISF transaction number, error code, and detail. Outcomes: CorrectedAndResubmitted, EscalateLegal, or HoldShipment.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("ACE ISF Status Poller") | =js:vars.isfStatus == "DO_NOT_LOAD" | Entry Rule 1 |

**HITL Implementation:** Action App: `<UNRESOLVED: HT-04 ISF Do Not Load Action App>`

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| isfTxnNumber | String | =vars.isfTxnNumber | Yes |
| isfStatus | String | =vars.isfStatus | Yes |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| Action | -> isfDoNotLoadOutcome |

**Actions:**

| Button | Maps To | Behavior |
|--------|---------|----------|
| Corrected and Resubmitted | isfStatus = "RESUBMITTED" | Complete task |
| Escalate Legal | caseState = "LEGAL_REVIEW" | Complete task and escalate to legal |
| Hold Shipment | caseState = "ON_HOLD" | Complete task — shipment held |

---

##### Task 2.6: HT-05 ISF Material Amendment

**Type:** action
**Description:** Customs Broker reviews and approves a material amendment to an already-filed ISF when discrepancies are detected (e.g., BL number change, consignee change). Outcomes: AmendAndResubmit or HoldForReview.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("ACE ISF Status Poller") | =js:vars.isfAmendmentRequired == true | Entry Rule 1 |

**HITL Implementation:** Action App: `<UNRESOLVED: HT-05 ISF Material Amendment Action App>`

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| blNumber | String | =vars.blNumber | Yes |
| isfTxnNumber | String | =vars.isfTxnNumber | Yes |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| Action | -> isfAmendmentOutcome |
| — | isfAmendmentRequired = false |

**Actions:**

| Button | Maps To | Behavior |
|--------|---------|----------|
| Amend and Resubmit | isfAmendmentRequired = false | Complete task — amendment filed |
| Hold For Review | caseState = "ON_HOLD" | Complete task — held pending review |

---

### Stage 3: HTS Classification & Duty

**Type:** Stage
**Description:** Runs IDP document extraction pipeline, classifies the goods under the Harmonized Tariff Schedule using a LangGraph AI agent, calculates applicable duty rates (MFN, Section 301, ADD/CVD, MPF, HMF), and sets the PGA flag. Human tasks handle AI confidence below 90% and PGA documentation requirements.
**Required for Case Completion:** Yes

#### Stage Entry Conditions

| WHEN | IF | Interrupting | Display Name |
|------|-----|-------------|--------------|
| selected-stage-completed("ISF 10+2 Filing") | =js:vars.isfStatus == "ACCEPTED" | No | Entry Rule 1 |

#### Stage Exit Conditions

| WHEN | IF | Exit Type | Marks Stage Complete | Display Name |
|------|-----|-----------|---------------------|--------------|
| required-tasks-completed | — | exit-only | Yes | Complete Rule 1 |

#### Stage SLA

| SLA | Unit | At-Risk | At-Risk Action | Breach Action |
|-----|------|---------|----------------|---------------|
| 8 | h | 75% | Notify: ClassificationSpecialist Team | Notify: Trade Operations Manager |

#### Tasks

| # | Task Name | Type | Required | Run Only Once | Persona | SLA |
|---|-----------|------|----------|---------------|---------|-----|
| 1 | IDP Document Pipeline | rpa | Yes | Yes | — | — |
| 2 | HTS Classification Agent | agent | Yes | Yes | — | — |
| 3 | Duty Rate Lookup Workflow | api-workflow | Yes | Yes | — | — |
| 4 | PGA Flag Workflow | api-workflow | Yes | Yes | — | — |
| 5 | HT-06 HTS Review 70-90% | action | No | No | CustomsBroker | 4 h |
| 6 | HT-07 Manual HTS Classification | action | No | No | ClassificationSpecialist | 8 h |
| 7 | HT-08 PGA Documentation Required | action | No | No | ComplianceOfficer | 24 h |

---

##### Task 3.1: IDP Document Pipeline

**Type:** rpa
**Description:** RPA bot runs the Intelligent Document Processing pipeline against uploaded shipment documents (commercial invoice, packing list, certificate of origin). Extracts key fields with confidence scores to feed the HTS classification agent.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| current-stage-entered | — | Entry Rule 1 |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| documentList | jsonSchema | =vars.documentList |
| poNumber | string | =vars.poNumber |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| response.extractedFields | -> documentList |
| response.goodsDescription | -> goodsDescription |

---

##### Task 3.2: HTS Classification Agent

**Type:** agent
**Description:** LangGraph-based HTS Classification Agent analyzes the goods description, IDP-extracted fields, and product characteristics to produce the top 3 HTS code candidates with confidence scores and CBP ruling citations. Sets htsConfidence based on the top candidate score.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("IDP Document Pipeline") | — | Entry Rule 1 |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| goodsDescription | string | =vars.goodsDescription |
| supplierCountry | string | =vars.supplierCountry |
| totalValueUsd | float | =vars.totalValueUsd |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| response.htsCandidates | -> htsCandidates |
| response.topHtsCode | -> htsCode |
| response.topConfidence | -> htsConfidence |

---

##### Task 3.3: Duty Rate Lookup Workflow

**Type:** api-workflow
**Description:** Calls the USITC Harmonized Tariff Schedule API to retrieve applicable duty rates for the classified HTS code — MFN rate, Section 301 additional tariff, ADD/CVD rates, MPF, and HMF. Populates duty calculation fields.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("HTS Classification Agent") | =js:vars.htsConfidence >= 90 | Entry Rule 1 |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| htsCode | string | =vars.htsCode |
| totalValueUsd | float | =vars.totalValueUsd |
| supplierCountry | string | =vars.supplierCountry |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| response.dutyRatePct | -> dutyRatePct |
| response.dutyAmountUsd | -> dutyAmountUsd |
| response.mpfAmount | -> mpfAmount |
| response.hmfAmount | -> hmfAmount |
| — | estimatedDutyUsd = =vars.dutyAmountUsd |

---

##### Task 3.4: PGA Flag Workflow

**Type:** api-workflow
**Description:** Evaluates the HTS code against the Partner Government Agency (PGA) flag matrix — FDA, USDA, FWS, EPA, CPSC, and others. Sets pgaFlag and populates the list of agencies requiring review for this shipment.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("HTS Classification Agent") | =js:vars.htsConfidence >= 90 | Entry Rule 1 |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| htsCode | string | =vars.htsCode |
| goodsDescription | string | =vars.goodsDescription |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| response.pgaFlag | -> pgaFlag |
| response.pgaAgencies | -> pgaAgencies |

---

##### Task 3.5: HT-06 HTS Review 70-90%

**Type:** action
**Description:** Customs Broker reviews AI HTS classification when top candidate confidence is between 70% and 90%. Displays AI confidence bar, top 3 candidates with ruling citations, and override input. Outcomes: ConfirmAISuggestion, OverrideWithManual, or EscalateToSpecialist.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("HTS Classification Agent") | =js:vars.htsConfidence >= 70 && vars.htsConfidence < 90 | Entry Rule 1 |

**HITL Implementation:** Action App: `<UNRESOLVED: HT-06 HTS Review Action App>`

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| htsCandidates | String | =vars.htsCandidates | Yes |
| htsConfidence | Number | =vars.htsConfidence | Yes |
| goodsDescription | String | =vars.goodsDescription | Yes |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| Action | -> htsReviewOutcome |
| ConfirmedHtsCode | -> htsCode |

**Actions:**

| Button | Maps To | Behavior |
|--------|---------|----------|
| Confirm AI Suggestion | htsConfidence = 95 | Complete task — AI code confirmed |
| Override With Manual | htsCode = "MANUAL" | Complete task — manual code entered |
| Escalate To Specialist | htsConfidence = 0 | Complete task — route to specialist |

---

##### Task 3.6: HT-07 Manual HTS Classification

**Type:** action
**Description:** Classification Specialist performs full manual HTS classification when AI confidence is below 70% or broker escalates. Has access to AI candidates for reference. Outcomes: SubmitHTS or RequestBindingRuling.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("HTS Classification Agent") | =js:vars.htsConfidence < 70 | Entry Rule 1 |

**HITL Implementation:** Action App: `<UNRESOLVED: HT-07 Manual HTS Classification Action App>`

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| htsCandidates | String | =vars.htsCandidates | Yes |
| goodsDescription | String | =vars.goodsDescription | Yes |
| htsConfidence | Number | =vars.htsConfidence | Yes |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| Action | -> htsManualOutcome |
| ManualHtsCode | -> htsCode |

**Actions:**

| Button | Maps To | Behavior |
|--------|---------|----------|
| Submit HTS | htsConfidence = 100 | Complete task — manual code submitted |
| Request Binding Ruling | caseState = "BINDING_RULING" | Complete task — binding ruling requested |

---

##### Task 3.7: HT-08 PGA Documentation Required

**Type:** action
**Description:** Compliance Officer reviews PGA documentation requirements and submits necessary permits, licenses, or certificates for flagged agencies. Outcomes: DocumentsSubmitted, RejectTransshipment, or EscalateLegal.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("PGA Flag Workflow") | =js:vars.pgaFlag == true | Entry Rule 1 |

**HITL Implementation:** Action App: `<UNRESOLVED: HT-08 PGA Documentation Action App>`

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| pgaAgencies | String | =vars.pgaAgencies | Yes |
| cooDeclaration | String | =vars.cooDeclaration | Yes |
| supplierName | String | =vars.supplierName | Yes |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| Action | -> pgaDocOutcome |

**Actions:**

| Button | Maps To | Behavior |
|--------|---------|----------|
| Documents Submitted | pgaStatus = "DOCS_SUBMITTED" | Complete task |
| Reject Transshipment | caseState = "REJECTED" | Complete task |
| Escalate Legal | caseState = "LEGAL_REVIEW" | Complete task |

---

### Stage 4: PGA Screening

**Type:** Stage
**Description:** Conditional stage — runs only when pgaFlag is true. A CrewAI-powered PGA Agency Coordinator crew manages agency-specific submission workflows and tracks status via RPA polling. Human tasks address PGA holds and refusals.
**Required for Case Completion:** No

#### Stage Entry Conditions

| WHEN | IF | Interrupting | Display Name |
|------|-----|-------------|--------------|
| selected-stage-completed("HTS Classification & Duty") | =js:vars.pgaFlag == true | No | Entry Rule 1 |

#### Stage Exit Conditions

| WHEN | IF | Exit Type | Marks Stage Complete | Display Name |
|------|-----|-----------|---------------------|--------------|
| required-tasks-completed | — | exit-only | Yes | Complete Rule 1 |

#### Stage SLA

| SLA | Unit | At-Risk | At-Risk Action | Breach Action |
|-----|------|---------|----------------|---------------|
| 48 | h | 75% | Notify: ComplianceOfficer | Notify: Trade Operations Manager |

#### Tasks

| # | Task Name | Type | Required | Run Only Once | Persona | SLA |
|---|-----------|------|----------|---------------|---------|-----|
| 1 | PGA Agency Coordinator | api-workflow | Yes | Yes | — | — |
| 2 | PGA Status Polling Bot | rpa | Yes | No | — | — |
| 3 | HT-09 PGA Hold | action | No | No | CustomsBroker | 4 h |
| 4 | HT-10 PGA Refusal | action | No | No | ComplianceOfficer | 1 h |

---

##### Task 4.1: PGA Agency Coordinator

**Type:** api-workflow
**Description:** Invokes the CrewAI PGA Agency Coordinator crew via API to orchestrate agency-specific submission workflows for each flagged PGA (FDA, USDA, FWS, EPA, etc.). The crew handles each agency's unique document and permit requirements. Modeled as api-workflow since CrewAI is externally hosted.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| current-stage-entered | — | Entry Rule 1 |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| pgaAgencies | jsonSchema | =vars.pgaAgencies |
| htsCode | string | =vars.htsCode |
| goodsDescription | string | =vars.goodsDescription |
| poNumber | string | =vars.poNumber |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| response.pgaStatus | -> pgaStatus |

---

##### Task 4.2: PGA Status Polling Bot

**Type:** rpa
**Description:** RPA bot polls each PGA agency portal for submission status updates and updates the pgaStatus field. Runs iteratively until a terminal status (APPROVED, MAY_HOLD, REFUSED) is received.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("PGA Agency Coordinator") | — | Entry Rule 1 |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| pgaAgencies | jsonSchema | =vars.pgaAgencies |
| poNumber | string | =vars.poNumber |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| response.pgaStatus | -> pgaStatus |

---

##### Task 4.3: HT-09 PGA Hold

**Type:** action
**Description:** Customs Broker responds to a PGA May Hold notice by submitting required documentation, requesting an extension, or escalating to compliance. Displays agency name, hold reason, and port arrival ETA.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("PGA Status Polling Bot") | =js:vars.pgaStatus == "MAY_HOLD" | Entry Rule 1 |

**HITL Implementation:** Action App: `<UNRESOLVED: HT-09 PGA Hold Action App>`

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| pgaAgencies | String | =vars.pgaAgencies | Yes |
| pgaStatus | String | =vars.pgaStatus | Yes |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| Action | -> pgaHoldOutcome |

**Actions:**

| Button | Maps To | Behavior |
|--------|---------|----------|
| Documents Submitted | pgaStatus = "DOCS_SUBMITTED" | Complete task |
| Request Extension | pgaStatus = "EXTENSION_REQUESTED" | Complete task |
| Escalate Compliance | caseState = "ESCALATED" | Complete task |

---

##### Task 4.4: HT-10 PGA Refusal

**Type:** action
**Description:** Full-screen alert for ComplianceOfficer and LegalCounsel when a PGA issues a formal refusal. Three distinct disposition options with no dismiss. Outcomes: ReExport, RequestDestruction, or AppealRefusal.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("PGA Status Polling Bot") | =js:vars.pgaStatus == "REFUSED" | Entry Rule 1 |

**HITL Implementation:** Action App: `<UNRESOLVED: HT-10 PGA Refusal Action App>`

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| pgaAgencies | String | =vars.pgaAgencies | Yes |
| htsCode | String | =vars.htsCode | Yes |
| totalValueUsd | Number | =vars.totalValueUsd | Yes |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| Action | -> pgaRefusalOutcome |

**Actions:**

| Button | Maps To | Behavior |
|--------|---------|----------|
| Re-Export | pgaStatus = "RE_EXPORTED" | Complete task |
| Request Destruction | pgaStatus = "DESTRUCTION" | Complete task |
| Appeal Refusal | pgaStatus = "APPEAL_FILED" | Complete task |

---

### Stage 5: OFAC & Denied-Party Screening

**Type:** Stage
**Description:** Extracts all parties from shipment documents, assesses transshipment risk using a LangGraph agent, and screens all parties against the OFAC SDN list and denied party lists via the OFAC API. Human review handles fuzzy matches and confirmed hits.
**Required for Case Completion:** Yes

#### Stage Entry Conditions

| WHEN | IF | Interrupting | Display Name |
|------|-----|-------------|--------------|
| selected-stage-completed("HTS Classification & Duty") | =js:vars.pgaFlag == false | No | Entry Rule 1 |
| selected-stage-completed("PGA Screening") | — | No | Entry Rule 2 |

#### Stage Exit Conditions

| WHEN | IF | Exit Type | Marks Stage Complete | Display Name |
|------|-----|-----------|---------------------|--------------|
| required-tasks-completed | — | exit-only | Yes | Complete Rule 1 |

#### Stage SLA

| SLA | Unit | At-Risk | At-Risk Action | Breach Action |
|-----|------|---------|----------------|---------------|
| 4 | h | 75% | Notify: ComplianceOfficer | Notify: Trade Operations Manager |

#### Tasks

| # | Task Name | Type | Required | Run Only Once | Persona | SLA |
|---|-----------|------|----------|---------------|---------|-----|
| 1 | Party Extraction Agent | agent | Yes | Yes | — | — |
| 2 | Transshipment Risk Agent | agent | Yes | Yes | — | — |
| 3 | OFAC SDN API Workflow | api-workflow | Yes | Yes | — | — |
| 4 | HT-11 OFAC Fuzzy Match | action | No | No | ComplianceOfficer | 2 h |
| 5 | HT-12 Confirmed OFAC Hit | action | No | No | LegalCounsel | 1 h |

---

##### Task 5.1: Party Extraction Agent

**Type:** agent
**Description:** UiPath Party Extraction Agent identifies and structures all parties involved in the shipment — seller, manufacturer, buyer, importer of record, consignee, carrier, consolidator — from the commercial invoice, bill of lading, and packing list.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| current-stage-entered | — | Entry Rule 1 |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| documentList | jsonSchema | =vars.documentList |
| supplierName | string | =vars.supplierName |
| supplierCountry | string | =vars.supplierCountry |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| response.partyNames | -> partyNames |

---

##### Task 5.2: Transshipment Risk Agent

**Type:** agent
**Description:** LangGraph-based Transshipment Risk Agent performs enhanced due diligence on routing and party geography to refine transshipment risk assessment ahead of OFAC screening. Updates transshipmentRisk and transshipmentFlag.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("Party Extraction Agent") | — | Entry Rule 1 |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| partyNames | jsonSchema | =vars.partyNames |
| portOfLoading | string | =vars.portOfLoading |
| portOfEntry | string | =vars.portOfEntry |
| supplierCountry | string | =vars.supplierCountry |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| response.transshipmentRisk | -> transshipmentRisk |
| response.transshipmentFlag | -> transshipmentFlag |

---

##### Task 5.3: OFAC SDN API Workflow

**Type:** api-workflow
**Description:** Screens all extracted parties against the OFAC Specially Designated Nationals list and CBP Denied Parties List via the OFAC SDN API. Returns match scores per party. Sets ofacClearStatus based on highest match score threshold (≥85% → FUZZY_MATCH, confirmed → CONFIRMED_HIT).

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("Party Extraction Agent") | — | Entry Rule 1 |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| partyNames | jsonSchema | =vars.partyNames |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| response.ofacScreeningResults | -> ofacScreeningResults |
| response.ofacMatchScore | -> ofacMatchScore |
| response.ofacClearStatus | -> ofacClearStatus |

---

##### Task 5.4: HT-11 OFAC Fuzzy Match

**Type:** action
**Description:** Compliance Officer reviews an OFAC fuzzy match (≥85% score) for a screened party. Shows SDN entry details, match score gauge, party information, and research notes textarea. Outcomes: ClearParty, EscalateToLegal, or BlockShipment.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("OFAC SDN API Workflow") | =js:vars.ofacClearStatus == "FUZZY_MATCH" | Entry Rule 1 |

**HITL Implementation:** Action App: `<UNRESOLVED: HT-11 OFAC Fuzzy Match Action App>`

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| ofacScreeningResults | String | =vars.ofacScreeningResults | Yes |
| ofacMatchScore | Number | =vars.ofacMatchScore | Yes |
| partyNames | String | =vars.partyNames | Yes |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| Action | -> ofacFuzzyOutcome |
| — | ofacClearStatus = =js:vars.ofacFuzzyOutcome == "ClearParty" ? "CLEAR" : vars.ofacClearStatus |

**Actions:**

| Button | Maps To | Behavior |
|--------|---------|----------|
| Clear Party | ofacClearStatus = "CLEAR" | Complete task — party cleared |
| Escalate To Legal | ofacClearStatus = "ESCALATED" | Complete task |
| Block Shipment | caseState = "BLOCKED" | Complete task — shipment blocked |

---

##### Task 5.5: HT-12 Confirmed OFAC Hit

**Type:** action
**Description:** Full-screen red alert for LegalCounsel and Management on a confirmed OFAC or Denied Party List hit. No dismiss — mandatory notes before any decision. Outcomes: BlockAndReport or LegalReview.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("OFAC SDN API Workflow") | =js:vars.ofacClearStatus == "CONFIRMED_HIT" | Entry Rule 1 |

**HITL Implementation:** Action App: `<UNRESOLVED: HT-12 Confirmed OFAC Hit Action App>`

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| ofacScreeningResults | String | =vars.ofacScreeningResults | Yes |
| ofacMatchScore | Number | =vars.ofacMatchScore | Yes |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| Action | -> ofacHitOutcome |

**Actions:**

| Button | Maps To | Behavior |
|--------|---------|----------|
| Block and Report | caseState = "BLOCKED" | Complete task — case blocked |
| Legal Review | caseState = "LEGAL_REVIEW" | Complete task — legal hold |

---

### Stage 6: Customs Entry Filing & CBP Clearance

**Type:** Stage
**Description:** Files the formal CBP customs entry (CBP Form 3461) and monitors for CBP release, exam selection, or requests for additional information (CF-28 / CF-29). Calculates final duty amounts. Human tasks handle exam notifications, CF-28 questions, and CF-29 CBP actions.
**Required for Case Completion:** Yes

#### Stage Entry Conditions

| WHEN | IF | Interrupting | Display Name |
|------|-----|-------------|--------------|
| selected-stage-completed("OFAC & Denied-Party Screening") | =js:vars.ofacClearStatus == "CLEAR" | No | Entry Rule 1 |

#### Stage Exit Conditions

| WHEN | IF | Exit Type | Marks Stage Complete | Display Name |
|------|-----|-----------|---------------------|--------------|
| required-tasks-completed | — | exit-only | Yes | Complete Rule 1 |

#### Stage SLA

| SLA | Unit | At-Risk | At-Risk Action | Breach Action |
|-----|------|---------|----------------|---------------|
| 48 | h | 75% | Notify: CustomsBroker Team | Notify: Trade Operations Manager |

#### Tasks

| # | Task Name | Type | Required | Run Only Once | Persona | SLA |
|---|-----------|------|----------|---------------|---------|-----|
| 1 | CBP 3461 Form Bot | rpa | Yes | Yes | — | — |
| 2 | CBP Status Polling Workflow | api-workflow | Yes | No | — | — |
| 3 | Duty Calculation Workflow | api-workflow | Yes | Yes | — | — |
| 4 | HT-13 CBP Exam Selected | action | No | No | PortAgent | 4 h |
| 5 | HT-14 CF-28 Unanswered Questions | action | No | No | CustomsBroker | 120 h |
| 6 | HT-15 CF-29 CBP Action | action | No | No | CustomsBroker | 48 h |

---

##### Task 6.1: CBP 3461 Form Bot

**Type:** rpa
**Description:** RPA bot fills and submits CBP Form 3461 (Entry/Immediate Delivery) via the ACE portal using the confirmed HTS code, duty calculations, and shipment data. Returns the assigned CBP entry number.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| current-stage-entered | — | Entry Rule 1 |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| htsCode | string | =vars.htsCode |
| totalValueUsd | float | =vars.totalValueUsd |
| dutyAmountUsd | float | =vars.dutyAmountUsd |
| portOfEntry | string | =vars.portOfEntry |
| poNumber | string | =vars.poNumber |
| supplierName | string | =vars.supplierName |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| response.entryNumber | -> entryNumber |
| response.cbpStatus | -> cbpStatus |

---

##### Task 6.2: CBP Status Polling Workflow

**Type:** api-workflow
**Description:** Polls the CBP ACE status API for the customs entry decision — Released, Exam Selected, CF-28 issued, or CF-29 action. Updates cbpStatus and sets examType or question arrays accordingly.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("CBP 3461 Form Bot") | — | Entry Rule 1 |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| entryNumber | string | =vars.entryNumber |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| response.cbpStatus | -> cbpStatus |
| response.examType | -> examType |
| response.cf28Questions | -> cf28Questions |
| response.cf29ActionType | -> cf29ActionType |
| response.actualDutyUsd | -> actualDutyUsd |

---

##### Task 6.3: Duty Calculation Workflow

**Type:** api-workflow
**Description:** Calculates final landed duty using actual CBP-assessed duty rate, Section 301 tariffs, ADD/CVD, MPF, and HMF. Computes variance between estimated duty at entry filing and actual duty assessed. Feeds duty reconciliation in S7.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("CBP Status Polling Workflow") | =js:vars.cbpStatus == "RELEASED" | Entry Rule 1 |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| htsCode | string | =vars.htsCode |
| totalValueUsd | float | =vars.totalValueUsd |
| actualDutyUsd | float | =vars.actualDutyUsd |
| estimatedDutyUsd | float | =vars.estimatedDutyUsd |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| response.dutyVarianceUsd | -> dutyVarianceUsd |
| response.dutyVariancePct | -> dutyVariancePct |
| response.mpfAmount | -> mpfAmount |
| response.hmfAmount | -> hmfAmount |

---

##### Task 6.4: HT-13 CBP Exam Selected

**Type:** action
**Description:** Port Agent acknowledges CBP exam selection and provides exam logistics — port agent contact, exam location, and estimated duration. Outcomes: Acknowledged or RequestClarification.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("CBP Status Polling Workflow") | =js:vars.cbpStatus == "EXAM" | Entry Rule 1 |

**HITL Implementation:** Action App: `<UNRESOLVED: HT-13 CBP Exam Action App>`

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| examType | String | =vars.examType | Yes |
| portOfEntry | String | =vars.portOfEntry | Yes |
| entryNumber | String | =vars.entryNumber | Yes |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| Action | -> examOutcome |

**Actions:**

| Button | Maps To | Behavior |
|--------|---------|----------|
| Acknowledged | cbpStatus = "EXAM_ACKNOWLEDGED" | Complete task |
| Request Clarification | cbpStatus = "EXAM_CLARIFICATION" | Complete task |

---

##### Task 6.5: HT-14 CF-28 Unanswered Questions

**Type:** action
**Description:** Customs Broker and ImporterOps respond to CBP CF-28 questions within the 5-day deadline. One section per CBP question with a progress bar deadline indicator. Outcomes: SubmitResponse or RequestCBPExtension.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("CBP Status Polling Workflow") | =js:vars.cbpStatus == "CF28_ISSUED" | Entry Rule 1 |

**HITL Implementation:** Action App: `<UNRESOLVED: HT-14 CF-28 Action App>`

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| cf28Questions | String | =vars.cf28Questions | Yes |
| entryNumber | String | =vars.entryNumber | Yes |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| Action | -> cf28Outcome |

**Actions:**

| Button | Maps To | Behavior |
|--------|---------|----------|
| Submit Response | cbpStatus = "CF28_ANSWERED" | Complete task |
| Request CBP Extension | cbpStatus = "CF28_EXTENSION" | Complete task |

---

##### Task 6.6: HT-15 CF-29 CBP Action

**Type:** action
**Description:** Customs Broker and LegalCounsel review CBP CF-29 action (rate advance, value change, or other post-entry action). Shows duty delta calculation and protest deadline countdown. Outcomes: AcceptAction or FileCBPProtest.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("CBP Status Polling Workflow") | =js:vars.cbpStatus == "CF29_ISSUED" | Entry Rule 1 |

**HITL Implementation:** Action App: `<UNRESOLVED: HT-15 CF-29 Action App>`

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| cf29ActionType | String | =vars.cf29ActionType | Yes |
| dutyVarianceUsd | Number | =vars.dutyVarianceUsd | Yes |
| entryNumber | String | =vars.entryNumber | Yes |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| Action | -> cf29Outcome |

**Actions:**

| Button | Maps To | Behavior |
|--------|---------|----------|
| Accept Action | cbpStatus = "CF29_ACCEPTED" | Complete task |
| File CBP Protest | cbpStatus = "PROTEST_FILED" | Complete task |

---

### Stage 7: Document Management & Post-Entry

**Type:** Stage
**Description:** Archives all shipment documents to the DMS, posts landed costs to ERP, and runs duty savings analysis. Human tasks resolve document discrepancies, review duty variances, and decide on duty savings opportunities. Completion closes the import case.
**Required for Case Completion:** Yes

#### Stage Entry Conditions

| WHEN | IF | Interrupting | Display Name |
|------|-----|-------------|--------------|
| selected-stage-completed("Customs Entry Filing & CBP Clearance") | =js:vars.cbpStatus == "RELEASED" | No | Entry Rule 1 |

#### Stage Exit Conditions

| WHEN | IF | Exit Type | Marks Stage Complete | Display Name |
|------|-----|-----------|---------------------|--------------|
| required-tasks-completed | — | exit-only | Yes | Complete Rule 1 |

#### Stage SLA

| SLA | Unit | At-Risk | At-Risk Action | Breach Action |
|-----|------|---------|----------------|---------------|
| 5 | d | 75% | Notify: ImporterOps Team | Notify: Trade Operations Manager |

#### Tasks

| # | Task Name | Type | Required | Run Only Once | Persona | SLA |
|---|-----------|------|----------|---------------|---------|-----|
| 1 | DMS Archive Workflow | rpa | Yes | Yes | — | — |
| 2 | ERP Landed Cost Workflow | rpa | Yes | Yes | — | — |
| 3 | Duty Savings Analysis Agent | agent | Yes | Yes | — | — |
| 4 | HT-16 Document Discrepancy | action | No | No | ImporterOps | 4 h |
| 5 | HT-17 Duty Variance Review | action | No | No | Finance | 48 h |
| 6 | HT-18 Duty Savings Opportunity | action | No | No | TradeCounsel | 120 h |

---

##### Task 7.1: DMS Archive Workflow

**Type:** rpa
**Description:** RPA bot archives all shipment documents (commercial invoice, packing list, bill of lading, certificate of origin, ISF filing, CBP entry, duty calculation, OFAC clearance, PGA permits) to the Document Management System with 5–7 year retention tagging. Sets archivalStatus and documentationComplete flag.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| current-stage-entered | — | Entry Rule 1 |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| documentList | jsonSchema | =vars.documentList |
| poNumber | string | =vars.poNumber |
| entryNumber | string | =vars.entryNumber |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| response.archivalStatus | -> archivalStatus |
| response.documentationComplete | -> documentationComplete |

---

##### Task 7.2: ERP Landed Cost Workflow

**Type:** rpa
**Description:** RPA bot posts the final landed cost (goods value + duty + MPF + HMF + freight) to the ERP system against the original purchase order. Sets landedCostPosted flag upon successful GL posting.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| current-stage-entered | — | Entry Rule 1 |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| poNumber | string | =vars.poNumber |
| totalValueUsd | float | =vars.totalValueUsd |
| actualDutyUsd | float | =vars.actualDutyUsd |
| mpfAmount | float | =vars.mpfAmount |
| hmfAmount | float | =vars.hmfAmount |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| response.landedCostPosted | -> landedCostPosted |

---

##### Task 7.3: Duty Savings Analysis Agent

**Type:** agent
**Description:** LangGraph-based Duty Savings Analysis Agent evaluates the shipment for post-entry duty optimization opportunities — FTZ benefits, first-sale valuation, duty drawback, bonded warehouse, or Chapter 98 provisions. Produces an opportunity type and estimated savings amount for TradeCounsel review.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("DMS Archive Workflow") | — | Entry Rule 1 |

**Inputs:**

| Field | Type | Binding |
|-------|------|---------|
| htsCode | string | =vars.htsCode |
| totalValueUsd | float | =vars.totalValueUsd |
| actualDutyUsd | float | =vars.actualDutyUsd |
| supplierCountry | string | =vars.supplierCountry |
| cooDeclaration | string | =vars.cooDeclaration |

**Outputs:**

| Field | Binding / Value |
|-------|------------------|
| response.dutySavingsOpportunity | -> dutySavingsOpportunity |
| response.estimatedSavingsUsd | -> estimatedSavingsUsd |

---

##### Task 7.4: HT-16 Document Discrepancy

**Type:** action
**Description:** ImporterOps resolves document discrepancies detected during DMS archival — mismatched values between invoice, packing list, and CBP entry. Outcomes: Corrected, AcceptVariance, or EscalateToFinance.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("DMS Archive Workflow") | =js:vars.documentationComplete == false | Entry Rule 1 |

**HITL Implementation:** Action App: `<UNRESOLVED: HT-16 Document Discrepancy Action App>`

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| documentList | String | =vars.documentList | Yes |
| poNumber | String | =vars.poNumber | Yes |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| Action | -> docDiscrepancyOutcome |
| — | documentationComplete = true |

**Actions:**

| Button | Maps To | Behavior |
|--------|---------|----------|
| Corrected | documentationComplete = true | Complete task |
| Accept Variance | documentationComplete = true | Complete task |
| Escalate To Finance | caseState = "ESCALATED" | Complete task |

---

##### Task 7.5: HT-17 Duty Variance Review

**Type:** action
**Description:** Finance reviews the variance between estimated duty at entry filing and actual CBP-assessed duty. Side-by-side comparison with variance highlighted when above threshold. Outcomes: ApproveVariance or InvestigateVariance.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("ERP Landed Cost Workflow") | =js:vars.dutyVariancePct > 5 | Entry Rule 1 |

**HITL Implementation:** Action App: `<UNRESOLVED: HT-17 Duty Variance Review Action App>`

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| estimatedDutyUsd | Number | =vars.estimatedDutyUsd | Yes |
| actualDutyUsd | Number | =vars.actualDutyUsd | Yes |
| dutyVarianceUsd | Number | =vars.dutyVarianceUsd | Yes |
| dutyVariancePct | Number | =vars.dutyVariancePct | Yes |
| htsCode | String | =vars.htsCode | Yes |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| Action | -> dutyVarianceOutcome |

**Actions:**

| Button | Maps To | Behavior |
|--------|---------|----------|
| Approve Variance | caseState = "ACTIVE" | Complete task — variance approved |
| Investigate Variance | caseState = "UNDER_INVESTIGATION" | Complete task |

---

##### Task 7.6: HT-18 Duty Savings Opportunity

**Type:** action
**Description:** Trade Counsel reviews and decides on duty savings opportunities identified by the Duty Savings Analysis Agent — FTZ, duty drawback, first-sale, bonded warehouse, or Chapter 98. 5-day SLA. Outcomes: PursueSavings or DeclineSavings.

**Entry Condition:**

| WHEN | IF | Display Name |
|------|-----|--------------|
| selected-tasks-completed("Duty Savings Analysis Agent") | =js:vars.dutySavingsOpportunity != "NONE" | Entry Rule 1 |

**HITL Implementation:** Action App: `<UNRESOLVED: HT-18 Duty Savings Action App>`

**Input Schema:**

| Field | Type | Binding | Required |
|-------|------|---------|----------|
| dutySavingsOpportunity | String | =vars.dutySavingsOpportunity | Yes |
| estimatedSavingsUsd | Number | =vars.estimatedSavingsUsd | Yes |
| htsCode | String | =vars.htsCode | Yes |

**Output Schema:**

| Field | Binding / Value |
|-------|------------------|
| Action | -> dutySavingsDecision |

**Actions:**

| Button | Maps To | Behavior |
|--------|---------|----------|
| Pursue Savings | dutySavingsOpportunity = =vars.dutySavingsOpportunity | Complete task — savings pursued |
| Decline Savings | dutySavingsOpportunity = "DECLINED" | Complete task |

---

## Section 3: Personas & App Views

### Personas

| Persona | Stage Scope | Permissions | Description |
|---------|-------------|-------------|-------------|
| ImporterOps | S1, S6, S7 | View, Act, Reassign | Trade operations staff responsible for PO intake, document management, and document discrepancy resolution |
| ComplianceOfficer | S1, S3, S4, S5 | View, Act, Reassign, Escalate | Compliance officer managing COO verification, PGA documentation, and OFAC screening reviews |
| CustomsBroker | S2, S3, S4, S6 | View, Act, Reassign | Licensed customs broker handling ISF filing, HTS classification review, and CBP entry management |
| ClassificationSpecialist | S3 | View, Act | HTS classification specialist for manual tariff classification when AI confidence is low |
| PortAgent | S6 | View, Act | Port-side agent coordinating CBP exam logistics and port operations |
| Finance | S7 | View, Act | Finance team reviewing duty variances and approving GL postings |
| TradeCounsel | S7 | View, Act, Escalate | Trade counsel evaluating duty savings opportunities and legal trade strategies |
| LegalCounsel | S2, S4, S5 | View, Act, Escalate | Legal counsel for escalations involving ISF Do Not Load, PGA refusals, and OFAC confirmed hits |
| PlatformAdmin | All | View, Act, Reassign, Escalate, Admin | Platform administrator with full access to all stages and administrative functions |

### Process App Views

| App | View | Persona | Purpose | Key Components |
|-----|------|---------|---------|----------------|
| TradeFlow Operations Dashboard | Case List | All | Browse and filter all active import cases by stage, status, broker, and SLA urgency | Paginated case table, stage filter, SLA urgency badges, broker filter |
| TradeFlow Operations Dashboard | Case Detail | All | Full 7-stage case view with stage rail, timeline, and task inbox | Stage progress rail (S1→S7), case header (17 fields), merged event timeline, task inbox panel |
| TradeFlow Operations Dashboard | Task Inbox | All | Role-filtered pending human tasks sorted by SLA urgency | Task cards with SLA countdown, task type badge, decision buttons |
| TradeFlow Operations Dashboard | KPI Dashboard | PlatformAdmin, ComplianceOfficer | Operational metrics and compliance KPIs | 8 KPI tiles, SLA breach rail, connector status panel |
| TradeFlow Operations Dashboard | Audit Log | PlatformAdmin, ComplianceOfficer | Compliance audit trail with retention tracking | Filterable audit log, retention badges |
| TradeFlow Operations Dashboard | Admin Panel | PlatformAdmin | User management and role assignments | User list, role assignment interface |

---

## Section 4: Integrations

### Integration Service Connectors

| Connector | System | Auth Method | Operations Used | Used By Tasks |
|-----------|--------|-------------|-----------------|---------------|
| Microsoft Outlook 365 | Email / Microsoft 365 | OAuth2 | Email Received (event trigger) | Case Trigger T02 |
| Salesforce | Salesforce CRM | OAuth2 | Record Created (event trigger), Get Record | Case Trigger T03, PO Data Fetch |
| CBP ACE | US Customs and Border Protection ACE Portal | API Key | ISF Filing Submit, ISF Status Query, Entry Filing, Entry Status Query | ACE ISF Filing Workflow, CBP Status Polling Workflow |
| OFAC SDN API | US Treasury OFAC SDN List | API Key | Party Screening, Match Score Retrieval | OFAC SDN API Workflow |
| USITC HTS API | US International Trade Commission | API Key | HTS Duty Rate Lookup, PGA Flag Matrix | Duty Rate Lookup Workflow, PGA Flag Workflow |

### External Agents

| Agent | Service Type | Endpoint | Used By Tasks |
|-------|-------------|----------|---------------|
| COO Classification Agent | UiPath Coded Agent | UiPath Orchestrator — deployed agent | COO Classification Agent (S1) |
| ISF Data Collector Agent | UiPath Coded Agent | UiPath Orchestrator — deployed agent | ISF Data Collector Agent (S2) |
| HTS Classification Agent | LangGraph / UiPath Coded Agent | UiPath Orchestrator — deployed agent | HTS Classification Agent (S3) |
| PGA Agency Coordinator Crew | CrewAI (external) | External API endpoint — `<UNRESOLVED>` | PGA Agency Coordinator (S4) |
| Party Extraction Agent | UiPath Coded Agent | UiPath Orchestrator — deployed agent | Party Extraction Agent (S5) |
| Transshipment Risk Agent | LangGraph / UiPath Coded Agent | UiPath Orchestrator — deployed agent | Transshipment Risk Agent (S5) |
| Duty Savings Analysis Agent | LangGraph / UiPath Coded Agent | UiPath Orchestrator — deployed agent | Duty Savings Analysis Agent (S7) |

---

*TradeXCase SDD — Cross-Border Import Operations Platform*
*Generated for UiPath Maestro Case Management | rpabotsworld.com | June 2026*
