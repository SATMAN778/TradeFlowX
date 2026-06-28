// src/lib/audit.ts — writeAuditEntry to Data Fabric (Blueprint v3)
import { dfHelper } from './sdk';
import { useAuthStore } from '../store/authStore';
import type { AuditActionType } from '../types/audit';

export type { AuditActionType };

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
  const AUDIT_ENTITY = import.meta.env.VITE_ENTITY_AUDIT;
  if (!AUDIT_ENTITY) {
    console.warn('[audit] VITE_ENTITY_AUDIT not set — skipping audit write');
    return;
  }

  const { userId, roles, sessionId } = useAuthStore.getState();

  try {
    await dfHelper.insert(AUDIT_ENTITY, {
      CaseRef:         entry.caseId,
      ActorUserId:     userId || 'anonymous',
      ActorRole:       roles[0] ?? 'Unknown',
      ActionType:      entry.actionType,
      StageId:         entry.stageId,
      TaskCode:        entry.taskCode ?? null,
      FieldChanged:    entry.fieldChanged ?? null,
      PreviousValue:   entry.previousValue ?? null,
      NewValue:        entry.newValue ?? null,
      DecisionOutcome: entry.decision ?? null,
      SessionId:       sessionId || null,
      RecordedAt:      new Date().toISOString(),
    });
  } catch (err) {
    console.error('[audit] Failed to write audit entry:', err);
  }
};
