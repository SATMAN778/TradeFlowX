import type { CaseInstance, CaseInstanceRaw, CaseSummary, CaseSummaryRaw, TaskDetailsResponse, CaseDetailsResponse, MyTask, ShipmentDoc } from '../types/cases';
import { sdk, tasksSvc, entitiesSvc, maestroProcessesSvc, caseInstancesSvc, casesSvc, bucketsSvc } from '../lib/sdk';
import { config } from '../config';

const BASE = config.apiBaseUrl;
const FOLDER_KEY = import.meta.env.VITE_FOLDER_KEY || 'Shared/TradeFlowAICase1';

export async function getCases(): Promise<CaseSummary[]> {
  try {
    const data: any = await casesSvc.getAll();
    const items = Array.isArray(data) ? data : (data.processes ?? data.items ?? []);
    
    // Fetch instance stats for each case if available
    const casesWithStats = await Promise.all(items.map(async (raw: any) => {
      let avgDuration = 0;
      let p95Duration = 0;
      
      try {
        if (raw.processKey && raw.packageId) {
          const stats = await casesSvc.getInstanceStats({
            processKey: raw.processKey,
            packageId: raw.packageId,
            packageVersion: raw.packageVersions?.[0] || '1.0.0',
            startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // last 30 days
            endTime: new Date(),
          });
          avgDuration = (stats as any).avgDurationMs || 0;
          p95Duration = (stats as any).p95DurationMs || 0;
        }
      } catch (e) {
        // ignore if stats not available
      }
      
      return {
        processKey: raw.processKey,
        name: raw.releaseName || raw.name,
        running: raw.runningCount || 0,
        completed: raw.completedCount || 0,
        faulted: raw.faultedCount || 0,
        total: (raw.pendingCount || 0) + (raw.runningCount || 0) + (raw.completedCount || 0) + (raw.pausedCount || 0) + (raw.cancelledCount || 0) + (raw.faultedCount || 0) + (raw.retryingCount || 0) + (raw.resumingCount || 0) + (raw.pausingCount || 0) + (raw.cancelingCount || 0),
        versions: raw.versionCount || 1,
        location: raw.folderName || 'Default',
        avgDurationMs: avgDuration,
        p95DurationMs: p95Duration,
      };
    }));
    
    return casesWithStats;
  } catch (err: any) {
    console.error('Failed to fetch cases from SDK', err);
    return [{ 
      processKey: 'ERROR', 
      name: `ERROR: ${err.message || err}`, 
      running: 0, completed: 0, faulted: 0, suspended: 0 
    }] as any;
  }
}

export async function getCaseInstances(processKey: string): Promise<CaseInstance[]> {
  try {
    const data: any = await caseInstancesSvc.getAll({ folderKey: FOLDER_KEY } as any);
    const items = data.instances ?? data.items ?? data.value ?? data ?? [];

    // Fetch all case records from Data Fabric to map stages
    let dfRecords: any[] = [];
    const entityId = import.meta.env.VITE_ENTITY_CASE;
    if (entityId && !entityId.startsWith('import') && !entityId.includes('mock-')) {
      try {
        const res = await entitiesSvc.getAllRecords(entityId, { pageSize: 1000 });
        dfRecords = res.items || [];
      } catch (e) {
        console.error('Failed to fetch case records from Data Fabric inside getCaseInstances:', e);
      }
    }

    const filteredItems = items.filter((raw: any) => {
      const pKey = raw.ProcessKey || raw.processKey || raw.CaseDefinitionKey || raw.caseDefinitionKey;
      return pKey === processKey;
    });

    return filteredItems.map((raw: any) => {
      const dateVal = raw.StartTime || raw.startTime || raw.CreationTime || raw.creationTime || raw.StartedTime || raw.startedTime || raw.StartedTimeUtc || raw.startedTimeUtc;
      const parsedDate = dateVal ? new Date(dateVal) : undefined;
      const startedAt = parsedDate && !isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 2000 ? parsedDate.toLocaleString() : '—';
      
      const instanceId = raw.Id || raw.id || raw.InstanceId || raw.instanceId;
      const id = raw.ExternalId || raw.externalId || raw.Id || raw.id;
      
      // Find matching stage in Data Fabric records
      const matchingRecord = dfRecords.find((r: any) => r.CaseRef === instanceId || r.CaseRef === id);
      const currentStage = matchingRecord ? matchingRecord.CurrentStage : undefined;

      return {
        instanceId,
        id,
        version: raw.PackageVersion || raw.packageVersion || '1.0',
        startedAt,
        status: raw.Status || raw.status || raw.LatestRunStatus || raw.latestRunStatus,
        folderKey: raw.FolderKey || raw.folderKey || FOLDER_KEY,
        currentStage,
      };
    });
  } catch (err) {
    console.error('Failed to fetch case instances from SDK', err);
    return [];
  }
}

