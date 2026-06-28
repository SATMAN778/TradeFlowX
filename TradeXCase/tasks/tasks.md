# tasks.md — TradeXCase
## UiPath Maestro Case Plan — TradeX Cross-Border Import Operations Platform

> Generated from `sdd.md` | All action/rpa/agent/api-workflow tasks are UNRESOLVED pending tenant deployment.
> Phase 1 Planning — declarative only. No shell commands.

---

## Inventory

| Class | Count | T-range |
|---|---|---|
| Case file | 1 | T01 |
| Triggers | 2 | T02–T03 |
| Variables / arguments | 58 | T04–T61 |
| Stages | 7 | T62–T68 |
| Tasks | 39 | T69–T107 |
| Conditions (stage entry) | 8 | T108–T115 |
| Conditions (stage exit) | 7 | T116–T122 |
| Conditions (case exit) | 1 | T123 |
| Conditions (task entry) | 39 | T124–T162 |
| SLA (case + stages + action tasks) | 27 | T163–T189 |
| **Total** | **189** | T01–T189 |

---

## §4.2 Case File

## T01: Create case file "TradeXCase"
- name: TradeXCase
- description: Manages the full cross-border import lifecycle — PO intake, ISF 10+2 filing, HTS classification, PGA screening, OFAC denied-party screening, CBP customs entry, and post-entry duty reconciliation.
- case-identifier-type: external
- case-identifier: =vars.poNumber
- case-app-enabled: true
- priority-choiceset: Standard, Urgent, Compliance-Hold
- priority-default: Standard
- order: first
- verify: Case file created; projectId captured in operate.json

---

## §4.3 Triggers

## T02: Configure event trigger "Trade Order Email Received"
- display-name: Trade Order Email Received
- description: Fires when a trade order email is received in the monitored Outlook 365 inbox
- serviceType: Intsvc.EventTrigger
- connector: Microsoft Outlook 365
- connector-key: uipath-microsoft-office-365-outlook
- object-name: Email
- event-operation: Email Received
- filter: subject contains "TRADE ORDER"
- input-values: parentFolderId = Inbox
- connection-id: <UNRESOLVED: no IS connection for Outlook 365 provisioned on tenant>
- type-id: <UNRESOLVED: resolve from typecache-triggers-index.json>
- order: after T01
- verify: Trigger node appended; TriggerId captured for variable sourceTriggers wiring

## T03: Configure event trigger "Salesforce Trade Order Created"
- display-name: Salesforce Trade Order Created
- description: Fires when a new Trade Order record is created in Salesforce CRM
- serviceType: Intsvc.EventTrigger
- connector: Salesforce
- connector-key: uipath-salesforce
- object-name: Trade Order
- event-operation: Record Created
- connection-id: <UNRESOLVED: no IS connection for Salesforce provisioned on tenant>
- type-id: <UNRESOLVED: resolve from typecache-triggers-index.json>
- order: after T02
- verify: Trigger node appended; TriggerId captured for variable sourceTriggers wiring

---

## §4.2.1 Variables & Arguments

## T04: Declare variable "triggerSource"
- category: Variable
- type: string
- sourceTriggers: T02, T03
- sourceFields: T02: response.triggerType; T03: response.triggerType
- default: "MANUAL"
- description: Which trigger initiated the case: EMAIL or SALESFORCE

## T05: Declare variable "emailSubject"
- category: Variable
- type: string
- sourceTriggers: T02
- sourceFields: response.subject
- default: (empty)
- description: Subject line of the incoming trade order email

## T06: Declare variable "senderEmail"
- category: Variable
- type: string
- sourceTriggers: T02
- sourceFields: response.from
- default: (empty)
- description: Email address of the trade order sender

## T07: Declare variable "sfRecordId"
- category: Variable
- type: string
- sourceTriggers: T03
- sourceFields: response.recordId
- default: (empty)
- description: Salesforce record ID of the trade order

## T08: Declare variable "poNumber"
- category: Variable
- type: string
- sourceTriggers: (none)
- sourceFields: (none)
- default: (empty)
- description: Purchase order number — populated by PO Data Fetch task

## T09: Declare variable "supplierName"
- category: Variable
- type: string
- sourceTriggers: (none)
- sourceFields: (none)
- default: (empty)
- description: Supplier / exporter name

## T10: Declare variable "supplierAddress"
- category: Variable
- type: string
- sourceTriggers: (none)
- sourceFields: (none)
- default: (empty)
- description: Supplier full address

## T11: Declare variable "supplierCountry"
- category: Variable
- type: string
- sourceTriggers: (none)
- sourceFields: (none)
- default: (empty)
- description: Supplier country (declared country of origin)

## T12: Declare variable "goodsDescription"
- category: Variable
- type: string
- sourceTriggers: (none)
- sourceFields: (none)
- default: (empty)
- description: Description of goods being imported

## T13: Declare variable "quantity"
- category: Variable
- type: integer
- sourceTriggers: (none)
- sourceFields: (none)
- default: 0
- description: Quantity of goods

## T14: Declare variable "unitPriceUsd"
- category: Variable
- type: float
- sourceTriggers: (none)
- sourceFields: (none)
- default: 0
- description: Unit price in USD

## T15: Declare variable "totalValueUsd"
- category: Variable
- type: float
- sourceTriggers: (none)
- sourceFields: (none)
- default: 0
- description: Total shipment value in USD

## T16: Declare variable "incoterms"
- category: Variable
- type: string
- sourceTriggers: (none)
- sourceFields: (none)
- default: (empty)
- description: Trade terms (FOB, CIF, DDP, etc.)

## T17: Declare variable "expectedShipDate"
- category: Variable
- type: date
- sourceTriggers: (none)
- sourceFields: (none)
- default: (empty)
- description: Expected ship date from origin

## T18: Declare variable "portOfLoading"
- category: Variable
- type: string
- sourceTriggers: (none)
- sourceFields: (none)
- default: (empty)
- description: Origin port of loading

## T19: Declare variable "portOfEntry"
- category: Variable
- type: string
- sourceTriggers: (none)
- sourceFields: (none)
- default: (empty)
- description: US port of entry

## T20: Declare variable "blNumber"
- category: Variable
- type: string
- sourceTriggers: (none)
- sourceFields: (none)
- default: (empty)
- description: Bill of lading number

## T21: Declare variable "cooDeclaration"
- category: Variable
- type: string
- sourceTriggers: (none)
- sourceFields: (none)
- default: (empty)
- description: Declared country of origin

## T22: Declare variable "cooVerified"
- category: Variable
- type: boolean
- sourceTriggers: (none)
- sourceFields: (none)
- default: false
- description: Whether COO has been verified by compliance

## T23: Declare variable "transshipmentFlag"
- category: Variable
- type: boolean
- sourceTriggers: (none)
- sourceFields: (none)
- default: false
- description: Whether transshipment risk detected

## T24: Declare variable "transshipmentRisk"
- category: Variable
- type: string
- sourceTriggers: (none)
- sourceFields: (none)
- default: "LOW"
- description: Transshipment risk level: LOW / MEDIUM / HIGH

## T25: Declare variable "poDataComplete"
- category: Variable
- type: boolean
- sourceTriggers: (none)
- sourceFields: (none)
- default: false
- description: Whether all required PO fields are present

## T26: Declare variable "cooVerificationRequired"
- category: Variable
- type: boolean
- sourceTriggers: (none)
- sourceFields: (none)
- default: false
- description: Whether COO requires human verification

## T27: Declare variable "documentList"
- category: Variable
- type: jsonSchema
- sourceTriggers: (none)
- sourceFields: (none)
- default: (empty)
- description: List of documents saved to UiPath Storage

## T28: Declare variable "isfStatus"
- category: Variable
- type: string
- sourceTriggers: (none)
- sourceFields: (none)
- default: "PENDING"
- description: ISF filing status: PENDING / SUBMITTED / REJECTED / ACCEPTED / DO_NOT_LOAD

## T29: Declare variable "isfTxnNumber"
- category: Variable
- type: string
- sourceTriggers: (none)
- sourceFields: (none)
- default: (empty)
- description: ISF transaction number from ACE

## T30: Declare variable "isfDeadlineUtc"
- category: Variable
- type: string
- sourceTriggers: (none)
- sourceFields: (none)
- default: (empty)
- description: ISF 24-hour pre-departure deadline (ISO UTC string)

## T31: Declare variable "isfDataComplete"
- category: Variable
- type: boolean
- sourceTriggers: (none)
- sourceFields: (none)
- default: false
- description: Whether all 10+2 ISF elements are collected

## T32: Declare variable "isfAmendmentRequired"
- category: Variable
- type: boolean
- sourceTriggers: (none)
- sourceFields: (none)
- default: false
- description: Whether ISF requires material amendment after CBP polling

