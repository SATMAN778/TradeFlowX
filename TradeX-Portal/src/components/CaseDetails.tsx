import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, MapPin, Building, DollarSign, ShieldAlert, RefreshCw } from 'lucide-react';
import { getCaseDetails, getTaskDetails, assignTask, unassignTask, completeTask, getDocuments } from '../services/casesService';
import type { CaseDetailsResponse, TaskDetailsResponse, ShipmentDoc, Stage } from '../types/cases';
import StageTracker from './StageTracker';
import HumanTasks from './HumanTasks';
import S3DocumentViewer from './S3DocumentViewer';
import DocumentLifecycle from './DocumentLifecycle';
import { useAuth } from '../context/AuthContext';
import { dfHelper } from '../lib/sdk';
import type { ImportCaseRecord } from '../types/entities';

interface CaseDetailsProps {
  caseInstanceId: string;
  folderKey: string;
  onBack: () => void;
}

export default function CaseDetails({ caseInstanceId, folderKey, onBack }: CaseDetailsProps) {
  const { activeRole, userEmail } = useAuth();
  const [details, setDetails] = useState<CaseDetailsResponse | null>(null);
  const [caseRecord, setCaseRecord] = useState<ImportCaseRecord | null>(null);
  const [taskDetails, setTaskDetails] = useState<TaskDetailsResponse | null>(null);
  const [documents, setDocuments] = useState<ShipmentDoc[]>([]);
  const [detailTab, setDetailTab] = useState<'info' | 'docs'>('info');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [unclaiming, setUnclaiming] = useState(false);
  const [completing, setCompleting] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [detailsData, taskData, docsData] = await Promise.all([
        getCaseDetails(caseInstanceId, folderKey),
        getTaskDetails(caseInstanceId, folderKey).catch(() => null),
        getDocuments(caseInstanceId).catch(() => []),
      ]);
      setDetails(detailsData);
      if (taskData) {
        taskData.currentUserEmail = userEmail;
      }
      setTaskDetails(taskData);
      setDocuments(docsData);

      // Fetch case record from Data Fabric using the case reference
      let caseRecordData = null;
      const entityId = import.meta.env.VITE_ENTITY_CASE;
      if (entityId && !entityId.startsWith('import') && !entityId.includes('mock-')) {
        try {
          const res = await dfHelper.query(entityId, `CaseRef eq '${caseInstanceId}'`);
          const items = Array.isArray(res) ? res : (res as any).items || (res as any).value || [];
          if (items.length > 0) {
            caseRecordData = items[0];
          } else {
            const extId = detailsData?.instance?.externalId || (detailsData as any)?.externalId;
            if (extId) {
              const res2 = await dfHelper.query(entityId, `CaseRef eq '${extId}'`);
              const items2 = Array.isArray(res2) ? res2 : (res2 as any).items || (res2 as any).value || [];
              if (items2.length > 0) {
                caseRecordData = items2[0];
              }
            }
          }
        } catch (err) {
          console.error('Failed to fetch case record from Data Fabric:', err);
        }
      }
      setCaseRecord(caseRecordData);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load case details from backend proxy.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [caseInstanceId, folderKey, userEmail]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClaim = async () => {
    if (!taskDetails || !taskDetails.taskId || !taskDetails.folderId) return;
    setClaiming(true);
    try {
      await assignTask(taskDetails.taskId, taskDetails.folderId, userEmail || undefined);
      // Fast local update
      if (taskDetails.task) {
        setTaskDetails({
          ...taskDetails,
          task: {
            ...taskDetails.task,
            assignedToUser: userEmail || 'operator@tradeflow.ai',
          },
        });
      }
    } catch (err: any) {
      console.error(err);
      alert('Failed to claim task: ' + err.message);
    } finally {
      setClaiming(false);
    }
  };

  const handleUnassign = async () => {
    if (!taskDetails || !taskDetails.taskId || !taskDetails.folderId) return;
    setUnclaiming(true);
    try {
      await unassignTask(taskDetails.taskId, taskDetails.folderId);
      // Fast local update
      if (taskDetails.task) {
        setTaskDetails({
          ...taskDetails,
          task: {
            ...taskDetails.task,
            assignedToUser: null,
          },
        });
      }
    } catch (err: any) {
      console.error(err);
      alert('Failed to release/unassign task: ' + err.message);
    } finally {
      setUnclaiming(false);
    }
  };

  const handleComplete = async (action: 'Approve' | 'Reject', formData: Record<string, string>) => {
    if (!taskDetails || !taskDetails.taskId || !taskDetails.folderId) return;
    setCompleting(true);
    try {
      await completeTask(taskDetails.taskId, taskDetails.folderId, formData, action);
      // Wait 1.5 seconds for Orchestrator to update, then silent refresh
      setTimeout(() => {
        loadData(true);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      alert('Failed to complete task: ' + err.message);
    } finally {
      setCompleting(false);
    }
  };

  if (loading && !details) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', gap: '12px' }}>
        <RefreshCw size={24} className="animate-spin text-gradient" />
        <span className="text-secondary">Loading case details...</span>
      </div>
    );
  }

  if (error && !details) {
    return (
      <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
        <h3 className="text-gradient" style={{ color: 'var(--danger)', marginBottom: '12px' }}>Error</h3>
        <p className="text-secondary" style={{ marginBottom: '16px' }}>{error}</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={onBack}><ArrowLeft size={16} /> Go Back</button>
          <button className="btn btn-primary" onClick={() => loadData()}>Try Again</button>
        </div>
      </div>
    );
  }

  const detailsAny = details as any;
  const variables = detailsAny?.variables || {};
  const instance = detailsAny?.instance || detailsAny;

  // Helper to extract a variable value safely from various possible formats
  const getVar = (name: string) => {
    // 1. Check in details.variables
    if (detailsAny?.variables && detailsAny.variables[name] !== undefined) {
      return detailsAny.variables[name];
    }
    // 2. Check in details.inputOutputs
    if (Array.isArray(detailsAny?.inputOutputs)) {
      const found = detailsAny.inputOutputs.find((v: any) => v.name === name || v.id === name);
      if (found && found.value !== undefined) return found.value;
    }
    // 3. Check directly in details
    if (detailsAny && detailsAny[name] !== undefined) {
      return detailsAny[name];
    }
    // 4. Fall back to caseRecord properties
    if (caseRecord) {
      if (name === 'poNumber' || name === 'shipmentReference') return caseRecord.PoNumber || caseRecord.CaseRef;
      if (name === 'supplierName' || name === 'supplierNameUAE') return caseRecord.SupplierName;
      if (name === 'importerOfRecord' || name === 'importer') return caseRecord.ImporterName;
      if (name === 'portOfEntry' || name === 'portOfEntryUSA') return caseRecord.PortOfEntry;
      if (name === 'htsCode') return caseRecord.HtsCode;
      if (name === 'totalValueUsd' || name === 'shipmentValueUSD') return caseRecord.TotalValueUsd;
      if (name === 'dutyAmountUsd') return caseRecord.DutyAmountUsd;
      if (name === 'cbpStatus' || name === 'cbpReleaseStatus') return caseRecord.CbpStatus;
      if (name === 'caseState' || name === 'caseStatus') return caseRecord.CaseState;
    }
    return undefined;
  };

  const caseData = {
    id: caseRecord?.CaseRef || instance?.externalId || instance?.instanceId?.substring(0, 8) || caseInstanceId?.substring(0, 8) || 'Unknown',
    shipmentRef: getVar('poNumber') || getVar('shipmentReference') || 'Pending',
    supplierName: getVar('supplierName') || getVar('supplierNameUAE') || '-',
    importer: getVar('importer') || getVar('importerOfRecord') || '-',
    portOfLoading: getVar('portOfLoading') || 'Dubai / Jebel Ali',
    portOfEntry: getVar('portOfEntry') || getVar('portOfEntryUSA') || '-',
    htsCode: getVar('htsCode') || '-',
    shipmentValue: Number(getVar('totalValueUsd') || getVar('shipmentValueUSD') || 0),
    entryType: getVar('entryType') || '-',
    isfStatus: getVar('isfStatus') || getVar('isfFilingStatus') || 'Pending',
    ofacStatus: getVar('ofacClearStatus') || getVar('ofacScreeningResult') || 'Pending',
    cbpStatus: getVar('cbpStatus') || getVar('cbpReleaseStatus') || 'Pending',
    overallStatus: caseRecord?.CaseState || getVar('caseState') || getVar('caseStatus') || instance?.latestRunStatus || 'Active',
    stages: [] as Stage[],
  };

  if (caseData.entryType === '-' || !caseData.entryType) {
    const val = caseData.shipmentValue;
    if (val > 0) {
      if (val < 800) caseData.entryType = 'Type 86 (De Minimis)';
      else if (val <= 2500) caseData.entryType = 'Type 11 (Informal)';
      else caseData.entryType = 'Type 01 (Formal)';
    }
  }

  // Generate 7-stage pipeline statuses based on caseRecord.CurrentStage
  const stageDefs = [
    { id: 'S1', title: 'Stage 1: Order Intake', description: 'Intake trade details and verify shipper/consignee.' },
    { id: 'S2', title: 'Stage 2: ISF Filing', description: 'Submit Importer Security Filing to CBP.' },
    { id: 'S3', title: 'Stage 3: HTS Classification & Duty', description: 'Determine HTSUS codes and calculate duty fees.' },
    { id: 'S4', title: 'Stage 4: PGA Screening', description: 'Partner Government Agencies screening (conditional).' },
    { id: 'S5', title: 'Stage 5: OFAC & Denied Party Screening', description: 'Screen against OFAC SDN and sanction lists.' },
    { id: 'S6', title: 'Stage 6: CBP Entry Filing', description: 'Submit entry summary to Customs and Border Protection.' },
    { id: 'S7', title: 'Stage 7: Document Lifecycle & Post-Entry', description: 'Post-release reconciliation and document retention archiving.' }
  ];

  const currentStage = caseRecord?.CurrentStage || getVar('currentStage') || 'S1';
  const stageOrder = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'];
  const currentIdx = stageOrder.indexOf(currentStage);

  caseData.stages = stageDefs.map((def, i) => {
    let status: 'completed' | 'in_progress' | 'pending' | 'error' = 'pending';
    if (i < currentIdx) {
      status = 'completed';
    } else if (def.id === currentStage) {
      const isError = caseRecord?.CaseState?.toLowerCase() === 'faulted' || caseData.overallStatus?.toLowerCase() === 'faulted';
      status = isError ? 'error' : 'in_progress';
    } else {
      status = 'pending';
    }
    return {
      id: def.id,
      title: def.title,
      description: def.description,
      status
    };
  });

  // Helper function to color code badges
  const getBadgeClass = (val: string) => {
    const v = val.toLowerCase();
    if (v === 'matched' || v === 'clear' || v === 'released' || v === 'active') return 'status-success';
    if (v === 'hold' || v === 'exam' || v === 'pending') return 'status-warning';
    if (v === 'block' || v === 'seizure' || v === 'do not load') return 'status-danger';
    return 'status-neutral';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <button className="btn btn-secondary" onClick={onBack} style={{ padding: '6px 12px' }}>
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <button className="btn btn-secondary" onClick={() => loadData(true)} style={{ padding: '6px 12px' }}>
            <RefreshCw size={14} /> Refresh Details
          </button>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Title */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 className="text-gradient" style={{ fontSize: '2rem' }}>{caseData.id}</h1>
              <span className={`status-badge ${getBadgeClass(caseData.overallStatus)}`}>
                {caseData.overallStatus}
              </span>
            </div>
            <p className="text-secondary" style={{ marginTop: '8px', fontSize: '1.1rem' }}>Ref: {caseData.shipmentRef}</p>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <span className={`status-badge ${getBadgeClass(caseData.isfStatus)}`}>ISF: {caseData.isfStatus}</span>
            <span className={`status-badge ${getBadgeClass(caseData.ofacStatus)}`}>OFAC: {caseData.ofacStatus}</span>
            <span className={`status-badge ${getBadgeClass(caseData.cbpStatus)}`}>CBP: {caseData.cbpStatus}</span>
          </div>
        </div>
      </div>

      {/* Sleek Tab Bar for file Cycle checklist integration */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '2px', marginBottom: '8px' }}>
        <button 
          onClick={() => setDetailTab('info')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: detailTab === 'info' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: detailTab === 'info' ? 'var(--text-primary)' : 'var(--text-secondary)',
            padding: '8px 16px 12px',
            fontWeight: detailTab === 'info' ? 600 : 500,
            fontSize: '0.92rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {taskDetails?.task ? 'Active Human Task Review' : 'Shipment Overview & Stages'}
        </button>
        <button 
          onClick={() => setDetailTab('docs')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: detailTab === 'docs' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: detailTab === 'docs' ? 'var(--text-primary)' : 'var(--text-secondary)',
            padding: '8px 16px 12px',
            fontWeight: detailTab === 'docs' ? 600 : 500,
            fontSize: '0.92rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          File Cycle Checklists ({documents.filter(d => ['Commercial Invoice', 'Packing List', 'Bill of Lading', 'Certificate of Origin', 'Arrival Notice', 'CBP Form 3461', 'CBP Form 7501', 'PGA Permit', 'Delivery Order'].includes(d.documentType)).length}/9)
        </button>
      </div>

      {detailTab === 'docs' ? (
        <DocumentLifecycle 
          caseInstanceId={caseInstanceId}
          documents={documents}
          onRefresh={() => loadData(true)}
        />
      ) : taskDetails?.task ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', minHeight: 'calc(100vh - 280px)' }}>
          {/* Left Side: S3 Document Viewer */}
          <div style={{ height: '100%', minHeight: '600px' }}>
            <S3DocumentViewer task={taskDetails.task} />
          </div>

          {/* Right Side: Human Tasks Form */}
          <div>
            <HumanTasks 
              taskDetails={taskDetails}
              onClaim={handleClaim}
              onUnassign={handleUnassign}
              onComplete={handleComplete}
              claiming={claiming}
              unclaiming={unclaiming}
              completing={completing}
              activeRole={activeRole}
            />
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          {/* Main Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Key Info Grid */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ marginBottom: '20px' }}>Shipment Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <Building size={20} className="text-secondary" style={{ marginTop: '2px' }} />
                  <div>
                    <p className="text-secondary" style={{ fontSize: '0.8rem' }}>Supplier (UAE)</p>
                    <p style={{ fontWeight: 500 }}>{caseData.supplierName}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <Building size={20} className="text-secondary" style={{ marginTop: '2px' }} />
                  <div>
                    <p className="text-secondary" style={{ fontSize: '0.8rem' }}>Importer of Record</p>
                    <p style={{ fontWeight: 500 }}>{caseData.importer}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <MapPin size={20} className="text-secondary" style={{ marginTop: '2px' }} />
                  <div>
                    <p className="text-secondary" style={{ fontSize: '0.8rem' }}>Route</p>
                    <p style={{ fontWeight: 500 }}>{caseData.portOfLoading} → {caseData.portOfEntry}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <DollarSign size={20} className="text-secondary" style={{ marginTop: '2px' }} />
                  <div>
                    <p className="text-secondary" style={{ fontSize: '0.8rem' }}>Value (USD)</p>
                    <p style={{ fontWeight: 500 }}>${caseData.shipmentValue.toLocaleString()}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <ShieldAlert size={20} className="text-secondary" style={{ marginTop: '2px' }} />
                  <div>
                    <p className="text-secondary" style={{ fontSize: '0.8rem' }}>HTS Code</p>
                    <p style={{ fontWeight: 500 }}>{caseData.htsCode}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <ShieldAlert size={20} className="text-secondary" style={{ marginTop: '2px' }} />
                  <div>
                    <p className="text-secondary" style={{ fontSize: '0.8rem' }}>Entry Type</p>
                    <p style={{ fontWeight: 500 }}>{caseData.entryType}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Workflow Stages */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ marginBottom: '20px' }}>Maestro Workflow Stages</h3>
              <StageTracker stages={caseData.stages} />
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <HumanTasks 
              taskDetails={taskDetails}
              onClaim={handleClaim}
              onUnassign={handleUnassign}
              onComplete={handleComplete}
              claiming={claiming}
              unclaiming={unclaiming}
              completing={completing}
              activeRole={activeRole}
            />
          </div>
        </div>
      )}
    </div>
  );
}