export async function getHitlLink(instanceId: string, folderKey: string): Promise<string | null> {
  try {
    const instance: any = await caseInstancesSvc.getById(instanceId, folderKey);
    return instance?.externalLink || null;
  } catch (err) {
    console.error('Failed to fetch HITL link from SDK', err);
    return null;
  }
}

export async function getTaskDetails(instanceId: string, folderKey: string): Promise<TaskDetailsResponse> {
  try {
    const tasks: any = await tasksSvc.getAll({ folderKey } as any);
    const items = tasks?.value || tasks?.items || tasks || [];
    const task = items.find((t: any) => t.CaseInstanceId === instanceId || t.TaskSource?.SourceId === instanceId);
    if (!task) throw new Error(`Task not found for instance: ${instanceId}. Total tasks: ${items.length}`);
    
    // Fetch full task details (including Data/formLayout) using getById
    const taskId = task.Id || task.id;
    const folderId = task.OrganizationUnitId || task.organizationUnitId || task.folderId;
    const taskType = task.Type || task.type;
    const fullTask = await tasksSvc.getById(taskId, { taskType }, folderId);
    if (fullTask) {
      fullTask.data = fullTask.data || fullTask.Data || {};
      fullTask.Data = fullTask.Data || fullTask.data || {};
    }
    
    return {
      taskId: String(taskId),
      folderId: folderId,
      task: fullTask
    } as any;
  } catch (err: any) {
    console.error('Failed to fetch task details from SDK', err);
    // Return dummy task with error message to display in the UI
    return {
      taskId: '0',
      folderId: 0,
      task: {
        Id: 0,
        Title: `ERROR: ${err.message || err.toString()}`,
        Status: 'Unassigned',
        TaskSource: { SourceId: instanceId },
        OrganizationUnitId: 0
      }
    } as any;
  }
}

export async function getTaskById(taskId: string, folderId: number, taskType?: string): Promise<any> {
  // @ts-ignore
  const fullTask = await tasksSvc.getById(Number(taskId), taskType ? { taskType: taskType as any } : {}, folderId);
  if (fullTask) {
    fullTask.data = fullTask.data || fullTask.Data || {};
    fullTask.Data = fullTask.Data || fullTask.data || {};
  }
  return fullTask;
}

export async function getCaseDetails(instanceId: string, folderKey: string): Promise<CaseDetailsResponse> {
  try {
    const caseDetails = await caseInstancesSvc.getById(instanceId, folderKey);
    return caseDetails as any;
  } catch (err: any) {
    console.error('Failed to fetch case details from SDK', err);
    // Return dummy data with error message to display in the UI
    return {
      CaseInstanceId: instanceId,
      Status: 'Error',
      ErrorMsg: err.message || err.toString(),
      CaseDefinitionKey: 'ERROR_CASE',
      OrganizationUnitId: 0,
      Data: { error: err.message || err.toString() }
    } as any;
  }
}

// Fixed missing assignTask
export async function assignTask(taskId: string, folderId: number, email?: string): Promise<void> {
  // @ts-ignore
  await tasksSvc.assign({
    taskId: Number(taskId),
    userNameOrEmail: email || import.meta.env.VITE_UIPATH_USER_EMAIL || 'operator@tradeflow.ai'
  });
}

// Fixed missing unassignTask
export async function unassignTask(taskId: string, folderId: number): Promise<void> {
  // @ts-ignore
  if (tasksSvc.unassign) {
    // @ts-ignore
    await tasksSvc.unassign({ taskId: Number(taskId) });
  } else {
    console.warn("unassignTask: SDK does not expose unassign directly; ignoring.");
  }
}

function getDecodedUserEmail(): string {
  try {
    const token = sdk.getToken();
    if (!token) return 'operator@tradeflow.ai';
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    return parsed.email || parsed.email_address || parsed.unique_name || parsed.upn || parsed.sub || 'operator@tradeflow.ai';
  } catch (err) {
    return 'operator@tradeflow.ai';
  }
}