## T33: Declare variable "htsCode"
- category: Variable
- type: string
- sourceTriggers: (none)
- sourceFields: (none)
- default: (empty)
- description: Confirmed HTS code

## T34: Declare variable "htsCandidates"
- category: Variable
- type: jsonSchema
- sourceTriggers: (none)
- sourceFields: (none)
- default: (empty)
- description: AI HTS classification candidates — top 3 with confidence scores and ruling citations

## T35: Declare variable "htsConfidence"
- category: Variable
- type: float
- sourceTriggers: (none)
- sourceFields: (none)
- default: 0
- description: Confidence score of top AI HTS candidate (0–100)

## T36: Declare variable "dutyRatePct"
- category: Variable
- type: float
- sourceTriggers: (none)
- sourceFields: (none)
- default: 0
- description: Applicable combined duty rate percentage

## T37: Declare variable "dutyAmountUsd"
- category: Variable
- type: float
- sourceTriggers: (none)
- sourceFields: (none)
- default: 0
- description: Calculated total duty amount in USD

## T38: Declare variable "mpfAmount"
- category: Variable
- type: float
- sourceTriggers: (none)
- sourceFields: (none)
- default: 0
- description: Merchandise Processing Fee amount

## T39: Declare variable "hmfAmount"
- category: Variable
- type: float
- sourceTriggers: (none)
- sourceFields: (none)
- default: 0
- description: Harbor Maintenance Fee amount

## T40: Declare variable "pgaFlag"
- category: Variable
- type: boolean
- sourceTriggers: (none)
- sourceFields: (none)
- default: false
- description: Whether PGA (Partner Government Agency) review is required

## T41: Declare variable "pgaAgencies"
- category: Variable
- type: jsonSchema
- sourceTriggers: (none)
- sourceFields: (none)
- default: (empty)
- description: List of PGA agencies requiring review for this HTS code

## T42: Declare variable "pgaStatus"
- category: Variable
- type: string
- sourceTriggers: (none)
- sourceFields: (none)
- default: "NOT_REQUIRED"
- description: PGA screening status: NOT_REQUIRED / DOCS_SUBMITTED / MAY_HOLD / REFUSED / APPROVED

## T43: Declare variable "partyNames"
- category: Variable
- type: jsonSchema
- sourceTriggers: (none)
- sourceFields: (none)
- default: (empty)
- description: Structured list of all parties for OFAC screening (seller, manufacturer, importer, carrier, consignee)

## T44: Declare variable "ofacScreeningResults"
- category: Variable
- type: jsonSchema
- sourceTriggers: (none)
- sourceFields: (none)
- default: (empty)
- description: OFAC SDN screening results per party with match scores

## T45: Declare variable "ofacMatchScore"
- category: Variable
- type: float
- sourceTriggers: (none)
- sourceFields: (none)
- default: 0
- description: Highest OFAC match score across all screened parties (0–100)

## T46: Declare variable "ofacClearStatus"
- category: Variable
- type: string
- sourceTriggers: (none)
- sourceFields: (none)
- default: "PENDING"
- description: OFAC status: PENDING / CLEAR / FUZZY_MATCH / CONFIRMED_HIT / ESCALATED / BLOCKED

## T47: Declare variable "entryNumber"
- category: Variable
- type: string
- sourceTriggers: (none)
- sourceFields: (none)
- default: (empty)
- description: CBP customs entry number assigned after 3461 filing

## T48: Declare variable "cbpStatus"
- category: Variable
- type: string
- sourceTriggers: (none)
- sourceFields: (none)
- default: "PENDING"
- description: CBP entry status: PENDING / FILED / EXAM / RELEASED / CF28_ISSUED / CF29_ISSUED / LIQUIDATED

## T49: Declare variable "examType"
- category: Variable
- type: string
- sourceTriggers: (none)
- sourceFields: (none)
- default: (empty)
- description: CBP exam type if selected: INTENSIVE / CET / NII

## T50: Declare variable "cf28Questions"
- category: Variable
- type: jsonSchema
- sourceTriggers: (none)
- sourceFields: (none)
- default: (empty)
- description: Array of CF-28 questions from CBP with questionId and questionText

## T51: Declare variable "cf29ActionType"
- category: Variable
- type: string
- sourceTriggers: (none)
- sourceFields: (none)
- default: (empty)
- description: CF-29 action type from CBP (rate advance, value change, etc.)

## T52: Declare variable "estimatedDutyUsd"
- category: Variable
- type: float
- sourceTriggers: (none)
- sourceFields: (none)
- default: 0
- description: Estimated duty at entry filing time (pre-CBP assessment)

## T53: Declare variable "actualDutyUsd"
- category: Variable
- type: float
- sourceTriggers: (none)
- sourceFields: (none)
- default: 0
- description: Actual duty assessed by CBP after entry review

## T54: Declare variable "dutyVarianceUsd"
- category: Variable
- type: float
- sourceTriggers: (none)
- sourceFields: (none)
- default: 0
- description: Dollar variance between estimated and actual duty

## T55: Declare variable "dutyVariancePct"
- category: Variable
- type: float
- sourceTriggers: (none)
- sourceFields: (none)
- default: 0
- description: Percentage variance between estimated and actual duty

## T56: Declare variable "documentationComplete"
- category: Variable
- type: boolean
- sourceTriggers: (none)
- sourceFields: (none)
- default: false
- description: Whether all 9 required shipment documents are present and archived

## T57: Declare variable "archivalStatus"
- category: Variable
- type: string
- sourceTriggers: (none)
- sourceFields: (none)
- default: "PENDING"
- description: DMS archival status: PENDING / ARCHIVED / PARTIAL

## T58: Declare variable "landedCostPosted"
- category: Variable
- type: boolean
- sourceTriggers: (none)
- sourceFields: (none)
- default: false
- description: Whether landed cost has been posted to ERP GL

## T59: Declare variable "dutySavingsOpportunity"
- category: Variable
- type: string
- sourceTriggers: (none)
- sourceFields: (none)
- default: "NONE"
- description: Type of duty savings opportunity: NONE / FTZ / DRAWBACK / FIRST_SALE / BONDED / CHAPTER_98 / DECLINED

## T60: Declare variable "estimatedSavingsUsd"
- category: Variable
- type: float
- sourceTriggers: (none)
- sourceFields: (none)
- default: 0
- description: Estimated savings in USD from duty optimization opportunity

## T61: Declare variable "caseState"
- category: Variable
- type: string
- sourceTriggers: (none)
- sourceFields: (none)
- default: "ACTIVE"
- description: Overall case state: ACTIVE / ON_HOLD / BLOCKED / ESCALATED / LEGAL_REVIEW / REJECTED / CLOSED

---

## §4.4 Stages

## T62: Create stage "Trade Order Intake"
- type: Stage
- displayName: Trade Order Intake
- description: Initiates on email or Salesforce trigger. Fetches and validates PO fields, saves documents to UiPath Storage, runs COO transshipment risk classification.
- isRequired: true
- order: after T61
- verify: Stage node created; stageId captured

## T63: Create stage "ISF 10+2 Filing"
- type: Stage
- displayName: ISF 10+2 Filing
- description: Prepares, submits, and monitors the ISF 10+2 filing to CBP ACE. Handles missing elements, Do Not Load, and material amendments.
- isRequired: true
- order: after T62
- verify: Stage node created; stageId captured

## T64: Create stage "HTS Classification & Duty"
- type: Stage
- displayName: HTS Classification & Duty
- description: IDP extraction, AI HTS classification (LangGraph), duty rate lookup, and PGA flag evaluation. Human review for confidence below 90%.
- isRequired: true
- order: after T63
- verify: Stage node created; stageId captured

## T65: Create stage "PGA Screening"
- type: Stage
- displayName: PGA Screening
- description: Conditional stage — runs only when pgaFlag=true. CrewAI PGA Coordinator manages agency submissions; RPA polls for approval / hold / refusal.
- isRequired: false
- order: after T64
- verify: Stage node created; stageId captured; isRequired=false confirmed

## T66: Create stage "OFAC & Denied-Party Screening"
- type: Stage
- displayName: OFAC & Denied-Party Screening
- description: Party extraction agent, LangGraph transshipment risk refinement, and OFAC SDN API screening of all parties. Human review for fuzzy matches and confirmed hits.
- isRequired: true
- order: after T65
- verify: Stage node created; stageId captured

## T67: Create stage "Customs Entry Filing & CBP Clearance"
- type: Stage
- displayName: Customs Entry Filing & CBP Clearance
- description: CBP Form 3461 filing via RPA, ACE status polling, duty calculation, and exam/CF-28/CF-29 human task handling.
- isRequired: true
- order: after T66
- verify: Stage node created; stageId captured

## T68: Create stage "Document Management & Post-Entry"
- type: Stage
- displayName: Document Management & Post-Entry
- description: DMS archival of all documents, ERP landed cost posting, duty savings analysis, and final human reviews for discrepancies, variances, and savings opportunities.
- isRequired: true
- order: after T67
- verify: Stage node created; stageId captured

