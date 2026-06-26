# TradeFlow Maestro AI — Single Coded Web App
## Requirements Blueprint v3: One App, No Backend, No Separate Action Apps

**Version:** 3.0
**Project:** Dubai → USA Import Operations Platform
**App type:** UiPath Coded Web App (single deployment)
**SDK:** `@uipath/uipath-typescript` — calls Maestro, Action Center, Data Fabric, Orchestrator directly from React
**Author:** Satish | rpabotsworld.com

---

## 1. The Core Point: One App Does Everything

The **single Coded Web App** scaffolded with `uip codedapp new --template react-ts` can call every UiPath service directly from React using the `@uipath/uipath-typescript` SDK:

| What the app needs to do | SDK service | No backend needed because… |
|---|---|---|
| Read / update Maestro cases | `Cases` from `maestro` | SDK calls UiPath Cloud APIs directly with the user's OAuth token |
| Fetch + complete human tasks | `Tasks` from `action-center` | Same — task completion is a direct SDK call |
| Render inline HT-01–HT-18 approval forms | React route/modal inside the same app | Forms are just React components; no separate Action App deploy |
| Read / write Data Fabric records | `Entities` from `data-fabric` | Direct SDK call from the browser |
| Read audit events | `uip admin audit` CLI (admin only) or DF `AuditEntry` entity | Audit is a read from DF; compliance export is CLI-only |
| RBAC enforcement | JWT roles from UiPath Identity OIDC token | Token already in the browser; roles parsed client-side |

