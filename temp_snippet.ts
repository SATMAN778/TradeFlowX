import { UiPath } from '@uipath/uipath-typescript/core';
import { MaestroProcesses, ProcessInstances } from '@uipath/uipath-typescript/maestro-processes';
import { Cases, CaseInstances } from '@uipath/uipath-typescript/cases';
import { Tasks, TaskType } from '@uipath/uipath-typescript/tasks';
import { Processes } from '@uipath/uipath-typescript/processes';
import { Buckets } from '@uipath/uipath-typescript/buckets';
import { Entities } from '@uipath/uipath-typescript/entities';

// Initialize SDK
const sdk = new UiPath({ /* config */ });

// Create service instances
const maestroProcesses = new MaestroProcesses(sdk);
const processInstances = new ProcessInstances(sdk);
const cases = new Cases(sdk);
const caseInstances = new CaseInstances(sdk);
const tasks = new Tasks(sdk);
const processes = new Processes(sdk);
const buckets = new Buckets(sdk);
const entities = new Entities(sdk);

// Maestro - Get processes and their instances
const allProcesses = await maestroProcesses.getAll();
const instances = await processInstances.getAll({
  processKey: 'my-process',
  pageSize: 10
});

// Control Process Instances
await processInstances.pause('instance-id', 'folder-key');
await processInstances.resume('instance-id', 'folder-key');
await processInstances.cancel('instance-id', 'folder-key', {
  comment: 'Cancelled due to error'
});

// Maestro Case Instances
const caseInstance = await caseInstances.getById('instance-id', 'folder-key');
const stages = await caseInstances.getStages('instance-id', 'folder-key');

// Control Case Instances
await caseInstances.close('instance-id', 'folder-key', {
  comment: 'Case resolved successfully'
});

// Orchestrator Processes - Start a process
const result = await processes.start({
  processKey: 'MyProcess_Key',
}, 123);

// Tasks - Create, assign, and complete
const task = await tasks.create({
  title: 'Review Invoice',
  priority: 'High'
}, 123);

await tasks.assign({
  taskId: task.id,
  userNameOrEmail: 'user@company.com'
}, 123);

await tasks.complete(TaskType.App, {
  taskId: task.id,
  data: {},
  action: 'submit'
}, 123);

// Buckets - File operations
const bucket = await buckets.getById(1, 123);
const fileMetadata = await buckets.getFileMetaData(1, 123, {
  prefix: '/invoices/'
});

// Upload file
await buckets.uploadFile({
  bucketId: 1,
  folderId: 123,
  prefix: '/folder1'
});

// Get download URL
const downloadUrl = await buckets.getReadUri({
  bucketId: 1,
  folderId: 123,
  path: '/folder/file.pdf'
});

// Data Fabric Entities - CRUD operations
const entity = await entities.getById('entity-uuid');
const records = await entities.getAllRecords('entity-uuid', {
  pageSize: 100,
  expansionLevel: 1
});

// Insert records
await entities.insertRecordsById('entity-uuid', [
  { name: 'John Doe', email: 'john@company.com', status: 'Active' },
  { name: 'Jane Smith', email: 'jane@company.com', status: 'Active' }
]);

// Update records
await entities.updateRecordsById('entity-uuid', [
  { Id: 'record-id-1', status: 'Inactive' }
]);

// Delete records
await entities.deleteRecordsById('entity-uuid', ['record-id-1', 'record-id-2']);
