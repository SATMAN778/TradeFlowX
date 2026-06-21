export type StageStatus = 'pending' | 'in_progress' | 'completed' | 'error';

export interface Stage {
  id: number;
  title: string;
  status: StageStatus;
  description: string;
}

export interface HumanTask {
  id: string;
  title: string;
  assignee: string;
  stage: number;
  slaHours: number;
  status: 'open' | 'in_progress' | 'resolved';
}

export interface CaseData {
  id: string;
  shipmentRef: string;
  supplierName: string;
  importer: string;
  originDeclared: string;
  originVerified: string;
  portOfLoading: string;
  portOfEntry: string;
  htsCode: string;
  shipmentValue: number;
  entryType: string;
  isfStatus: 'Matched' | 'No Match' | 'Do Not Load' | 'Pending';
  ofacStatus: 'Clear' | 'Hold' | 'Block' | 'Pending';
  cbpStatus: 'Released' | 'Exam' | 'Hold' | 'Seizure' | 'Pending';
  overallStatus: 'Active' | 'Closed' | 'Blocked';
  assignedBroker: string;
  erpPoNumber: string;
  stages: Stage[];
  tasks: HumanTask[];
}