**When would you need a Coded Action App separately?**
Only if Maestro is routing a human task to Action Center and you want a custom form to render *inside the Action Center panel* (the narrow embedded view inside Maestro's built-in UI). For this project — where you're building a full custom operations dashboard — you don't need that. All 18 HT forms live as routes/modals inside this one app.

---

## 2. Scaffold — One Command

```bash
# Install tools (once)
npm install -g @uipath/cli
uip tools install @uipath/codedapp-tool
uip tools install @uipath/orchestrator-tool
uip tools install @uipath/data-fabric-tool

# Scaffold the single app
uip codedapp new tradeflow-maestro --template react-ts
cd tradeflow-maestro

# Verify it compiles
npm run build
ls dist/
```

---

## 3. Environment Variables

```bash
# .env — one file, one app
# Base URL MUST be api.uipath.com — never cloud.uipath.com (fails with CORS/401)
VITE_UIPATH_BASE_URL=https://api.uipath.com
VITE_UIPATH_CLIENT_ID=<external-app-client-id>
VITE_UIPATH_ORG_NAME=<org-slug>
VITE_UIPATH_TENANT_NAME=<tenant-name>

# All scopes the single app ever needs — add before using each new SDK service
VITE_UIPATH_SCOPE=OR.Cases OR.Tasks DataService.Api.All ActionCenter.Tasks.Read ActionCenter.Tasks.Write OR.ProcessInstances OR.Audit

# Data Fabric entity IDs — resolve once with uip df entities list, store here
VITE_ENTITY_CASE=<importcaserecord-entity-id>
VITE_ENTITY_TASK=<humantaskrecord-entity-id>
VITE_ENTITY_OFAC=<ofacscreeningrecord-entity-id>
VITE_ENTITY_ISF=<isffilingrecord-entity-id>
VITE_ENTITY_DOC=<shipmentdocument-entity-id>
VITE_ENTITY_DUTY=<dutycalculation-entity-id>
VITE_ENTITY_AUDIT=<auditentry-entity-id>

# Maestro folder key (string GUID — never parseInt)
VITE_FOLDER_KEY=<maestro-folder-key-guid>
```

---

## 4. SDK Client — One Singleton

```typescript
// src/lib/sdk.ts
import { UiPathClient } from '@uipath/uipath-typescript';

export const sdk = new UiPathClient({
  baseUrl:    import.meta.env.VITE_UIPATH_BASE_URL,
  clientId:   import.meta.env.VITE_UIPATH_CLIENT_ID,
  scope:      import.meta.env.VITE_UIPATH_SCOPE,
  orgName:    import.meta.env.VITE_UIPATH_ORG_NAME,
  tenantName: import.meta.env.VITE_UIPATH_TENANT_NAME,
});

// Service instances — instantiate once, import everywhere
// ALWAYS use subpath imports, never from package root
import { Cases, ProcessInstances } from '@uipath/uipath-typescript/maestro';
import { Tasks }                   from '@uipath/uipath-typescript/action-center';
import { Entities }                from '@uipath/uipath-typescript/data-fabric';

export const casesSvc    = new Cases(sdk);
export const tasksSvc    = new Tasks(sdk);
export const entitiesSvc = new Entities(sdk);
export const piSvc       = new ProcessInstances(sdk);
```

---

## 5. Single App Architecture

```
tradeflow-maestro/              ← one Coded Web App
├── .env
├── vite.config.ts              ← base: './'  (mandatory — never change)
├── .uipath/
│   └── app.config.json         ← written by uip codedapp publish
└── src/
    ├── main.tsx
    ├── App.tsx                 ← router root
    │
    ├── lib/
    │   ├── sdk.ts              ← UiPathClient singleton + all service instances
    │   └── audit.ts            ← writeAuditEntry() to Data Fabric
    │
    ├── store/
    │   ├── authStore.ts        ← Zustand: { userId, roles[], sessionId, folderKey }
    │   └── uiStore.ts          ← Zustand: { activeCaseId, activeStage, sidebarOpen }
    │
    ├── features/
    │   │
    │   ├── auth/
    │   │   ├── LoginPage.tsx       ← UiPath Identity OIDC entry point
    │   │   ├── AuthCallback.tsx    ← handles redirect from Identity Server
    │   │   ├── useAuth.ts          ← parses JWT, populates authStore
    │   │   └── ProtectedRoute.tsx  ← wraps routes; redirects if not authenticated
    │   │
    │   ├── dashboard/
    │   │   ├── Dashboard.tsx       ← landing page after login
    │   │   ├── KpiTiles.tsx        ← 8 metric tiles (DF aggregates + Action Center counts)
    │   │   ├── SlaAlertRail.tsx    ← cases with SLA < 25% remaining
    │   │   └── ConnectorStatus.tsx ← live health of CBP ACE, OFAC, USITC, ERP connectors
    │   │
    │   ├── cases/
    │   │   ├── CaseList.tsx        ← paginated; filter by stage, status, broker
    │   │   ├── CaseDetail.tsx      ← full 7-stage view for one case
    │   │   ├── CaseHeader.tsx      ← 17-field header bar; status badges
    │   │   ├── StageRail.tsx       ← horizontal stage progress (S1→S7, parallel branches)
    │   │   └── CaseTimeline.tsx    ← merged Maestro events + DF AuditEntry, newest first
    │   │
    │   ├── stages/
    │   │   ├── S1_OrderIntake.tsx  ← ERP PO fields, COO flag, stakeholder notification
    │   │   ├── S2_ISF.tsx          ← ISF 10+2 element status, 24-hr SLA countdown, ACE status
    │   │   ├── S3_HTS.tsx          ← AI HTS candidates, confidence badge, duty breakdown panel
    │   │   ├── S4_PGA.tsx          ← conditional (shown only if PgaFlag=true); per-agency status
    │   │   ├── S5_OFAC.tsx         ← party screening results, match scores, fuzzy-match review
    │   │   ├── S6_CustomsEntry.tsx ← S6 gate indicator, CBP status, CF-28/CF-29 tracker
    │   │   └── S7_PostEntry.tsx    ← document checklist, duty reconciliation, archival status
    │   │
    │   ├── tasks/
    │   │   ├── TaskInbox.tsx       ← role-filtered Action Center tasks; SLA-sorted
    │   │   ├── TaskCard.tsx        ← preview card with SLA countdown, opens TaskModal
    │   │   ├── TaskModal.tsx       ← modal wrapper that renders the correct HT form
    │   │   └── forms/              ← all 18 HT forms as React components (see section 7)
    │   │       ├── HT01_CompletePO.tsx
    │   │       ├── HT02_VerifyCOO.tsx
    │   │       ├── HT03_ISFElements.tsx
    │   │       ├── HT04_ISFDoNotLoad.tsx
    │   │       ├── HT05_ISFAmendment.tsx
    │   │       ├── HT06_HTSReview.tsx
    │   │       ├── HT07_HTSManual.tsx
    │   │       ├── HT08_COODocs.tsx
    │   │       ├── HT09_PGAHold.tsx
    │   │       ├── HT10_PGARefusal.tsx
    │   │       ├── HT11_OFACFuzzy.tsx
    │   │       ├── HT12_OFACHit.tsx
    │   │       ├── HT13_CBPExam.tsx
    │   │       ├── HT14_CF28.tsx
    │   │       ├── HT15_CF29.tsx
    │   │       ├── HT16_DocDiscrepancy.tsx
    │   │       ├── HT17_DutyVariance.tsx
    │   │       └── HT18_DutySavings.tsx
    │   │
    │   ├── documents/
    │   │   ├── DocumentUpload.tsx      ← drag-drop; writes to ShipmentDocument DF entity
    │   │   ├── DocumentChecklist.tsx   ← 9-doc completeness gate with status badges
    │   │   └── ExtractionViewer.tsx    ← field-level confidence scores from IDP
    │   │
    │   ├── compliance/
    │   │   ├── DutyBreakdown.tsx       ← MFN + Section 301 + ADD/CVD + MPF + HMF
    │   │   ├── OFACPartyTable.tsx      ← all screened parties, match scores
    │   │   └── ISFElementsPanel.tsx    ← all 10+2 elements with fill status
    │   │
    │   ├── audit/
    │   │   ├── AuditLog.tsx            ← DF AuditEntry records; filter + paginate
    │   │   └── RetentionBadge.tsx      ← green / amber / red by days to expiry
    │   │
    │   └── admin/
    │       ├── UserList.tsx            ← read from uip admin identity (CLI-backed)
    │       ├── RoleAssignment.tsx      ← uip admin authorization roles assignments
    │       └── RetentionDashboard.tsx  ← DF ShipmentDocument retention overview
    │
    ├── hooks/
    │   ├── useCases.ts         ← Cases SDK, cursor-paginated
    │   ├── useTasks.ts         ← Tasks SDK, role-filtered, cursor-paginated
    │   ├── useEntities.ts      ← Entities SDK, cursor-paginated, typed per entity
    │   ├── useTaskSubmit.ts    ← Tasks.complete() — one hook, all 18 HT forms call this
    │   ├── useAuth.ts          ← JWT parse, roles[], sessionId
    │   ├── useSLATimer.ts      ← countdown from SlaDeadline field
    │   └── useAuditWrite.ts    ← writeAuditEntry() wrapper with auto-fill of userId/role
    │
    └── types/
        ├── case.ts
        ├── task.ts
        ├── entities.ts
        └── audit.ts
```

---

## 6. How the Single App Replaces Separate Action Apps

In v2 of this blueprint, 7 separate Coded Action Apps were proposed for the 18 human tasks. That was wrong. Here is why one app handles everything:

**The pattern:**

```
User clicks task in TaskInbox
    ↓
TaskModal opens (React modal — same page, same app)
    ↓
Renders HT01_CompletePO.tsx (or whichever task component matches taskCode)
    ↓
User fills form, clicks decision button
    ↓
useTaskSubmit hook calls Tasks.complete(taskId, { outcome, data })
    ↓
Maestro case continues — stage gate evaluates
```

No iframe. No separate deployment. No `action-schema.json`. The same UiPath OAuth token the user logged in with authorises `Tasks.complete()` directly from React.

```typescript
// src/hooks/useTaskSubmit.ts
import { Tasks } from '@uipath/uipath-typescript/action-center';
import { sdk } from '../lib/sdk';
import { useAuditWrite } from './useAuditWrite';

const tasksSvc = new Tasks(sdk);

export const useTaskSubmit = () => {
  const writeAudit = useAuditWrite();

  const submitTask = async (
    taskId: string,
    outcome: string,
    formData: Record<string, unknown>,
    meta: { caseId: string; taskCode: string; stageId: string }
  ) => {
    await tasksSvc.complete(taskId, { outcome, data: formData });

    // Write supplemental audit entry to Data Fabric
    await writeAudit({
      caseId:   meta.caseId,
      actionType: 'TASK_COMPLETED',
      stageId:  meta.stageId,
      taskCode: meta.taskCode,
      decision: outcome,
    });
  };

  return { submitTask };
};
```

```typescript
// src/features/tasks/TaskModal.tsx
import { HT_FORM_MAP } from './forms';

export const TaskModal = ({ task, onClose }: Props) => {
  const FormComponent = HT_FORM_MAP[task.taskCode];   // e.g. HT_FORM_MAP['HT-11'] → HT11_OFACFuzzy
  if (!FormComponent) return <UnknownTaskFallback />;
  return (
    <Modal onClose={onClose}>
      <FormComponent task={task} onClose={onClose} />
    </Modal>
  );
};

// src/features/tasks/forms/index.ts
export const HT_FORM_MAP: Record<string, React.ComponentType<HtFormProps>> = {
  'HT-01': HT01_CompletePO,
  'HT-02': HT02_VerifyCOO,
  'HT-03': HT03_ISFElements,
  'HT-04': HT04_ISFDoNotLoad,
  'HT-05': HT05_ISFAmendment,
  'HT-06': HT06_HTSReview,
  'HT-07': HT07_HTSManual,
  'HT-08': HT08_COODocs,
  'HT-09': HT09_PGAHold,
  'HT-10': HT10_PGARefusal,
  'HT-11': HT11_OFACFuzzy,
  'HT-12': HT12_OFACHit,
  'HT-13': HT13_CBPExam,
  'HT-14': HT14_CF28,
  'HT-15': HT15_CF29,
  'HT-16': HT16_DocDiscrepancy,
  'HT-17': HT17_DutyVariance,
  'HT-18': HT18_DutySavings,
};
```

---

## 7. All 18 HT Form Components — Props Contract

Each form component receives the task object from Action Center and calls `useTaskSubmit` on submission. They all share the same prop interface:

```typescript
// src/types/task.ts
export interface ActionCenterTask {
  id: string;
  taskCode: string;           // 'HT-01' through 'HT-18'
  caseId: string;
  stageId: string;
  assigneeRole: string;
  slaDeadline: string;        // ISO UTC
  taskState: string;
  inputData: Record<string, unknown>;   // pre-populated from Maestro
  title: string;
}

export interface HtFormProps {
  task: ActionCenterTask;
  onClose: () => void;
}
```

### HT-01 — Complete PO Data (role: `ImporterOps`, SLA: 2 hrs)

```typescript
// Reads from: task.inputData.missingFields[], task.inputData.supplierName
// Outcomes: 'Complete' | 'Escalate'
// Writes to: tasks.complete() data: { poNumber, supplierAddress, goodsDescription,
//            quantity, unitPriceUsd, totalValueUsd, incoterms, expectedShipDate,
//            portOfLoading, portOfEntry }
```

### HT-02 — Verify True Country of Origin (role: `ComplianceOfficer`, SLA: 4 hrs)

```typescript
// Reads: cooDecl, supplierZone, transshipmentFlag
// Outcomes: 'ConfirmCOO' | 'RejectShipment' | 'RequestDocuments'
// Writes: cooVerified, cooEvidenceType, substantialTransformationConfirmed, notes, documentUploaded
```

### HT-03 — Collect Missing ISF Elements (role: `CustomsBroker`, SLA: 4 hrs)

```typescript
// Reads: missingElements[], isfDeadlineUtc (shown as live countdown)
// Outcomes: 'SubmitISF' | 'RequestFromCarrier' | 'Escalate'
// Writes: all 10 ISF element fields (sellerNameAddress through consolidatorName)
```

### HT-04 — ISF Do Not Load (role: `CustomsBroker`+`LegalCounsel`, SLA: immediate)

```typescript
// Reads: isfTxnNumber, errorCode, errorDetail
// Outcomes: 'CorrectedAndResubmitted' | 'EscalateLegal' | 'HoldShipment'
// Writes: correctionSummary, actionTaken
// UI: full-screen alert style — red header, no dismiss without decision
```

### HT-05 — ISF Material Amendment (role: `CustomsBroker`, SLA: 2 hrs)

```typescript
// Reads: blNumber, discrepancyType, discrepancyDetail
// Outcomes: 'AmendAndResubmit' | 'HoldForReview'
// Writes: amendmentReason, changedFields[]
```

### HT-06 — HTS Review 70–90% Confidence (role: `CustomsBroker`, SLA: 4 hrs)

```typescript
// Reads: productDescription, aiHtsCandidates[] (top 3 with scores + ruling citations),
//        topCandidate, topCandidateConfidence
// Outcomes: 'ConfirmAISuggestion' | 'OverrideWithManual' | 'EscalateToSpecialist'
// Writes: confirmedHtsCode, brokerNotes
// UI: shows AI confidence bar, ruling citation links, override text input
```

### HT-07 — Manual HTS Classification < 70% (role: `ClassificationSpecialist`, SLA: 8 hrs)

```typescript
// Reads: productDescription, aiHtsCandidates[] (for reference)
// Outcomes: 'SubmitHTS' | 'RequestBindingRuling'
// Writes: manualHtsCode, classificationBasis, rulingCitationUsed
```

### HT-08 — COO Documentation Required (role: `ComplianceOfficer`, SLA: 24 hrs)

```typescript
// Reads: declaredCoo, supplierName, transshipmentRisk
// Outcomes: 'DocumentsSubmitted' | 'RejectTransshipment' | 'EscalateLegal'
// Writes: cooDocType, substantialTransformationEvidence, documentUploaded
```

### HT-09 — PGA May Hold (role: `CustomsBroker`, SLA: 4 hrs)

```typescript
// Reads: agencyName, holdReason, requiredDocuments[], portArrivalEta
// Outcomes: 'DocumentsSubmitted' | 'RequestExtension' | 'EscalateCompliance'
// Writes: actionTaken, permitUploaded, permitNumber
```

### HT-10 — PGA Refusal (role: `ComplianceOfficer`+`LegalCounsel`, SLA: immediate)

```typescript
// Reads: agencyName, refusalReason, htsCode, shipmentValueUsd
// Outcomes: 'ReExport' | 'RequestDestruction' | 'AppealRefusal'
// Writes: dispositionDecision, legalHoldNotes
// UI: full-screen alert, three clearly distinct outcome buttons
```

### HT-11 — OFAC Fuzzy Match Review ≥ 85% (role: `ComplianceOfficer`, SLA: 2 hrs)

```typescript
// Reads: partyName, partyRole, partyCountry, matchedSdnEntry, matchScore, listVersion
// Outcomes: 'ClearParty' | 'EscalateToLegal' | 'BlockShipment'
// Writes: reviewNotes, researchSummary
// UI: shows SDN entry details, match score gauge, research notes textarea
```

### HT-12 — Confirmed OFAC / DPL Hit (role: `LegalCounsel`+`Management`, SLA: immediate)

```typescript
// Reads: partyName, hitType, sdnListEntry, matchScore
// Outcomes: 'BlockAndReport' | 'LegalReview'
// Writes: legalHoldReason, reportingObligation
// UI: full-screen red alert — no dismiss, mandatory notes before any outcome
```

### HT-13 — CBP Exam Selected (role: `PortAgent`, SLA: 4 hrs)

```typescript
// Reads: examType, portOfEntry, entryNumber, containerNumbers[]
// Outcomes: 'Acknowledged' | 'RequestClarification'
// Writes: portAgentContact, examLocation, estimatedDurationHrs
```

### HT-14 — CF-28 Unanswered Questions (role: `CustomsBroker`+`ImporterOps`, SLA: 5 days)

```typescript
// Reads: cf28Questions[] (array of { questionId, questionText }),
//        cbpResponseDeadline (shown as progress bar)
// Outcomes: 'SubmitResponse' | 'RequestCBPExtension'
// Writes: questionResponses[] (array of { questionId, responseText })
// UI: one section per CBP question; progress bar for 5-day deadline
```

### HT-15 — CF-29 / CBP Action Review (role: `CustomsBroker`+`LegalCounsel`, SLA: 2 days)

```typescript
// Reads: actionType, dutyDelta, protestEligible, protestDeadline
// Outcomes: 'AcceptAction' | 'FilePBPProtest'
// Writes: decision, protestGrounds
// UI: shows duty delta calculation, protest deadline countdown
```

### HT-16 — Document Discrepancy (role: `ImporterOps`, SLA: 4 hrs)

```typescript
// Reads: discrepancyType, sourceDocument, expectedValue, actualValue
// Outcomes: 'Corrected' | 'AcceptVariance' | 'EscalateToFinance'
// Writes: correctionNotes
```

### HT-17 — Duty Variance Review (role: `Finance`, SLA: 2 days)

```typescript
// Reads: estimatedDutyUsd, actualDutyUsd, varianceUsd, variancePct, htsCode
// Outcomes: 'ApproveVariance' | 'InvestigateVariance'
// Writes: approvalNotes, glPostingRef
// UI: shows side-by-side estimated vs actual; variance highlighted if > threshold
```

### HT-18 — Duty Savings Opportunity (role: `TradeCounsel`, SLA: 5 days)

```typescript
// Reads: opportunityType, estimatedSavingsUsd, counselRecommendation
// Outcomes: 'PursueSavings' | 'DeclineSavings'
// Writes: decisionNotes
```

---

## 8. RBAC — Roles in JWT, Enforced in React

UiPath Identity Server puts the user's roles into the JWT returned at login. The app reads them once and gates every action client-side.

```typescript
// src/store/authStore.ts (Zustand)
interface AuthStore {
  userId:    string;
  roles:     string[];      // from JWT — e.g. ['CustomsBroker', 'ComplianceOfficer']
  sessionId: string;
  isAdmin:   boolean;       // roles.includes('PlatformAdmin')
}
```

```typescript
// src/hooks/useCanApprove.ts — role gate for task forms
const TASK_ROLES: Record<string, string[]> = {
  'HT-01': ['ImporterOps',       'PlatformAdmin'],
  'HT-02': ['ComplianceOfficer', 'PlatformAdmin'],
  'HT-03': ['CustomsBroker',     'PlatformAdmin'],
  'HT-04': ['CustomsBroker', 'LegalCounsel', 'PlatformAdmin'],
  'HT-05': ['CustomsBroker',     'PlatformAdmin'],
  'HT-06': ['CustomsBroker',     'PlatformAdmin'],
  'HT-07': ['ClassificationSpecialist', 'PlatformAdmin'],
  'HT-08': ['ComplianceOfficer', 'PlatformAdmin'],
  'HT-09': ['CustomsBroker',     'PlatformAdmin'],
  'HT-10': ['ComplianceOfficer', 'LegalCounsel', 'PlatformAdmin'],
  'HT-11': ['ComplianceOfficer', 'PlatformAdmin'],
  'HT-12': ['LegalCounsel',      'PlatformAdmin'],
  'HT-13': ['PortAgent',         'PlatformAdmin'],
  'HT-14': ['CustomsBroker', 'ImporterOps', 'PlatformAdmin'],
  'HT-15': ['CustomsBroker', 'LegalCounsel', 'PlatformAdmin'],
  'HT-16': ['ImporterOps',       'PlatformAdmin'],
  'HT-17': ['Finance',           'PlatformAdmin'],
  'HT-18': ['TradeCounsel',      'PlatformAdmin'],
};

export const useCanApprove = (taskCode: string): boolean => {
  const { roles } = useAuthStore();
  return (TASK_ROLES[taskCode] ?? []).some(r => roles.includes(r));
};
```

```typescript
// Usage in TaskModal — show form OR read-only view based on role
const canApprove = useCanApprove(task.taskCode);

return canApprove
  ? <FormComponent task={task} onClose={onClose} />
  : <ReadOnlyTaskView task={task} onClose={onClose} />;
```

### Route-level role gates

```typescript
// src/features/auth/ProtectedRoute.tsx
export const ProtectedRoute = ({
  allowedRoles,
  children,
}: { allowedRoles?: string[]; children: React.ReactNode }) => {
  const { roles } = useAuthStore();

  if (!allowedRoles) return <>{children}</>;
  if (!allowedRoles.some(r => roles.includes(r))) return <AccessDenied />;
  return <>{children}</>;
};

// Usage in App.tsx router
<Route path="/admin"  element={<ProtectedRoute allowedRoles={['PlatformAdmin']}><AdminPage /></ProtectedRoute>} />
<Route path="/audit"  element={<ProtectedRoute allowedRoles={['PlatformAdmin', 'ComplianceOfficer']}><AuditLog /></ProtectedRoute>} />
<Route path="/cases"  element={<ProtectedRoute><CaseList /></ProtectedRoute>} />   {/* all roles */}
```

---

## 9. Data Fabric — All Entities, One SDK

```typescript
// src/hooks/useEntities.ts — typed, cursor-paginated for any entity
import { Entities } from '@uipath/uipath-typescript/data-fabric';
import { sdk } from '../lib/sdk';

const entitiesSvc = new Entities(sdk);

// Generic paginated hook
export const useEntityPage = <T>(entityId: string, cursor?: string, pageSize = 25) =>
  useQuery({
    queryKey: [entityId, cursor, pageSize],
    queryFn:  () => entitiesSvc.getAll(entityId, { pageSize, cursor }),
  });

// Typed shortcuts per entity
export const useCaseRecords   = (cursor?: string) =>
  useEntityPage(import.meta.env.VITE_ENTITY_CASE, cursor);

export const useTaskRecords   = (caseId: string) =>
  useQuery({
    queryKey: ['task-records', caseId],
    queryFn:  () => entitiesSvc.queryRecords(
      import.meta.env.VITE_ENTITY_TASK,
      { filter: `CaseRef eq '${caseId}'` }
    ),
  });

export const useOFACRecords   = (caseId: string) =>
  useQuery({
    queryKey: ['ofac', caseId],
    queryFn:  () => entitiesSvc.queryRecords(
      import.meta.env.VITE_ENTITY_OFAC,
      { filter: `CaseRef eq '${caseId}'` }
    ),
  });

export const useDocuments     = (caseId: string) =>
  useQuery({
    queryKey: ['docs', caseId],
    queryFn:  () => entitiesSvc.queryRecords(
      import.meta.env.VITE_ENTITY_DOC,
      { filter: `CaseRef eq '${caseId}'`, orderBy: 'UploadedAt desc' }
    ),
  });

export const useDutyRecord    = (caseId: string) =>
  useQuery({
    queryKey: ['duty', caseId],
    queryFn:  () => entitiesSvc.queryRecords(
      import.meta.env.VITE_ENTITY_DUTY,
      { filter: `CaseRef eq '${caseId}'` }
    ),
  });

// Full export — cursor loop (never read items.length after a single call)
export const exportAllCaseRecords = async (): Promise<unknown[]> => {
  const all: unknown[] = [];
  let page = await entitiesSvc.getAll(import.meta.env.VITE_ENTITY_CASE);
  all.push(...page.items);
  while (page.hasNextPage) {
    page = await entitiesSvc.getAll(import.meta.env.VITE_ENTITY_CASE, { cursor: page.nextCursor });
    all.push(...page.items);
  }
  return all;
};
```

### Data Fabric Entity Schema (reserved keyword substitutions applied)

| Entity DF name | Replaces | Retention |
|---|---|---|
| `ImportCaseRecord` | `Case` (reserved) | 7 yr |
| `HumanTaskRecord` | `Task` (reserved) | 7 yr |
| `OfacScreeningRecord` | — | 5 yr (CBP) |
| `IsfFilingRecord` | — | 5 yr |
| `ShipmentDocument` | — | 5–7 yr |
| `DutyCalculation` | `Order` (reserved) | 7 yr |
| `AuditEntry` | — | 7 yr |

Field naming rules enforced: no `Case`, `Status`, `Type`, `Key`, `Order`, `User`, `Role`, `Index` — all are C#/VB/SQL reserved words that DF rejects with `RESERVED_LANGUAGE_KEYWORDS`.

---

## 10. Audit Trail — All from Data Fabric, No Backend

```typescript
// src/lib/audit.ts
import { Entities } from '@uipath/uipath-typescript/data-fabric';
import { sdk } from './sdk';
import { useAuthStore } from '../store/authStore';

const entitiesSvc = new Entities(sdk);

export type AuditActionType =
  | 'CASE_VIEWED' | 'CASE_FIELD_UPDATED'
  | 'TASK_COMPLETED' | 'TASK_ESCALATED'
  | 'DOCUMENT_UPLOADED' | 'DOCUMENT_VIEWED'
  | 'HTS_OVERRIDDEN' | 'OFAC_REVIEW_COMPLETED'
  | 'DUTY_SAVINGS_DECIDED' | 'AUDIT_EXPORTED'
  | 'SLA_ACKNOWLEDGED';

export const writeAuditEntry = async (entry: {
  caseId: string;
  actionType: AuditActionType;
  stageId: string;
  taskCode?: string;
  fieldChanged?: string;
  previousValue?: string;
  newValue?: string;
  decision?: string;
}) => {
  const { userId, roles, sessionId } = useAuthStore.getState();
  await entitiesSvc.insert(import.meta.env.VITE_ENTITY_AUDIT, {
    CaseRef:         entry.caseId,
    ActorUserId:     userId,
    ActorRole:       roles[0] ?? 'Unknown',
    ActionType:      entry.actionType,
    StageId:         entry.stageId,
    TaskCode:        entry.taskCode   ?? null,
    FieldChanged:    entry.fieldChanged ?? null,
    PreviousValue:   entry.previousValue ?? null,
    NewValue:        entry.newValue   ?? null,
    DecisionOutcome: entry.decision   ?? null,
    SessionId:       sessionId,
    RecordedAt:      new Date().toISOString(),
  });
};
```

---

## 11. SLA Timer Hook

```typescript
// src/hooks/useSLATimer.ts
export const useSLATimer = (slaDeadlineUtc: string) => {
  const deadline   = useMemo(() => new Date(slaDeadlineUtc).getTime(), [slaDeadlineUtc]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, deadline - now);
  const total     = deadline - (now - remaining);   // original total span
  const pct       = total > 0 ? (remaining / total) * 100 : 0;

  return {
    remaining,
    isBreached: remaining === 0,
    urgency: remaining === 0 ? 'breached'
           : pct < 25        ? 'critical'   // red pulsing
           : pct < 50        ? 'warning'    // amber
           : 'ok',                          // green
  };
};
```

| SLA | Source field | Urgency display |
|---|---|---|
| ISF 24-hr pre-departure | `IsfFilingRecord.DeadlineUtc` | Red banner spanning S2 panel |
| OFAC fuzzy review 2 hrs | `HumanTaskRecord.SlaDeadline` (HT-11) | Pulsing badge on task card |
| HTS review 4 hrs | `HumanTaskRecord.SlaDeadline` (HT-06/07) | Pulsing badge on task card |
| HT-04 / HT-10 / HT-12 immediate | `HumanTaskRecord.SlaDeadline` | Full-screen alert modal auto-opens |
| CF-28 response 5 days | `HumanTaskRecord.SlaDeadline` (HT-14) | Progress bar in S6 panel |

---

## 12. KPI Dashboard — All from SDK, No Backend

| Tile | SDK call | Poll |
|---|---|---|
| Active cases | `entitiesSvc.getAll(CASE_ENTITY)` count where `CaseState = ACTIVE` | 30 s |
| ISF SLA compliance % | `entitiesSvc.queryRecords` aggregate on `IsfFilingRecord.SlaBreached` | 60 s |
| OFAC hits (30 days) | `entitiesSvc.queryRecords` on `OfacScreeningRecord` where `MatchResult = CONFIRMED_HIT` | 5 min |
| Pending human tasks | `tasksSvc.getAll()` count | 60 s |
| CBP exam rate | `entitiesSvc.queryRecords` on `ImportCaseRecord.CbpStatus = EXAM` | 5 min |
| Avg cycle time | `ImportCaseRecord` created→closed delta via DF query | 5 min |
| SLA breaches today | `HumanTaskRecord` where `TaskState = SlaBreached` and `CompletedAt >= today` | 60 s |
| Cases by stage | `ImportCaseRecord.CurrentStage` group count | 60 s |

---

## 13. OAuth Scopes — One Scope String for the Single App

Every scope the app needs is declared once in `VITE_UIPATH_SCOPE`. Add a scope before using its SDK method — mismatched scopes fail silently with 401/403.

| SDK method | Required scope |
|---|---|
| `casesSvc.getAll()` / `getById()` | `OR.Cases` |
| `tasksSvc.getAll()` | `ActionCenter.Tasks.Read` |
| `tasksSvc.complete()` | `ActionCenter.Tasks.Write` |
| `entitiesSvc.getAll()` / `queryRecords()` | `DataService.Api.All` |
| `entitiesSvc.insert()` (audit write) | `DataService.Api.All` |
| `piSvc.cancel()` | `OR.ProcessInstances` |

Full scope string for `.env`:
```
VITE_UIPATH_SCOPE=OR.Cases OR.Tasks DataService.Api.All ActionCenter.Tasks.Read ActionCenter.Tasks.Write OR.ProcessInstances
```

---

## 14. Deploy Pipeline — One App, One Command Set

```bash
# 1. Build
npm run build
ls dist/     # verify dist/ exists before packing

# 2. Pack (bump version on every re-deploy — same version fails)
uip codedapp pack dist -n tradeflow-maestro --version 1.0.0

# 3. Publish (default Web type — no -t flag needed)
uip codedapp publish
cat .uipath/app.config.json   # verify deploymentId is written

# 4. Resolve folder name → GUID (never parseInt the GUID)
uip or folders list --output json
# Match on .Name field, extract .Key (string GUID)

# 5. Deploy non-interactively (always pass --folder-key)
uip codedapp deploy -n tradeflow-maestro --folder-key <GUID>
# → app URL printed to console; share with team
```

---

## 15. Technology Stack

| Layer | Choice |
|---|---|
| App type | UiPath Coded Web App — single deployment |
| Scaffold | `uip codedapp new --template react-ts` |
| UiPath SDK | `@uipath/uipath-typescript` — subpath imports only |
| Framework | React 18 + TypeScript 5 |
| State — auth + UI | Zustand (auth store, ui store) |
| State — server | TanStack Query v5 (cursor-paginated DF + Action Center) |
| Routing | React Router v6 |
| Forms | React Hook Form + Zod (18 HT form components, same app) |
| Tables | TanStack Table v8 (cursor pagination, 25 rows/page) |
| Styling | Tailwind CSS |
| Build | Vite (`base: './'` — mandatory) |
| Auth | `@uipath/uipath-typescript` OIDC — SDK-native, no separate library |

---

## 16. What Was Wrong in v2 and Why v3 Fixes It

| v2 (incorrect) | v3 (correct) | Why |
|---|---|---|
| 7 separate Coded Action Apps for HT forms | 18 React form components inside the single app | Action Apps are only needed when Maestro renders forms in the embedded Action Center panel. A custom ops dashboard uses `Tasks.complete()` directly from React — no separate deploy. |
| Suggested "backend or separate API layer" | No backend — all calls go through `@uipath/uipath-typescript` SDK | The SDK handles auth, routing, and all UiPath service calls directly from the browser. |
| `oidc-client-ts` dependency | SDK-native OIDC | UiPath Coded Web App SDK manages the Identity Server OIDC flow internally. |
| Separate `action-schema.json` files | No action-schema — React Hook Form defines the schema | `action-schema.json` is only for Coded Action Apps; our forms are plain React components. |

---

## 17. Development Phases

| Phase | Weeks | Deliverables |
|---|---|---|
| 1 — Scaffold + Auth + RBAC | 1–2 | `uip codedapp new`, Identity OIDC, authStore with roles, ProtectedRoute, External App registration |
| 2 — Data Fabric Schema | 3 | 7 entities created via `uip df entities create`, choice sets, RELATIONSHIP fields, VITE_ entity IDs |
| 3 — Case Views | 4–5 | Case list (cursor-paginated), CaseDetail, StageRail, parallel stage display, S6 gate logic |
| 4 — Task Inbox + 18 HT Forms | 6–8 | TaskInbox, TaskModal, HT_FORM_MAP, all 18 form components, useTaskSubmit hook |
| 5 — Compliance Panels | 9–10 | OFAC party table, ISF 10+2 panel, HTS classification + duty breakdown, SLA countdowns |
| 6 — Documents + Audit | 11 | DocumentUpload → DF, 9-doc checklist, AuditLog from DF AuditEntry, retention badges |
| 7 — Dashboard + Deploy | 12 | KPI tiles, admin user/role views, full build→pack→publish→deploy pipeline |

---

*Blueprint v3.0 — single Coded Web App, no backend, no separate Action Apps*
*Verified against: uipath-coded-apps, uipath-maestro-case, uipath-data-fabric, uipath-admin skills*
*Dubai → USA Import, UiPath Maestro, June 2026 | rpabotsworld.com*