---

## §4.6 Tasks — Stage 1: Trade Order Intake

## T69: Add api-workflow task "PO Data Fetch" to "Trade Order Intake"
- type: api-workflow
- displayName: PO Data Fetch
- taskTypeId: <UNRESOLVED: api-workflow process not yet published — search api-index.json for "PO Data Fetch" or "Salesforce PO">
- isRequired: true
- runOnlyOnce: true
- lane: 0
- stage: Trade Order Intake
- order: after T68
- verify: Task node created; placeholder if unresolved
```text
wiring notes (user must attach):
  inputs:  triggerSource=vars.triggerSource, sfRecordId=vars.sfRecordId, emailSubject=vars.emailSubject
  outputs: response.poNumber->poNumber, response.supplierName->supplierName, response.supplierAddress->supplierAddress,
           response.supplierCountry->supplierCountry, response.goodsDescription->goodsDescription,
           response.quantity->quantity, response.unitPriceUsd->unitPriceUsd, response.totalValueUsd->totalValueUsd,
           response.incoterms->incoterms, response.expectedShipDate->expectedShipDate,
           response.portOfLoading->portOfLoading, response.portOfEntry->portOfEntry,
           response.blNumber->blNumber, response.cooDeclaration->cooDeclaration,
           response.isComplete->poDataComplete
```

## T70: Add agent task "Email Document Collector" to "Trade Order Intake"
- type: agent
- displayName: Email Document Collector
- taskTypeId: <UNRESOLVED: agent not yet deployed — search agent-index.json for "Email Document Collector">
- isRequired: false
- runOnlyOnce: true
- lane: 1
- stage: Trade Order Intake
- order: after T69
- verify: Task node created; placeholder if unresolved
```text
wiring notes (user must attach):
  inputs:  senderEmail=vars.senderEmail, emailSubject=vars.emailSubject, poNumber=vars.poNumber
  outputs: response.documentList->documentList
  condition: runs only when triggerSource=="EMAIL"
```

## T71: Add agent task "COO Classification Agent" to "Trade Order Intake"
- type: agent
- displayName: COO Classification Agent
- taskTypeId: <UNRESOLVED: agent not yet deployed — search agent-index.json for "COO Classification">
- isRequired: true
- runOnlyOnce: true
- lane: 2
- stage: Trade Order Intake
- order: after T69
- verify: Task node created; placeholder if unresolved
```text
wiring notes (user must attach):
  inputs:  cooDeclaration=vars.cooDeclaration, supplierCountry=vars.supplierCountry,
           portOfLoading=vars.portOfLoading, goodsDescription=vars.goodsDescription, totalValueUsd=vars.totalValueUsd
  outputs: response.transshipmentFlag->transshipmentFlag, response.transshipmentRisk->transshipmentRisk,
           response.cooVerificationRequired->cooVerificationRequired
```

## T72: Add action task "HT-01 Missing PO Fields" to "Trade Order Intake"
- type: action
- displayName: HT-01 Missing PO Fields
- taskTypeId: <UNRESOLVED: Action App not deployed — search action-apps-index.json for "Missing PO Fields" or "HT-01">
- isRequired: false
- runOnlyOnce: false
- lane: 3
- persona: ImporterOps
- stage: Trade Order Intake
- order: after T71
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  inputs:  poNumber=vars.poNumber, supplierName=vars.supplierName, goodsDescription=vars.goodsDescription, totalValueUsd=vars.totalValueUsd
  outputs: Action->caseState, poDataComplete=true
  buttons: Complete | Escalate
```

## T73: Add action task "HT-02 COO Verification" to "Trade Order Intake"
- type: action
- displayName: HT-02 COO Verification
- taskTypeId: <UNRESOLVED: Action App not deployed — search action-apps-index.json for "COO Verification" or "HT-02">
- isRequired: false
- runOnlyOnce: false
- lane: 4
- persona: ComplianceOfficer
- stage: Trade Order Intake
- order: after T71
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  inputs:  cooDeclaration=vars.cooDeclaration, supplierCountry=vars.supplierCountry,
           transshipmentRisk=vars.transshipmentRisk, transshipmentFlag=vars.transshipmentFlag
  outputs: Action->cooClearStatus, cooVerified = (cooClearStatus=="ConfirmCOO")
  buttons: Confirm COO | Reject Shipment | Request Documents
```

---

## §4.6 Tasks — Stage 2: ISF 10+2 Filing

## T74: Add agent task "ISF Data Collector Agent" to "ISF 10+2 Filing"
- type: agent
- displayName: ISF Data Collector Agent
- taskTypeId: <UNRESOLVED: agent not yet deployed — search agent-index.json for "ISF Data Collector">
- isRequired: true
- runOnlyOnce: true
- lane: 0
- stage: ISF 10+2 Filing
- order: after T73
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  inputs:  poNumber=vars.poNumber, supplierName=vars.supplierName, supplierAddress=vars.supplierAddress,
           blNumber=vars.blNumber, portOfLoading=vars.portOfLoading, portOfEntry=vars.portOfEntry, documentList=vars.documentList
  outputs: response.isfDataComplete->isfDataComplete, response.isfDeadlineUtc->isfDeadlineUtc
```

## T75: Add api-workflow task "ACE ISF Filing Workflow" to "ISF 10+2 Filing"
- type: api-workflow
- displayName: ACE ISF Filing Workflow
- taskTypeId: <UNRESOLVED: api-workflow not yet published — search api-index.json for "ACE ISF" or "ISF Filing">
- isRequired: true
- runOnlyOnce: true
- lane: 1
- stage: ISF 10+2 Filing
- order: after T74
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  entry condition: selected-tasks-completed("ISF Data Collector Agent") IF isfDataComplete==true
  inputs:  poNumber=vars.poNumber, isfDeadlineUtc=vars.isfDeadlineUtc
  outputs: response.isfTxnNumber->isfTxnNumber, response.isfStatus->isfStatus
```

## T76: Add rpa task "ACE ISF Status Poller" to "ISF 10+2 Filing"
- type: rpa
- displayName: ACE ISF Status Poller
- taskTypeId: <UNRESOLVED: rpa process not yet published — search process-index.json or processOrchestration-index.json for "ACE ISF Poller">
- isRequired: true
- runOnlyOnce: false
- lane: 2
- stage: ISF 10+2 Filing
- order: after T75
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  inputs:  isfTxnNumber=vars.isfTxnNumber
  outputs: response.isfStatus->isfStatus, response.isfAmendmentRequired->isfAmendmentRequired
```

## T77: Add action task "HT-03 Missing ISF Elements" to "ISF 10+2 Filing"
- type: action
- displayName: HT-03 Missing ISF Elements
- taskTypeId: <UNRESOLVED: Action App not deployed — search action-apps-index.json for "Missing ISF Elements" or "HT-03">
- isRequired: false
- runOnlyOnce: false
- lane: 3
- persona: CustomsBroker
- stage: ISF 10+2 Filing
- order: after T74
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  entry condition: selected-tasks-completed("ISF Data Collector Agent") IF isfDataComplete==false
  inputs:  isfDeadlineUtc=vars.isfDeadlineUtc, poNumber=vars.poNumber, supplierName=vars.supplierName
  outputs: Action->isfCollectionOutcome, isfDataComplete=true
  buttons: Submit ISF | Request From Carrier | Escalate
```

## T78: Add action task "HT-04 ISF Do Not Load" to "ISF 10+2 Filing"
- type: action
- displayName: HT-04 ISF Do Not Load
- taskTypeId: <UNRESOLVED: Action App not deployed — search action-apps-index.json for "ISF Do Not Load" or "HT-04">
- isRequired: false
- runOnlyOnce: false
- lane: 4
- persona: CustomsBroker
- stage: ISF 10+2 Filing
- order: after T76
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  entry condition: selected-tasks-completed("ACE ISF Status Poller") IF isfStatus=="DO_NOT_LOAD"
  inputs:  isfTxnNumber=vars.isfTxnNumber, isfStatus=vars.isfStatus
  outputs: Action->isfDoNotLoadOutcome
  buttons: Corrected and Resubmitted | Escalate Legal | Hold Shipment
```

## T79: Add action task "HT-05 ISF Material Amendment" to "ISF 10+2 Filing"
- type: action
- displayName: HT-05 ISF Material Amendment
- taskTypeId: <UNRESOLVED: Action App not deployed — search action-apps-index.json for "ISF Material Amendment" or "HT-05">
- isRequired: false
- runOnlyOnce: false
- lane: 5
- persona: CustomsBroker
- stage: ISF 10+2 Filing
- order: after T76
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  entry condition: selected-tasks-completed("ACE ISF Status Poller") IF isfAmendmentRequired==true
  inputs:  blNumber=vars.blNumber, isfTxnNumber=vars.isfTxnNumber
  outputs: Action->isfAmendmentOutcome, isfAmendmentRequired=false
  buttons: Amend and Resubmit | Hold For Review
```

