import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, MapPin, Building, DollarSign, ShieldAlert, RefreshCw } from 'lucide-react';
import { getCaseDetails, getTaskDetails, assignTask, unassignTask, completeTask } from '../services/casesService';
import type { CaseDetailsResponse, TaskDetailsResponse } from '../types/cases';
import StageTracker from './StageTracker';
import HumanTasks from './HumanTasks';
import { useAuth } from '../context/AuthContext';

interface CaseDetailsProps {
  caseInstanceId: string;
  folderKey: string;
  onBack: () => void;
}

export default function CaseDetails({ caseInstanceId, folderKey, onBack }: CaseDetailsProps) {
  const { activeRole } = useAuth();
  const [details, setDetails] = useState<CaseDetailsResponse | null>(null);
  const [taskDetails, setTaskDetails] = useState<TaskDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [unclaiming, setUnclaiming] = useState(false);
  const [completing, setCompleting] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [detailsData, taskData] = await Promise.all([
        getCaseDetails(caseInstanceId, folderKey),
        getTaskDetails(caseInstanceId, folderKey).catch(() => null),
      ]);
      setDetails(detailsData);
      setTaskDetails(taskData);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load case details from backend proxy.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [caseInstanceId, folderKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClaim = async () => {
    if (!taskDetails || !taskDetails.taskId || !taskDetails.folderId) return;
    setClaiming(true);
    try {
      await assignTask(taskDetails.taskId, taskDetails.folderId);
      // Fast local update
      if (taskDetails.task) {
        setTaskDetails({
          ...taskDetails,
          task: {
            ...taskDetails.task,
            assignedToUser: taskDetails.currentUserEmail,
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

  const variables = details?.variables || {};
  const instance = details?.instance;

  const caseData = {
    id: instance?.externalId || instance?.instanceId?.substring(0, 8) || 'Unknown',
    shipmentRef: variables.shipmentReference || 'Pending',
    supplierName: variables.supplierNameUAE || '-',
    importer: variables.importerOfRecord || '-',
    portOfLoading: variables.portOfLoading || 'Dubai / Jebel Ali',
    portOfEntry: variables.portOfEntryUSA || '-',
    htsCode: variables.htsCode || '-',
    shipmentValue: variables.shipmentValueUSD ? Number(variables.shipmentValueUSD) : 0,
    entryType: variables.entryType || '-',
    isfStatus: variables.isfFilingStatus || 'Pending',
    ofacStatus: variables.ofacScreeningResult || 'Pending',
    cbpStatus: variables.cbpReleaseStatus || 'Pending',
    overallStatus: variables.caseStatus || instance?.latestRunStatus || 'Active',
    stages: details?.stages || [],
  };

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
    </div>
  );
}
