// src/types/task.ts — Blueprint v3 ActionCenter task types

export interface ActionCenterTask {
  id: string;
  taskCode: string;           // 'HT-01' through 'HT-18'
  caseId: string;
  stageId: string;
  assigneeRole: string;
  slaDeadline: string;        // ISO UTC
  taskState: string;
  inputData: Record<string, unknown>;
  title: string;
  priority?: string;
  createdAt?: string;
}

export interface HtFormProps {
  task: ActionCenterTask;
  onClose: () => void;
}

export const TASK_ROLES: Record<string, string[]> = {
  'HT-01': ['ImporterOps',       'PlatformAdmin', 'admin'],
  'HT-02': ['ComplianceOfficer', 'PlatformAdmin', 'manager'],
  'HT-03': ['CustomsBroker',     'PlatformAdmin', 'reviewer_customs'],
  'HT-04': ['CustomsBroker', 'LegalCounsel', 'PlatformAdmin', 'admin'],
  'HT-05': ['CustomsBroker',     'PlatformAdmin', 'reviewer_customs'],
  'HT-06': ['CustomsBroker',     'PlatformAdmin', 'reviewer_customs'],
  'HT-07': ['ClassificationSpecialist', 'PlatformAdmin', 'reviewer_customs'],
  'HT-08': ['ComplianceOfficer', 'PlatformAdmin', 'manager'],
  'HT-09': ['CustomsBroker',     'PlatformAdmin', 'reviewer_customs'],
  'HT-10': ['ComplianceOfficer', 'LegalCounsel', 'PlatformAdmin', 'manager'],
  'HT-11': ['ComplianceOfficer', 'PlatformAdmin', 'manager'],
  'HT-12': ['LegalCounsel',      'PlatformAdmin', 'admin'],
  'HT-13': ['PortAgent',         'PlatformAdmin', 'reviewer_freight_forwarder'],
  'HT-14': ['CustomsBroker', 'ImporterOps', 'PlatformAdmin', 'reviewer_customs'],
  'HT-15': ['CustomsBroker', 'LegalCounsel', 'PlatformAdmin', 'reviewer_customs'],
  'HT-16': ['ImporterOps',       'PlatformAdmin', 'reviewer_shipper'],
  'HT-17': ['Finance',           'PlatformAdmin', 'manager'],
  'HT-18': ['TradeCounsel',      'PlatformAdmin', 'admin'],
};
