export interface CaseSummaryRaw {
  processKey: string;
  releaseName: string;
  pendingCount: number;
  runningCount: number;
  completedCount: number;
  pausedCount: number;
  cancelledCount: number;
  faultedCount: number;
  retryingCount: number;
  resumingCount: number;
  pausingCount: number;
  cancelingCount: number;
  versionCount: number;
  folderName: string;
}

export interface CaseSummary {
  processKey: string;
  name: string;
  running: number;
  completed: number;
  faulted: number;
  total: number;
  versions: number;
  location: string;
}

export interface CaseInstanceRaw {
  instanceId: string;
  externalId: string;
  packageVersion: string;
  startedTimeUtc: string;
  latestRunStatus: string;
  folderKey: string;
}

export interface CaseInstance {
  instanceId: string;
  id: string;
  version: string;
  startedAt: string;
  status: string;
  folderKey: string;
}

export interface TaskDetailsResponse {
  taskId?: string;
  folderId?: number;
  externalLink?: string | null;
  task?: any | null;
  currentUserEmail?: string | null;
}

export interface StageTask {
  id: string;
  name: string;
  startedTime?: string | null;
  completedTime?: string | null;
  status: string;
  type: string;
}

export interface Stage {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  description: string;
  tasks?: StageTask[];
}

export interface CaseDetailsResponse {
  instance: CaseInstanceRaw;
  variables: Record<string, any>;
  stages: Stage[];
}

export interface MyTask {
  taskId: string;
  folderId: number;
  folderKey: string;
  title: string;
  priority: string;
  status: string;
  assignedToUser: string | null;
  caseInstanceId: string | null;
  createdAt: string;
  data: Record<string, any>;
  externalLink?: string | null;
  currentUserEmail?: string | null;
}
