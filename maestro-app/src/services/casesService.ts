import { config } from '../config';
import type { CaseInstance, CaseInstanceRaw, CaseSummary, CaseSummaryRaw, TaskDetailsResponse, CaseDetailsResponse, MyTask } from '../types/cases';

const BASE = config.apiBaseUrl;

function mapCase(raw: CaseSummaryRaw): CaseSummary {
  return {
    processKey: raw.processKey,
    name: raw.releaseName,
    running: raw.runningCount,
    completed: raw.completedCount,
    faulted: raw.faultedCount,
    total:
      raw.pendingCount +
      raw.runningCount +
      raw.completedCount +
      raw.pausedCount +
      raw.cancelledCount +
      raw.faultedCount +
      raw.retryingCount +
      raw.resumingCount +
      raw.pausingCount +
      raw.cancelingCount,
    versions: raw.versionCount,
    location: raw.folderName,
  };
}

export async function getCases(): Promise<CaseSummary[]> {
  const res = await fetch(`${BASE}/api/cases`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch cases');

  const data = await res.json();
  const rawList: CaseSummaryRaw[] = data.processes ?? [];
  return rawList.map(mapCase);
}

function mapInstance(raw: CaseInstanceRaw): CaseInstance {
  return {
    instanceId: raw.instanceId,
    id: raw.externalId,
    version: raw.packageVersion,
    startedAt: new Date(raw.startedTimeUtc).toLocaleString(),
    status: raw.latestRunStatus,
    folderKey: raw.folderKey,
  };
}

export async function getCaseInstances(processKey: string): Promise<CaseInstance[]> {
  const res = await fetch(`${BASE}/api/cases/${processKey}/instances`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch case instances');

  const data = await res.json();
  const rawList: CaseInstanceRaw[] = data.instances ?? [];
  return rawList.map(mapInstance);
}

export async function getHitlLink(instanceId: string, folderKey: string): Promise<string | null> {
  const res = await fetch(`${BASE}/api/cases/instances/${instanceId}/hitl-link?folderKey=${encodeURIComponent(folderKey)}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch HITL link');

  const data: { externalLink: string | null } = await res.json();
  return data.externalLink;
}

export async function getTaskDetails(instanceId: string, folderKey: string): Promise<TaskDetailsResponse> {
  const res = await fetch(
    `${BASE}/api/cases/instances/${instanceId}/task-details?folderKey=${encodeURIComponent(folderKey)}`,
    { credentials: 'include' },
  );
  if (!res.ok) throw new Error('Failed to fetch task details');
  return res.json();
}

export async function assignTask(taskId: string, folderId: number): Promise<void> {
  const res = await fetch(`${BASE}/api/cases/tasks/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ taskId: Number(taskId), folderId }),
  });
  if (!res.ok) throw new Error('Failed to assign task');
}

export async function completeTask(
  taskId: string,
  folderId: number,
  data: Record<string, unknown>,
  action: string,
): Promise<void> {
  const res = await fetch(`${BASE}/api/cases/tasks/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ taskId: Number(taskId), folderId, data, action }),
  });
  if (!res.ok) throw new Error('Failed to complete task');
}

export async function getCaseDetails(instanceId: string, folderKey: string): Promise<CaseDetailsResponse> {
  const res = await fetch(
    `${BASE}/api/cases/instances/${instanceId}/details?folderKey=${encodeURIComponent(folderKey)}`,
    { credentials: 'include' }
  );
  if (!res.ok) throw new Error('Failed to fetch case details');
  return res.json();
}

export async function getMyTasks(): Promise<MyTask[]> {
  const res = await fetch(`${BASE}/api/tasks/my-tasks`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch my tasks');
  const data = await res.json();
  return data.tasks ?? [];
}

export interface TradeOverview {
  routes: string[];           // e.g. ["Dubai / Jebel Ali → Port of New York", ...]
  ofac: Record<string, number>; // { "Clear": 3, "Matched": 1 }
  isf: Record<string, number>;  // { "Filed": 2, "Pending": 1 }
  activeInstances: number;
  completedInstances: number;
  sampledInstances: number;
  error?: string;
}

export async function getTradeOverview(): Promise<TradeOverview> {
  const res = await fetch(`${BASE}/api/stats/overview`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch trade overview');
  return res.json();
}