---

## §4.6 Tasks — Stage 3: HTS Classification & Duty

## T80: Add rpa task "IDP Document Pipeline" to "HTS Classification & Duty"
- type: rpa
- displayName: IDP Document Pipeline
- taskTypeId: <UNRESOLVED: rpa/IDP process not yet published — search process-index.json for "IDP" or "Document Pipeline">
- isRequired: true
- runOnlyOnce: true
- lane: 0
- stage: HTS Classification & Duty
- order: after T79
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  inputs:  documentList=vars.documentList, poNumber=vars.poNumber
  outputs: response.extractedFields->documentList, response.goodsDescription->goodsDescription
```

## T81: Add agent task "HTS Classification Agent" to "HTS Classification & Duty"
- type: agent
- displayName: HTS Classification Agent
- taskTypeId: <UNRESOLVED: agent not yet deployed — search agent-index.json for "HTS Classification">
- isRequired: true
- runOnlyOnce: true
- lane: 1
- stage: HTS Classification & Duty
- order: after T80
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  inputs:  goodsDescription=vars.goodsDescription, supplierCountry=vars.supplierCountry, totalValueUsd=vars.totalValueUsd
  outputs: response.htsCandidates->htsCandidates, response.topHtsCode->htsCode, response.topConfidence->htsConfidence
```

## T82: Add api-workflow task "Duty Rate Lookup Workflow" to "HTS Classification & Duty"
- type: api-workflow
- displayName: Duty Rate Lookup Workflow
- taskTypeId: <UNRESOLVED: api-workflow not yet published — search api-index.json for "Duty Rate Lookup">
- isRequired: true
- runOnlyOnce: true
- lane: 2
- stage: HTS Classification & Duty
- order: after T81
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  entry condition: selected-tasks-completed("HTS Classification Agent") IF htsConfidence>=90
  inputs:  htsCode=vars.htsCode, totalValueUsd=vars.totalValueUsd, supplierCountry=vars.supplierCountry
  outputs: response.dutyRatePct->dutyRatePct, response.dutyAmountUsd->dutyAmountUsd,
           response.mpfAmount->mpfAmount, response.hmfAmount->hmfAmount,
           estimatedDutyUsd=vars.dutyAmountUsd
```

## T83: Add api-workflow task "PGA Flag Workflow" to "HTS Classification & Duty"
- type: api-workflow
- displayName: PGA Flag Workflow
- taskTypeId: <UNRESOLVED: api-workflow not yet published — search api-index.json for "PGA Flag">
- isRequired: true
- runOnlyOnce: true
- lane: 3
- stage: HTS Classification & Duty
- order: after T81
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  entry condition: selected-tasks-completed("HTS Classification Agent") IF htsConfidence>=90
  inputs:  htsCode=vars.htsCode, goodsDescription=vars.goodsDescription
  outputs: response.pgaFlag->pgaFlag, response.pgaAgencies->pgaAgencies
```

## T84: Add action task "HT-06 HTS Review 70-90%" to "HTS Classification & Duty"
- type: action
- displayName: HT-06 HTS Review 70-90%
- taskTypeId: <UNRESOLVED: Action App not deployed — search action-apps-index.json for "HTS Review" or "HT-06">
- isRequired: false
- runOnlyOnce: false
- lane: 4
- persona: CustomsBroker
- stage: HTS Classification & Duty
- order: after T81
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  entry condition: selected-tasks-completed("HTS Classification Agent") IF htsConfidence>=70 && htsConfidence<90
  inputs:  htsCandidates=vars.htsCandidates, htsConfidence=vars.htsConfidence, goodsDescription=vars.goodsDescription
  outputs: Action->htsReviewOutcome, ConfirmedHtsCode->htsCode
  buttons: Confirm AI Suggestion | Override With Manual | Escalate To Specialist
```

## T85: Add action task "HT-07 Manual HTS Classification" to "HTS Classification & Duty"
- type: action
- displayName: HT-07 Manual HTS Classification
- taskTypeId: <UNRESOLVED: Action App not deployed — search action-apps-index.json for "Manual HTS" or "HT-07">
- isRequired: false
- runOnlyOnce: false
- lane: 5
- persona: ClassificationSpecialist
- stage: HTS Classification & Duty
- order: after T81
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  entry condition: selected-tasks-completed("HTS Classification Agent") IF htsConfidence<70
  inputs:  htsCandidates=vars.htsCandidates, goodsDescription=vars.goodsDescription, htsConfidence=vars.htsConfidence
  outputs: Action->htsManualOutcome, ManualHtsCode->htsCode
  buttons: Submit HTS | Request Binding Ruling
```

## T86: Add action task "HT-08 PGA Documentation Required" to "HTS Classification & Duty"
- type: action
- displayName: HT-08 PGA Documentation Required
- taskTypeId: <UNRESOLVED: Action App not deployed — search action-apps-index.json for "PGA Documentation" or "HT-08">
- isRequired: false
- runOnlyOnce: false
- lane: 6
- persona: ComplianceOfficer
- stage: HTS Classification & Duty
- order: after T83
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  entry condition: selected-tasks-completed("PGA Flag Workflow") IF pgaFlag==true
  inputs:  pgaAgencies=vars.pgaAgencies, cooDeclaration=vars.cooDeclaration, supplierName=vars.supplierName
  outputs: Action->pgaDocOutcome
  buttons: Documents Submitted | Reject Transshipment | Escalate Legal
```

---

## §4.6 Tasks — Stage 4: PGA Screening

## T87: Add api-workflow task "PGA Agency Coordinator" to "PGA Screening"
- type: api-workflow
- displayName: PGA Agency Coordinator
- taskTypeId: <UNRESOLVED: CrewAI external crew — api-workflow process not yet published; search api-index.json for "PGA Agency Coordinator" or "PGA Coordinator">
- isRequired: true
- runOnlyOnce: true
- lane: 0
- stage: PGA Screening
- order: after T86
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  inputs:  pgaAgencies=vars.pgaAgencies, htsCode=vars.htsCode,
           goodsDescription=vars.goodsDescription, poNumber=vars.poNumber
  outputs: response.pgaStatus->pgaStatus
```

## T88: Add rpa task "PGA Status Polling Bot" to "PGA Screening"
- type: rpa
- displayName: PGA Status Polling Bot
- taskTypeId: <UNRESOLVED: rpa process not yet published — search process-index.json for "PGA Status Poller">
- isRequired: true
- runOnlyOnce: false
- lane: 1
- stage: PGA Screening
- order: after T87
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  inputs:  pgaAgencies=vars.pgaAgencies, poNumber=vars.poNumber
  outputs: response.pgaStatus->pgaStatus
```

## T89: Add action task "HT-09 PGA Hold" to "PGA Screening"
- type: action
- displayName: HT-09 PGA Hold
- taskTypeId: <UNRESOLVED: Action App not deployed — search action-apps-index.json for "PGA Hold" or "HT-09">
- isRequired: false
- runOnlyOnce: false
- lane: 2
- persona: CustomsBroker
- stage: PGA Screening
- order: after T88
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  entry condition: selected-tasks-completed("PGA Status Polling Bot") IF pgaStatus=="MAY_HOLD"
  inputs:  pgaAgencies=vars.pgaAgencies, pgaStatus=vars.pgaStatus
  outputs: Action->pgaHoldOutcome
  buttons: Documents Submitted | Request Extension | Escalate Compliance
```

## T90: Add action task "HT-10 PGA Refusal" to "PGA Screening"
- type: action
- displayName: HT-10 PGA Refusal
- taskTypeId: <UNRESOLVED: Action App not deployed — search action-apps-index.json for "PGA Refusal" or "HT-10">
- isRequired: false
- runOnlyOnce: false
- lane: 3
- persona: ComplianceOfficer
- stage: PGA Screening
- order: after T88
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  entry condition: selected-tasks-completed("PGA Status Polling Bot") IF pgaStatus=="REFUSED"
  inputs:  pgaAgencies=vars.pgaAgencies, htsCode=vars.htsCode, totalValueUsd=vars.totalValueUsd
  outputs: Action->pgaRefusalOutcome
  buttons: Re-Export | Request Destruction | Appeal Refusal
```

---

## §4.6 Tasks — Stage 5: OFAC & Denied-Party Screening

## T91: Add agent task "Party Extraction Agent" to "OFAC & Denied-Party Screening"
- type: agent
- displayName: Party Extraction Agent
- taskTypeId: <UNRESOLVED: agent not yet deployed — search agent-index.json for "Party Extraction">
- isRequired: true
- runOnlyOnce: true
- lane: 0
- stage: OFAC & Denied-Party Screening
- order: after T90
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  inputs:  documentList=vars.documentList, supplierName=vars.supplierName, supplierCountry=vars.supplierCountry
  outputs: response.partyNames->partyNames
```