// Fixed missing completeTask to conform to action-schema.json inputs & outputs & outcomes
export async function completeTask(
  taskId: string,
  folderId: number,
  data: Record<string, unknown>,
  action: string,
): Promise<void> {
  const mappedAction = action === 'Approve' ? 'Approved' : action === 'Reject' ? 'Rejected' : action;
  
  // Format the outputs to match action-schema.json expected output properties
  const payload = {
    ...data,
    decision: mappedAction,
    reviewedBy: getDecodedUserEmail(),
    reviewedAt: new Date().toISOString(),
    comments: (data.comments as string) || (data.Comments as string) || `Task completed as '${mappedAction}' via TradeX Portal.`
  };

  await tasksSvc.complete({
    type: 'AppTask' as any,
    taskId: Number(taskId),
    data: payload,
    action: mappedAction
  }, folderId);
}

export async function getMyTasks(): Promise<MyTask[]> {
  try {
    // @ts-ignore
    const result = await tasksSvc.getAll({ folderKey: FOLDER_KEY });
    const items = (result as any)?.value || (result as any)?.items || result || [];
    
    const filtered = items.filter((t: any) => t.Status === 'Unassigned' || t.status === 'Unassigned' || t.Status === 'Pending' || t.status === 'Pending');
    return filtered.map((t: any) => ({
      taskId: t.Id?.toString() || t.id?.toString(),
      folderId: t.OrganizationUnitId || t.folderId,
      folderKey: FOLDER_KEY,
      title: t.Title || t.title,
      priority: t.Priority || t.priority,
      status: t.Status || t.status,
      assignedToUser: t.AssignedToUser?.EmailAddress || t.assignedToUser?.emailAddress || null,
      caseInstanceId: t.CaseInstanceId || (t.TaskSource?.SourceId) || (t.taskSource?.sourceId) || null,
      createdAt: t.CreationTime || t.createdTime,
      data: t.Data || t.data || {}
    }));
  } catch (err) {
    console.error('getMyTasks failed:', err);
    return [];
  }
}

export async function getTaskHistory(): Promise<MyTask[]> {
  try {
    // @ts-ignore
    const result = await tasksSvc.getAll({ folderKey: FOLDER_KEY });
    const items = (result as any)?.value || (result as any)?.items || result || [];
    
    const filtered = items.filter((t: any) => t.Status === 'Completed' || t.status === 'Completed');
    return filtered.map((t: any) => ({
      taskId: t.Id?.toString() || t.id?.toString(),
      folderId: t.OrganizationUnitId || t.folderId,
      folderKey: FOLDER_KEY,
      title: t.Title || t.title,
      priority: t.Priority || t.priority,
      status: t.Status || t.status,
      assignedToUser: t.AssignedToUser?.EmailAddress || t.assignedToUser?.emailAddress || null,
      caseInstanceId: t.CaseInstanceId || (t.TaskSource?.SourceId) || (t.taskSource?.sourceId) || null,
      createdAt: t.CreationTime || t.createdTime,
      data: t.Data || t.data || {}
    }));
  } catch (err) {
    console.error('getTaskHistory failed:', err);
    return [];
  }
}

export interface TradeOverview {
  routes: string[];
  ofac: Record<string, number>;
  isf: Record<string, number>;
  activeInstances: number;
  completedInstances: number;
  sampledInstances: number;
  error?: string;
}

export async function getTradeOverview(): Promise<TradeOverview> {
  const emptyOverview = { routes: [], ofac: {}, isf: {}, activeInstances: 0, completedInstances: 0, sampledInstances: 0 };
  try {
    const entityId = import.meta.env.VITE_ENTITY_CASE;
    if (!entityId || entityId.startsWith('importcaserecord')) return emptyOverview;
    
    // @ts-ignore
    const result = await entitiesSvc.getAllRecords(entityId, { pageSize: 1000 });
    const records = result.items || [];
    const active = records.filter((r: any) => r.CaseState === 'ACTIVE').length;
    const completed = records.filter((r: any) => r.CaseState === 'CLOSED').length;
    return {
      routes: ['Dubai / Jebel Ali   Port of Newark'],
      ofac: { 'Clear': records.filter((r: any) => r.OfacResult === 'Clear').length },
      isf: { 'Matched': records.filter((r: any) => r.IsfStatus === 'Matched').length },
      activeInstances: active,
      completedInstances: completed,
      sampledInstances: records.length
    };
  } catch (error) {
    console.error('getTradeOverview query failed:', error);
    return emptyOverview;
  }
}

