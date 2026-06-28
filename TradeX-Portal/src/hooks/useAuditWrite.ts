// src/hooks/useAuditWrite.ts — Convenience wrapper around writeAuditEntry
import { useCallback } from 'react';
import { writeAuditEntry } from '../lib/audit';
import type { AuditActionType } from '../types/audit';

interface AuditPayload {
  caseId: string;
  actionType: AuditActionType;
  stageId: string;
  taskCode?: string;
  fieldChanged?: string;
  previousValue?: string;
  newValue?: string;
  decision?: string;
}

export const useAuditWrite = () => {
  return useCallback((payload: AuditPayload) => writeAuditEntry(payload), []);
};