## T92: Add agent task "Transshipment Risk Agent" to "OFAC & Denied-Party Screening"
- type: agent
- displayName: Transshipment Risk Agent
- taskTypeId: <UNRESOLVED: agent not yet deployed — search agent-index.json for "Transshipment Risk">
- isRequired: true
- runOnlyOnce: true
- lane: 1
- stage: OFAC & Denied-Party Screening
- order: after T91
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  inputs:  partyNames=vars.partyNames, portOfLoading=vars.portOfLoading,
           portOfEntry=vars.portOfEntry, supplierCountry=vars.supplierCountry
  outputs: response.transshipmentRisk->transshipmentRisk, response.transshipmentFlag->transshipmentFlag
```

## T93: Add api-workflow task "OFAC SDN API Workflow" to "OFAC & Denied-Party Screening"
- type: api-workflow
- displayName: OFAC SDN API Workflow
- taskTypeId: <UNRESOLVED: api-workflow not yet published — search api-index.json for "OFAC SDN" or "OFAC Screening">
- isRequired: true
- runOnlyOnce: true
- lane: 2
- stage: OFAC & Denied-Party Screening
- order: after T91
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  inputs:  partyNames=vars.partyNames
  outputs: response.ofacScreeningResults->ofacScreeningResults,
           response.ofacMatchScore->ofacMatchScore, response.ofacClearStatus->ofacClearStatus
```

## T94: Add action task "HT-11 OFAC Fuzzy Match" to "OFAC & Denied-Party Screening"
- type: action
- displayName: HT-11 OFAC Fuzzy Match
- taskTypeId: <UNRESOLVED: Action App not deployed — search action-apps-index.json for "OFAC Fuzzy Match" or "HT-11">
- isRequired: false
- runOnlyOnce: false
- lane: 3
- persona: ComplianceOfficer
- stage: OFAC & Denied-Party Screening
- order: after T93
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  entry condition: selected-tasks-completed("OFAC SDN API Workflow") IF ofacClearStatus=="FUZZY_MATCH"
  inputs:  ofacScreeningResults=vars.ofacScreeningResults, ofacMatchScore=vars.ofacMatchScore, partyNames=vars.partyNames
  outputs: Action->ofacFuzzyOutcome
  buttons: Clear Party | Escalate To Legal | Block Shipment
```

## T95: Add action task "HT-12 Confirmed OFAC Hit" to "OFAC & Denied-Party Screening"
- type: action
- displayName: HT-12 Confirmed OFAC Hit
- taskTypeId: <UNRESOLVED: Action App not deployed — search action-apps-index.json for "Confirmed OFAC Hit" or "HT-12">
- isRequired: false
- runOnlyOnce: false
- lane: 4
- persona: LegalCounsel
- stage: OFAC & Denied-Party Screening
- order: after T93
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  entry condition: selected-tasks-completed("OFAC SDN API Workflow") IF ofacClearStatus=="CONFIRMED_HIT"
  inputs:  ofacScreeningResults=vars.ofacScreeningResults, ofacMatchScore=vars.ofacMatchScore
  outputs: Action->ofacHitOutcome
  buttons: Block and Report | Legal Review
```

---

## §4.6 Tasks — Stage 6: Customs Entry Filing & CBP Clearance

## T96: Add rpa task "CBP 3461 Form Bot" to "Customs Entry Filing & CBP Clearance"
- type: rpa
- displayName: CBP 3461 Form Bot
- taskTypeId: <UNRESOLVED: rpa process not yet published — search process-index.json for "CBP 3461" or "3461 Form Bot">
- isRequired: true
- runOnlyOnce: true
- lane: 0
- stage: Customs Entry Filing & CBP Clearance
- order: after T95
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  inputs:  htsCode=vars.htsCode, totalValueUsd=vars.totalValueUsd, dutyAmountUsd=vars.dutyAmountUsd,
           portOfEntry=vars.portOfEntry, poNumber=vars.poNumber, supplierName=vars.supplierName
  outputs: response.entryNumber->entryNumber, response.cbpStatus->cbpStatus
```

## T97: Add api-workflow task "CBP Status Polling Workflow" to "Customs Entry Filing & CBP Clearance"
- type: api-workflow
- displayName: CBP Status Polling Workflow
- taskTypeId: <UNRESOLVED: api-workflow not yet published — search api-index.json for "CBP Status" or "CBP Status Polling">
- isRequired: true
- runOnlyOnce: false
- lane: 1
- stage: Customs Entry Filing & CBP Clearance
- order: after T96
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  inputs:  entryNumber=vars.entryNumber
  outputs: response.cbpStatus->cbpStatus, response.examType->examType,
           response.cf28Questions->cf28Questions, response.cf29ActionType->cf29ActionType,
           response.actualDutyUsd->actualDutyUsd
```

## T98: Add api-workflow task "Duty Calculation Workflow" to "Customs Entry Filing & CBP Clearance"
- type: api-workflow
- displayName: Duty Calculation Workflow
- taskTypeId: <UNRESOLVED: api-workflow not yet published — search api-index.json for "Duty Calculation">
- isRequired: true
- runOnlyOnce: true
- lane: 2
- stage: Customs Entry Filing & CBP Clearance
- order: after T97
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  entry condition: selected-tasks-completed("CBP Status Polling Workflow") IF cbpStatus=="RELEASED"
  inputs:  htsCode=vars.htsCode, totalValueUsd=vars.totalValueUsd,
           actualDutyUsd=vars.actualDutyUsd, estimatedDutyUsd=vars.estimatedDutyUsd
  outputs: response.dutyVarianceUsd->dutyVarianceUsd, response.dutyVariancePct->dutyVariancePct,
           response.mpfAmount->mpfAmount, response.hmfAmount->hmfAmount
```

## T99: Add action task "HT-13 CBP Exam Selected" to "Customs Entry Filing & CBP Clearance"
- type: action
- displayName: HT-13 CBP Exam Selected
- taskTypeId: <UNRESOLVED: Action App not deployed — search action-apps-index.json for "CBP Exam" or "HT-13">
- isRequired: false
- runOnlyOnce: false
- lane: 3
- persona: PortAgent
- stage: Customs Entry Filing & CBP Clearance
- order: after T97
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  entry condition: selected-tasks-completed("CBP Status Polling Workflow") IF cbpStatus=="EXAM"
  inputs:  examType=vars.examType, portOfEntry=vars.portOfEntry, entryNumber=vars.entryNumber
  outputs: Action->examOutcome
  buttons: Acknowledged | Request Clarification
```

## T100: Add action task "HT-14 CF-28 Unanswered Questions" to "Customs Entry Filing & CBP Clearance"
- type: action
- displayName: HT-14 CF-28 Unanswered Questions
- taskTypeId: <UNRESOLVED: Action App not deployed — search action-apps-index.json for "CF-28" or "HT-14">
- isRequired: false
- runOnlyOnce: false
- lane: 4
- persona: CustomsBroker
- stage: Customs Entry Filing & CBP Clearance
- order: after T97
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  entry condition: selected-tasks-completed("CBP Status Polling Workflow") IF cbpStatus=="CF28_ISSUED"
  inputs:  cf28Questions=vars.cf28Questions, entryNumber=vars.entryNumber
  outputs: Action->cf28Outcome
  buttons: Submit Response | Request CBP Extension
```

## T101: Add action task "HT-15 CF-29 CBP Action" to "Customs Entry Filing & CBP Clearance"
- type: action
- displayName: HT-15 CF-29 CBP Action
- taskTypeId: <UNRESOLVED: Action App not deployed — search action-apps-index.json for "CF-29" or "HT-15">
- isRequired: false
- runOnlyOnce: false
- lane: 5
- persona: CustomsBroker
- stage: Customs Entry Filing & CBP Clearance
- order: after T97
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  entry condition: selected-tasks-completed("CBP Status Polling Workflow") IF cbpStatus=="CF29_ISSUED"
  inputs:  cf29ActionType=vars.cf29ActionType, dutyVarianceUsd=vars.dutyVarianceUsd, entryNumber=vars.entryNumber
  outputs: Action->cf29Outcome
  buttons: Accept Action | File CBP Protest
```

---

## §4.6 Tasks — Stage 7: Document Management & Post-Entry

## T102: Add rpa task "DMS Archive Workflow" to "Document Management & Post-Entry"
- type: rpa
- displayName: DMS Archive Workflow
- taskTypeId: <UNRESOLVED: rpa process not yet published — search process-index.json for "DMS Archive">
- isRequired: true
- runOnlyOnce: true
- lane: 0
- stage: Document Management & Post-Entry
- order: after T101
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  inputs:  documentList=vars.documentList, poNumber=vars.poNumber, entryNumber=vars.entryNumber
  outputs: response.archivalStatus->archivalStatus, response.documentationComplete->documentationComplete