export async function getDocuments(caseInstanceId: string): Promise<ShipmentDoc[]> {
  try {
    const entityId = import.meta.env.VITE_ENTITY_DOC;
    if (!entityId || entityId.startsWith('shipmentdocument')) return [];
    
    // @ts-ignore
    const result = await entitiesSvc.getAllRecords(entityId, { pageSize: 1000 });
    const records = (result.items || []).filter((r: any) => r.CaseRef === caseInstanceId);
    
    return records.map((r: any) => ({
      id: r.Id,
      caseRef: r.CaseRef,
      fileName: r.FileName || 'Document',
      documentType: r.DocumentType || 'Other',
      uploadedAt: r.UploadedAt || r.CreatedTime || new Date().toISOString(),
      uploadedBy: r.UploadedBy || 'system',
      idpConfidence: r.IdpConfidence || 95,
      retentionDaysLeft: r.RetentionDaysLeft || 2555,
      fileSize: r.FileSize || '500 KB',
      extractionData: r.ExtractionData ? JSON.parse(r.ExtractionData) : {}
    }));
  } catch (error) {
    console.error(`getDocuments failed for ${caseInstanceId}:`, error);
    return [];
  }
}

export async function uploadDocument(caseInstanceId: string, docType: string, file: File, uploader: string): Promise<ShipmentDoc> {
  const entityId = import.meta.env.VITE_ENTITY_DOC;
  if (!entityId || entityId.startsWith('shipmentdocument')) throw new Error('Data Fabric Document Entity not configured');
  
  const sizeStr = `${(file.size / 1024).toFixed(0)} KB`;
  const defaultExtraction = {
    poNumber: 'PO-' + Math.floor(100000 + Math.random() * 900000),
    supplierName: uploader.includes('shipper') ? 'Dubai Tech Manufacturing' : 'JAFZA Logistics',
    netWeight: '22,400 kg',
    htsCode: '8542.31.00'
  };

  // @ts-ignore
  const insertedResult = await entitiesSvc.insertRecordsById(entityId, [{
    CaseRef: caseInstanceId,
    FileName: file.name,
    DocumentType: docType,
    UploadedAt: new Date().toISOString(),
    UploadedBy: uploader,
    IdpConfidence: Math.floor(90 + Math.random() * 10),
    RetentionDaysLeft: 2555,
    FileSize: sizeStr,
    ExtractionData: JSON.stringify(defaultExtraction)
  }]);
  
  const inserted = (insertedResult as any).value?.[0] || (insertedResult as any).items?.[0] || (insertedResult as any)?.[0] || {};
  
  return {
    id: inserted.Id || inserted.id || Math.random().toString(),
    caseRef: caseInstanceId,
    fileName: file.name,
    documentType: docType,
    uploadedAt: inserted.UploadedAt || new Date().toISOString(),
    uploadedBy: uploader,
    idpConfidence: inserted.IdpConfidence || 95,
    retentionDaysLeft: inserted.RetentionDaysLeft || 2555,
    fileSize: sizeStr,
    extractionData: defaultExtraction
  };
}

export async function deleteDocument(docId: string): Promise<void> {
  const entityId = import.meta.env.VITE_ENTITY_DOC;
  if (!entityId || entityId.startsWith('shipmentdocument')) throw new Error('Data Fabric Document Entity not configured');
  // @ts-ignore
  await entitiesSvc.deleteRecordsById(entityId, [docId]);
}

export async function getDocumentDownloadUrl(fileName: string): Promise<string> {
  try {
    const SHARED_FOLDER_KEY = '749d9c00-5419-451e-a4b7-af62d7438f3a';
    // @ts-ignore
    const bucket = await bucketsSvc.getByName('TradeFlow', { folderKey: SHARED_FOLDER_KEY });
    const bucketId = bucket.id;
    // @ts-ignore
    const res = await bucketsSvc.getReadUri(bucketId, fileName, { folderKey: SHARED_FOLDER_KEY });
    return res.uri;
  } catch (err) {
    console.error('Failed to get read URI for document:', fileName, err);
    throw err;
  }
}