```

## T103: Add rpa task "ERP Landed Cost Workflow" to "Document Management & Post-Entry"
- type: rpa
- displayName: ERP Landed Cost Workflow
- taskTypeId: <UNRESOLVED: rpa process not yet published — search process-index.json for "ERP Landed Cost">
- isRequired: true
- runOnlyOnce: true
- lane: 1
- stage: Document Management & Post-Entry
- order: after T101
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  inputs:  poNumber=vars.poNumber, totalValueUsd=vars.totalValueUsd, actualDutyUsd=vars.actualDutyUsd,
           mpfAmount=vars.mpfAmount, hmfAmount=vars.hmfAmount
  outputs: response.landedCostPosted->landedCostPosted
```

## T104: Add agent task "Duty Savings Analysis Agent" to "Document Management & Post-Entry"
- type: agent
- displayName: Duty Savings Analysis Agent
- taskTypeId: <UNRESOLVED: agent not yet deployed — search agent-index.json for "Duty Savings">
- isRequired: true
- runOnlyOnce: true
- lane: 2
- stage: Document Management & Post-Entry
- order: after T102
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  inputs:  htsCode=vars.htsCode, totalValueUsd=vars.totalValueUsd, actualDutyUsd=vars.actualDutyUsd,
           supplierCountry=vars.supplierCountry, cooDeclaration=vars.cooDeclaration
  outputs: response.dutySavingsOpportunity->dutySavingsOpportunity,
           response.estimatedSavingsUsd->estimatedSavingsUsd
```

## T105: Add action task "HT-16 Document Discrepancy" to "Document Management & Post-Entry"
- type: action
- displayName: HT-16 Document Discrepancy
- taskTypeId: <UNRESOLVED: Action App not deployed — search action-apps-index.json for "Document Discrepancy" or "HT-16">
- isRequired: false
- runOnlyOnce: false
- lane: 3
- persona: ImporterOps
- stage: Document Management & Post-Entry
- order: after T102
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  entry condition: selected-tasks-completed("DMS Archive Workflow") IF documentationComplete==false
  inputs:  documentList=vars.documentList, poNumber=vars.poNumber
  outputs: Action->docDiscrepancyOutcome, documentationComplete=true
  buttons: Corrected | Accept Variance | Escalate To Finance
```

## T106: Add action task "HT-17 Duty Variance Review" to "Document Management & Post-Entry"
- type: action
- displayName: HT-17 Duty Variance Review
- taskTypeId: <UNRESOLVED: Action App not deployed — search action-apps-index.json for "Duty Variance Review" or "HT-17">
- isRequired: false
- runOnlyOnce: false
- lane: 4
- persona: Finance
- stage: Document Management & Post-Entry
- order: after T103
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  entry condition: selected-tasks-completed("ERP Landed Cost Workflow") IF dutyVariancePct>5
  inputs:  estimatedDutyUsd=vars.estimatedDutyUsd, actualDutyUsd=vars.actualDutyUsd,
           dutyVarianceUsd=vars.dutyVarianceUsd, dutyVariancePct=vars.dutyVariancePct, htsCode=vars.htsCode
  outputs: Action->dutyVarianceOutcome
  buttons: Approve Variance | Investigate Variance
```

## T107: Add action task "HT-18 Duty Savings Opportunity" to "Document Management & Post-Entry"
- type: action
- displayName: HT-18 Duty Savings Opportunity
- taskTypeId: <UNRESOLVED: Action App not deployed — search action-apps-index.json for "Duty Savings Opportunity" or "HT-18">
- isRequired: false
- runOnlyOnce: false
- lane: 5
- persona: TradeCounsel
- stage: Document Management & Post-Entry
- order: after T104
- verify: Placeholder task node created
```text
wiring notes (user must attach):
  entry condition: selected-tasks-completed("Duty Savings Analysis Agent") IF dutySavingsOpportunity!="NONE"
  inputs:  dutySavingsOpportunity=vars.dutySavingsOpportunity, estimatedSavingsUsd=vars.estimatedSavingsUsd,
           htsCode=vars.htsCode
  outputs: Action->dutySavingsDecision
  buttons: Pursue Savings | Decline Savings
```

---

## §4.7 Conditions — Stage Entry

## T108: Add stage-entry condition for "Trade Order Intake"
- display-name: Entry Rule 1
- rule-type: case-entered
- condition-expression: (none)
- is-interrupting: false
- stage: Trade Order Intake

## T109: Add stage-entry condition for "ISF 10+2 Filing"
- display-name: Entry Rule 1
- rule-type: selected-stage-completed("Trade Order Intake")
- condition-expression: (none)
- is-interrupting: false
- stage: ISF 10+2 Filing

## T110: Add stage-entry condition for "HTS Classification & Duty"
- display-name: Entry Rule 1
- rule-type: selected-stage-completed("ISF 10+2 Filing")
- condition-expression: =js:vars.isfStatus == "ACCEPTED"
- is-interrupting: false
- stage: HTS Classification & Duty

## T111: Add stage-entry condition for "PGA Screening"
- display-name: Entry Rule 1
- rule-type: selected-stage-completed("HTS Classification & Duty")
- condition-expression: =js:vars.pgaFlag == true
- is-interrupting: false
- stage: PGA Screening

## T112: Add stage-entry condition for "OFAC & Denied-Party Screening" — path A (no PGA)
- display-name: Entry Rule 1
- rule-type: selected-stage-completed("HTS Classification & Duty")
- condition-expression: =js:vars.pgaFlag == false
- is-interrupting: false
- stage: OFAC & Denied-Party Screening

## T113: Add stage-entry condition for "OFAC & Denied-Party Screening" — path B (after PGA)
- display-name: Entry Rule 2
- rule-type: selected-stage-completed("PGA Screening")
- condition-expression: (none)
- is-interrupting: false
- stage: OFAC & Denied-Party Screening

## T114: Add stage-entry condition for "Customs Entry Filing & CBP Clearance"
- display-name: Entry Rule 1
- rule-type: selected-stage-completed("OFAC & Denied-Party Screening")
- condition-expression: =js:vars.ofacClearStatus == "CLEAR"
- is-interrupting: false
- stage: Customs Entry Filing & CBP Clearance

## T115: Add stage-entry condition for "Document Management & Post-Entry"
- display-name: Entry Rule 1
- rule-type: selected-stage-completed("Customs Entry Filing & CBP Clearance")
- condition-expression: =js:vars.cbpStatus == "RELEASED"
- is-interrupting: false
- stage: Document Management & Post-Entry

---

## §4.7 Conditions — Stage Exit

## T116: Add stage-exit condition for "Trade Order Intake"
- display-name: Complete Rule 1
- rule-type: required-tasks-completed
- condition-expression: (none)
- exit-type: exit-only
- marks-stage-complete: true
- stage: Trade Order Intake

## T117: Add stage-exit condition for "ISF 10+2 Filing"
- display-name: Complete Rule 1
- rule-type: required-tasks-completed
- condition-expression: (none)
- exit-type: exit-only
- marks-stage-complete: true
- stage: ISF 10+2 Filing

## T118: Add stage-exit condition for "HTS Classification & Duty"
- display-name: Complete Rule 1
- rule-type: required-tasks-completed
- condition-expression: (none)
- exit-type: exit-only
- marks-stage-complete: true
- stage: HTS Classification & Duty

## T119: Add stage-exit condition for "PGA Screening"
- display-name: Complete Rule 1
- rule-type: required-tasks-completed
- condition-expression: (none)
- exit-type: exit-only
- marks-stage-complete: true
- stage: PGA Screening

## T120: Add stage-exit condition for "OFAC & Denied-Party Screening"
- display-name: Complete Rule 1
- rule-type: required-tasks-completed
- condition-expression: (none)
- exit-type: exit-only
- marks-stage-complete: true
- stage: OFAC & Denied-Party Screening

## T121: Add stage-exit condition for "Customs Entry Filing & CBP Clearance"
- display-name: Complete Rule 1
- rule-type: required-tasks-completed
- condition-expression: (none)
- exit-type: exit-only
- marks-stage-complete: true
- stage: Customs Entry Filing & CBP Clearance

## T122: Add stage-exit condition for "Document Management & Post-Entry"
- display-name: Complete Rule 1
- rule-type: required-tasks-completed
- condition-expression: (none)
- exit-type: exit-only
- marks-stage-complete: true
- stage: Document Management & Post-Entry

---

## §4.7 Conditions — Case Exit

## T123: Add case-exit condition
- display-name: Complete Rule 1
- rule-type: required-stages-completed
- condition-expression: (none)
- marks-case-complete: true

---

## §4.7 Conditions — Task Entry

## T124: Add task-entry condition for "PO Data Fetch"
- rule-type: current-stage-entered
- condition-expression: (none)
- display-name: Entry Rule 1
- task: PO Data Fetch / stage: Trade Order Intake

## T125: Add task-entry condition for "Email Document Collector"
- rule-type: current-stage-entered
- condition-expression: =js:vars.triggerSource == "EMAIL"
- display-name: Entry Rule 1
- task: Email Document Collector / stage: Trade Order Intake

## T126: Add task-entry condition for "COO Classification Agent"
- rule-type: selected-tasks-completed("PO Data Fetch")
- condition-expression: (none)
- display-name: Entry Rule 1
- task: COO Classification Agent / stage: Trade Order Intake

## T127: Add task-entry condition for "HT-01 Missing PO Fields"
- rule-type: selected-tasks-completed("PO Data Fetch")
- condition-expression: =js:vars.poDataComplete == false
- display-name: Entry Rule 1
- task: HT-01 Missing PO Fields / stage: Trade Order Intake

## T128: Add task-entry condition for "HT-02 COO Verification"
- rule-type: selected-tasks-completed("COO Classification Agent")
- condition-expression: =js:vars.cooVerificationRequired == true
- display-name: Entry Rule 1
- task: HT-02 COO Verification / stage: Trade Order Intake

## T129: Add task-entry condition for "ISF Data Collector Agent"
- rule-type: current-stage-entered
- condition-expression: (none)
- display-name: Entry Rule 1
- task: ISF Data Collector Agent / stage: ISF 10+2 Filing

## T130: Add task-entry condition for "ACE ISF Filing Workflow"
- rule-type: selected-tasks-completed("ISF Data Collector Agent")
- condition-expression: =js:vars.isfDataComplete == true
- display-name: Entry Rule 1
- task: ACE ISF Filing Workflow / stage: ISF 10+2 Filing

## T131: Add task-entry condition for "ACE ISF Status Poller"
- rule-type: selected-tasks-completed("ACE ISF Filing Workflow")
- condition-expression: (none)
- display-name: Entry Rule 1
- task: ACE ISF Status Poller / stage: ISF 10+2 Filing

## T132: Add task-entry condition for "HT-03 Missing ISF Elements"
- rule-type: selected-tasks-completed("ISF Data Collector Agent")
- condition-expression: =js:vars.isfDataComplete == false
- display-name: Entry Rule 1
- task: HT-03 Missing ISF Elements / stage: ISF 10+2 Filing

## T133: Add task-entry condition for "HT-04 ISF Do Not Load"
- rule-type: selected-tasks-completed("ACE ISF Status Poller")
- condition-expression: =js:vars.isfStatus == "DO_NOT_LOAD"
- display-name: Entry Rule 1
- task: HT-04 ISF Do Not Load / stage: ISF 10+2 Filing

## T134: Add task-entry condition for "HT-05 ISF Material Amendment"
- rule-type: selected-tasks-completed("ACE ISF Status Poller")
- condition-expression: =js:vars.isfAmendmentRequired == true
- display-name: Entry Rule 1
- task: HT-05 ISF Material Amendment / stage: ISF 10+2 Filing

## T135: Add task-entry condition for "IDP Document Pipeline"
- rule-type: current-stage-entered
- condition-expression: (none)
- display-name: Entry Rule 1
- task: IDP Document Pipeline / stage: HTS Classification & Duty

## T136: Add task-entry condition for "HTS Classification Agent"
- rule-type: selected-tasks-completed("IDP Document Pipeline")
- condition-expression: (none)
- display-name: Entry Rule 1
- task: HTS Classification Agent / stage: HTS Classification & Duty

## T137: Add task-entry condition for "Duty Rate Lookup Workflow"
- rule-type: selected-tasks-completed("HTS Classification Agent")
- condition-expression: =js:vars.htsConfidence >= 90
- display-name: Entry Rule 1
- task: Duty Rate Lookup Workflow / stage: HTS Classification & Duty

## T138: Add task-entry condition for "PGA Flag Workflow"
- rule-type: selected-tasks-completed("HTS Classification Agent")
- condition-expression: =js:vars.htsConfidence >= 90
- display-name: Entry Rule 1
- task: PGA Flag Workflow / stage: HTS Classification & Duty

## T139: Add task-entry condition for "HT-06 HTS Review 70-90%"
- rule-type: selected-tasks-completed("HTS Classification Agent")
- condition-expression: =js:(vars.htsConfidence >= 70 && vars.htsConfidence < 90)
- display-name: Entry Rule 1
- task: HT-06 HTS Review 70-90% / stage: HTS Classification & Duty

## T140: Add task-entry condition for "HT-07 Manual HTS Classification"
- rule-type: selected-tasks-completed("HTS Classification Agent")
- condition-expression: =js:vars.htsConfidence < 70
- display-name: Entry Rule 1
- task: HT-07 Manual HTS Classification / stage: HTS Classification & Duty

## T141: Add task-entry condition for "HT-08 PGA Documentation Required"
- rule-type: selected-tasks-completed("PGA Flag Workflow")
- condition-expression: =js:vars.pgaFlag == true
- display-name: Entry Rule 1
- task: HT-08 PGA Documentation Required / stage: HTS Classification & Duty

## T142: Add task-entry condition for "PGA Agency Coordinator"
- rule-type: current-stage-entered
- condition-expression: (none)
- display-name: Entry Rule 1
- task: PGA Agency Coordinator / stage: PGA Screening

## T143: Add task-entry condition for "PGA Status Polling Bot"
- rule-type: selected-tasks-completed("PGA Agency Coordinator")
- condition-expression: (none)
- display-name: Entry Rule 1
- task: PGA Status Polling Bot / stage: PGA Screening

## T144: Add task-entry condition for "HT-09 PGA Hold"
- rule-type: selected-tasks-completed("PGA Status Polling Bot")
- condition-expression: =js:vars.pgaStatus == "MAY_HOLD"
- display-name: Entry Rule 1
- task: HT-09 PGA Hold / stage: PGA Screening

## T145: Add task-entry condition for "HT-10 PGA Refusal"
- rule-type: selected-tasks-completed("PGA Status Polling Bot")
- condition-expression: =js:vars.pgaStatus == "REFUSED"
- display-name: Entry Rule 1
- task: HT-10 PGA Refusal / stage: PGA Screening

## T146: Add task-entry condition for "Party Extraction Agent"
- rule-type: current-stage-entered
- condition-expression: (none)
- display-name: Entry Rule 1
- task: Party Extraction Agent / stage: OFAC & Denied-Party Screening

## T147: Add task-entry condition for "Transshipment Risk Agent"
- rule-type: selected-tasks-completed("Party Extraction Agent")
- condition-expression: (none)
- display-name: Entry Rule 1
- task: Transshipment Risk Agent / stage: OFAC & Denied-Party Screening

## T148: Add task-entry condition for "OFAC SDN API Workflow"
- rule-type: selected-tasks-completed("Party Extraction Agent")
- condition-expression: (none)
- display-name: Entry Rule 1
- task: OFAC SDN API Workflow / stage: OFAC & Denied-Party Screening

## T149: Add task-entry condition for "HT-11 OFAC Fuzzy Match"
- rule-type: selected-tasks-completed("OFAC SDN API Workflow")
- condition-expression: =js:vars.ofacClearStatus == "FUZZY_MATCH"
- display-name: Entry Rule 1
- task: HT-11 OFAC Fuzzy Match / stage: OFAC & Denied-Party Screening

## T150: Add task-entry condition for "HT-12 Confirmed OFAC Hit"
- rule-type: selected-tasks-completed("OFAC SDN API Workflow")
- condition-expression: =js:vars.ofacClearStatus == "CONFIRMED_HIT"
- display-name: Entry Rule 1
- task: HT-12 Confirmed OFAC Hit / stage: OFAC & Denied-Party Screening

## T151: Add task-entry condition for "CBP 3461 Form Bot"
- rule-type: current-stage-entered
- condition-expression: (none)
- display-name: Entry Rule 1
- task: CBP 3461 Form Bot / stage: Customs Entry Filing & CBP Clearance

## T152: Add task-entry condition for "CBP Status Polling Workflow"
- rule-type: selected-tasks-completed("CBP 3461 Form Bot")
- condition-expression: (none)
- display-name: Entry Rule 1
- task: CBP Status Polling Workflow / stage: Customs Entry Filing & CBP Clearance

## T153: Add task-entry condition for "Duty Calculation Workflow"
- rule-type: selected-tasks-completed("CBP Status Polling Workflow")
- condition-expression: =js:vars.cbpStatus == "RELEASED"
- display-name: Entry Rule 1
- task: Duty Calculation Workflow / stage: Customs Entry Filing & CBP Clearance

## T154: Add task-entry condition for "HT-13 CBP Exam Selected"
- rule-type: selected-tasks-completed("CBP Status Polling Workflow")
- condition-expression: =js:vars.cbpStatus == "EXAM"
- display-name: Entry Rule 1
- task: HT-13 CBP Exam Selected / stage: Customs Entry Filing & CBP Clearance

## T155: Add task-entry condition for "HT-14 CF-28 Unanswered Questions"
- rule-type: selected-tasks-completed("CBP Status Polling Workflow")
- condition-expression: =js:vars.cbpStatus == "CF28_ISSUED"
- display-name: Entry Rule 1
- task: HT-14 CF-28 Unanswered Questions / stage: Customs Entry Filing & CBP Clearance

## T156: Add task-entry condition for "HT-15 CF-29 CBP Action"
- rule-type: selected-tasks-completed("CBP Status Polling Workflow")
- condition-expression: =js:vars.cbpStatus == "CF29_ISSUED"
- display-name: Entry Rule 1
- task: HT-15 CF-29 CBP Action / stage: Customs Entry Filing & CBP Clearance

## T157: Add task-entry condition for "DMS Archive Workflow"
- rule-type: current-stage-entered
- condition-expression: (none)
- display-name: Entry Rule 1
- task: DMS Archive Workflow / stage: Document Management & Post-Entry

## T158: Add task-entry condition for "ERP Landed Cost Workflow"
- rule-type: current-stage-entered
- condition-expression: (none)
- display-name: Entry Rule 1
- task: ERP Landed Cost Workflow / stage: Document Management & Post-Entry

## T159: Add task-entry condition for "Duty Savings Analysis Agent"
- rule-type: selected-tasks-completed("DMS Archive Workflow")
- condition-expression: (none)
- display-name: Entry Rule 1
- task: Duty Savings Analysis Agent / stage: Document Management & Post-Entry

## T160: Add task-entry condition for "HT-16 Document Discrepancy"
- rule-type: selected-tasks-completed("DMS Archive Workflow")
- condition-expression: =js:vars.documentationComplete == false
- display-name: Entry Rule 1
- task: HT-16 Document Discrepancy / stage: Document Management & Post-Entry

## T161: Add task-entry condition for "HT-17 Duty Variance Review"
- rule-type: selected-tasks-completed("ERP Landed Cost Workflow")
- condition-expression: =js:vars.dutyVariancePct > 5
- display-name: Entry Rule 1
- task: HT-17 Duty Variance Review / stage: Document Management & Post-Entry

## T162: Add task-entry condition for "HT-18 Duty Savings Opportunity"
- rule-type: selected-tasks-completed("Duty Savings Analysis Agent")
- condition-expression: =js:vars.dutySavingsOpportunity != "NONE"
- display-name: Entry Rule 1
- task: HT-18 Duty Savings Opportunity / stage: Document Management & Post-Entry

---

## §4.8 SLA

## T163: Set case-level SLA
- target: case
- value: 10
- unit: d
- sla-type: time-based

## T164: Set case SLA at-risk escalation
- target: case
- trigger: at-risk
- threshold: 75%
- action: Notify Trade Operations Manager

## T165: Set case SLA breach escalation
- target: case
- trigger: breached
- threshold: 100%
- action: Notify Trade Operations Manager, Compliance Officer

## T166: Set stage SLA for "Trade Order Intake"
- target: stage / Trade Order Intake
- value: 4 / unit: h
- at-risk: 75% → Notify ImporterOps Team
- breach: → Notify Trade Operations Manager

## T167: Set stage SLA for "ISF 10+2 Filing"
- target: stage / ISF 10+2 Filing
- value: 24 / unit: h
- at-risk: 60% → Notify CustomsBroker Team
- breach: → Notify Trade Operations Manager (ISF regulatory deadline at risk)

## T168: Set stage SLA for "HTS Classification & Duty"
- target: stage / HTS Classification & Duty
- value: 8 / unit: h
- at-risk: 75% → Notify ClassificationSpecialist Team
- breach: → Notify Trade Operations Manager

## T169: Set stage SLA for "PGA Screening"
- target: stage / PGA Screening
- value: 48 / unit: h
- at-risk: 75% → Notify ComplianceOfficer
- breach: → Notify Trade Operations Manager

## T170: Set stage SLA for "OFAC & Denied-Party Screening"
- target: stage / OFAC & Denied-Party Screening
- value: 4 / unit: h
- at-risk: 75% → Notify ComplianceOfficer
- breach: → Notify Trade Operations Manager

## T171: Set stage SLA for "Customs Entry Filing & CBP Clearance"
- target: stage / Customs Entry Filing & CBP Clearance
- value: 48 / unit: h
- at-risk: 75% → Notify CustomsBroker Team
- breach: → Notify Trade Operations Manager

## T172: Set stage SLA for "Document Management & Post-Entry"
- target: stage / Document Management & Post-Entry
- value: 5 / unit: d
- at-risk: 75% → Notify ImporterOps Team
- breach: → Notify Trade Operations Manager

## T173: Set action task SLA for "HT-01 Missing PO Fields"
- target: task / HT-01 Missing PO Fields
- value: 2 / unit: h

## T174: Set action task SLA for "HT-02 COO Verification"
- target: task / HT-02 COO Verification
- value: 4 / unit: h

## T175: Set action task SLA for "HT-03 Missing ISF Elements"
- target: task / HT-03 Missing ISF Elements
- value: 4 / unit: h

## T176: Set action task SLA for "HT-04 ISF Do Not Load"
- target: task / HT-04 ISF Do Not Load
- value: 1 / unit: h

## T177: Set action task SLA for "HT-05 ISF Material Amendment"
- target: task / HT-05 ISF Material Amendment
- value: 2 / unit: h

## T178: Set action task SLA for "HT-06 HTS Review 70-90%"
- target: task / HT-06 HTS Review 70-90%
- value: 4 / unit: h

## T179: Set action task SLA for "HT-07 Manual HTS Classification"
- target: task / HT-07 Manual HTS Classification
- value: 8 / unit: h

## T180: Set action task SLA for "HT-08 PGA Documentation Required"
- target: task / HT-08 PGA Documentation Required
- value: 24 / unit: h

## T181: Set action task SLA for "HT-09 PGA Hold"
- target: task / HT-09 PGA Hold
- value: 4 / unit: h

## T182: Set action task SLA for "HT-10 PGA Refusal"
- target: task / HT-10 PGA Refusal
- value: 1 / unit: h

## T183: Set action task SLA for "HT-11 OFAC Fuzzy Match"
- target: task / HT-11 OFAC Fuzzy Match
- value: 2 / unit: h

## T184: Set action task SLA for "HT-12 Confirmed OFAC Hit"
- target: task / HT-12 Confirmed OFAC Hit
- value: 1 / unit: h

## T185: Set action task SLA for "HT-13 CBP Exam Selected"
- target: task / HT-13 CBP Exam Selected
- value: 4 / unit: h

## T186: Set action task SLA for "HT-14 CF-28 Unanswered Questions"
- target: task / HT-14 CF-28 Unanswered Questions
- value: 120 / unit: h

## T187: Set action task SLA for "HT-15 CF-29 CBP Action"
- target: task / HT-15 CF-29 CBP Action
- value: 48 / unit: h

## T188: Set action task SLA for "HT-16 Document Discrepancy"
- target: task / HT-16 Document Discrepancy
- value: 4 / unit: h

## T189: Set action task SLA for "HT-17 Duty Variance Review"
- target: task / HT-17 Duty Variance Review
- value: 48 / unit: h

## T190: Set action task SLA for "HT-18 Duty Savings Opportunity"
- target: task / HT-18 Duty Savings Opportunity
- value: 120 / unit: h

---

## §4.9 Not Covered (outside caseplan.json scope)

- **Data Fabric entity schemas** (ImportCaseRecord, HumanTaskRecord, OfacScreeningRecord, IsfFilingRecord, ShipmentDocument, DutyCalculation, AuditEntry) — defined separately via `uip df entities create`; entity IDs stored in `.env` as documented in the frontend blueprint.
- **Action App development** — all 18 HT forms (HT-01 through HT-18) must be built as UiPath Coded Action Apps or standard Action Apps and deployed to the tenant before Phase 2 execution. See frontend blueprint for React form component specs.
- **UiPath Agent deployment** — COO Classification, ISF Data Collector, HTS Classification, Party Extraction, Transshipment Risk, Duty Savings Analysis agents must be published to Orchestrator.
- **CrewAI PGA Agency Coordinator** — external crew; requires a deployed API endpoint. The api-workflow process calling it must be published separately.
- **IS connections** — Outlook 365, Salesforce, CBP ACE, OFAC SDN, USITC HTS connections must be created in Integration Service before event triggers can be wired.
- **Frontend coded web app** — single React app (tradeflow-maestro) defined in `TradeFlow_Maestro_Frontend_Blueprint_v3.md`; separate from this case plan.

---

*tasks.md — TradeXCase | Phase 1 Planning Complete | T01–T190 | rpabotsworld.com*
