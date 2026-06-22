import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle, User, Clock, RefreshCw, Inbox,
  AlertTriangle, ExternalLink, ChevronDown, ChevronUp, Check, X, ShieldAlert
} from 'lucide-react';
import type { MyTask } from '../types/cases';
import { getMyTasks, assignTask, unassignTask, completeTask } from '../services/casesService';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/auth';
import S3DocumentViewer from './S3DocumentViewer';

function formatLabel(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

// ─── Role Mapping Helpers ───────────────────────────────────────────────────

export function getRequiredRolesForTask(title: string): UserRole[] {
  const t = title.toLowerCase();
  
  if (t.includes('ofac') || t.includes('sanctions') || t.includes('dpl') || t.includes('screening') || t.includes('fuzzy')) {
    return ['manager'];
  }
  
  if (t.includes('hts') || t.includes('classification') || t.includes('tariff') || t.includes('cross') || t.includes('cf-28') || t.includes('cf-29')) {
    return ['reviewer_customs'];
  }

  if (t.includes('pga') || t.includes('fda') || t.includes('epa') || t.includes('fcc') || t.includes('usda') || t.includes('prior notice')) {
    return ['reviewer_customs'];
  }

  if (t.includes('isf')) {
    if (t.includes('container') || t.includes('carrier') || t.includes('stuffing') || t.includes('consolidator')) {
      return ['reviewer_freight_forwarder', 'reviewer_customs'];
    }
    return ['reviewer_customs'];
  }
  
  if (t.includes('cbp exam') || t.includes('examination') || t.includes('port agent') || t.includes('exam selected')) {
    return ['reviewer_freight_forwarder'];
  }
  
  if (t.includes('po ') || t.includes('purchase order') || t.includes('transshipment') || t.includes('coo') || t.includes('country of origin') || t.includes('shipper')) {
    return ['reviewer_shipper'];
  }
  
  if (t.includes('variance') || t.includes('drawback') || t.includes('savings')) {
    return ['manager'];
  }

  if (t.includes('document discrepancy') || t.includes('discrepancy')) {
    return ['reviewer_shipper', 'reviewer_freight_forwarder'];
  }

  return ['admin'];
}

export function getRoleBadge(roles: UserRole[]) {
  if (roles.includes('admin') && roles.length === 1) {
    return { label: 'Admin Override', bg: 'rgba(71, 85, 105, 0.08)', text: '#475569', color: 'status-neutral' };
  }
  
  const mainRole = roles[0];
  switch (mainRole) {
    case 'manager':
      return { label: 'Compliance Manager', bg: 'rgba(194, 65, 12, 0.1)', text: '#c2410c', color: 'status-danger' };
    case 'reviewer_customs':
      return { label: 'Customs Specialist', bg: 'rgba(3, 105, 161, 0.1)', text: '#0369a1', color: 'status-info' };
    case 'reviewer_freight_forwarder':
      return { label: 'Freight Forwarder', bg: 'rgba(13, 148, 136, 0.1)', text: '#0d9488', color: 'status-success' };
    case 'reviewer_shipper':
      return { label: 'Shipper Operations', bg: 'rgba(79, 70, 229, 0.1)', text: '#4f46e5', color: 'status-warning' };
    default:
      return { label: 'System Admin', bg: 'rgba(100, 116, 139, 0.1)', text: '#475569', color: 'status-neutral' };
  }
}

// ─── Demo / Blueprint Tasks ─────────────────────────────────────────────────

const getDemoTasks = (currentUserEmail: string | null): MyTask[] => [
  {
    taskId: "demo-ht-01",
    folderId: 1,
    folderKey: "dubai-usa-import",
    title: "HT-01: Complete missing PO fields (expectedShipDate)",
    priority: "Medium",
    status: "Pending",
    assignedToUser: null,
    caseInstanceId: "TF-88201",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    data: {
      poNumber: "PO-991204",
      supplierName: "Al-Ghurair Industrial LLC (Dubai)",
      goodsDescription: "Industrial aluminum sheets & coils",
      missingFields: "expectedShipDate, portOfLoading",
      incoterms: "CIF Newark"
    },
    currentUserEmail: currentUserEmail || "operator@tradeflow.ai"
  },
  {
    taskId: "demo-ht-02",
    folderId: 1,
    folderKey: "dubai-usa-import",
    title: "HT-02: Transshipment flag raised — verify true COO",
    priority: "High",
    status: "Pending",
    assignedToUser: null,
    caseInstanceId: "TF-88201",
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    data: {
      supplierAddress: "Plot S30219, JAFZA Free Zone, Dubai, UAE",
      declaredCountryOfOrigin: "UAE",
      flagReason: "Supplier address is inside a Free Zone. High risk of transshipment from third countries.",
      suggestedTransformationCheck: "Verify substantial transformation in UAE (Form A or local chamber certificate).",
    },
    currentUserEmail: currentUserEmail || "operator@tradeflow.ai"
  },
  {
    taskId: "demo-ht-06",
    folderId: 1,
    folderKey: "dubai-usa-import",
    title: "HT-06: Review and confirm HTS classification (Confidence: 78%)",
    priority: "Medium",
    status: "Pending",
    assignedToUser: null,
    caseInstanceId: "TF-88204",
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    data: {
      productDescription: "Anodized aluminum alloy plates, grade 6061-T6, thickness 5mm",
      declaredHtsCode: "7606.12.3030",
      aiSuggestedCode: "7606.12.3045",
      confidenceScore: "78%",
      usitcRulingCitation: "CBP NY Cross Ruling N302481"
    },
    currentUserEmail: currentUserEmail || "operator@tradeflow.ai"
  },
  {
    taskId: "demo-ht-11",
    folderId: 1,
    folderKey: "dubai-usa-import",
    title: "HT-11: OFAC screening potential fuzzy match (Similarity: 87%)",
    priority: "High",
    status: "Pending",
    assignedToUser: null,
    caseInstanceId: "TF-88206",
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    data: {
      screenedPartyName: "Al-Ghurair Logistics FZE",
      matchingSanctionsRecord: "AL GHURAIR ENTERPRISES (OFAC SDN List, Iraq/Syria programs)",
      similarityScore: "87%",
      screeningSource: "OFAC SDN API / amber-road-dpl",
      actionRequired: "Review match details. Decide whether to CLEAR party or HOLD case for legal review."
    },
    currentUserEmail: currentUserEmail || "operator@tradeflow.ai"
  },
  {
    taskId: "demo-ht-13",
    folderId: 1,
    folderKey: "dubai-usa-import",
    title: "HT-13: CBP exam selected — coordinate with Newark port agent",
    priority: "Critical",
    status: "Pending",
    assignedToUser: null,
    caseInstanceId: "TF-88208",
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    data: {
      containerNumber: "MSKU8842109",
      vesselName: "Maersk Horizon",
      voyageNumber: "V-2604N",
      portOfEntry: "Port of Newark, NJ (Entry Port Code: 1001)",
      examinationType: "CBP Non-Intrusive Inspection (NII / X-Ray)",
      brokerContact: "J. F. Hillebrand Brokers"
    },
    currentUserEmail: currentUserEmail || "operator@tradeflow.ai"
  },
  {
    taskId: "demo-ht-16",
    folderId: 1,
    folderKey: "dubai-usa-import",
    title: "HT-16: Document discrepancy review (CI vs. Packing List weights)",
    priority: "Medium",
    status: "Pending",
    assignedToUser: null,
    caseInstanceId: "TF-88210",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    data: {
      commercialInvoiceNetWeight: "22,400 kg",
      packingListNetWeight: "22,850 kg",
      variance: "+450 kg (2.0%)",
      reconciliationRequired: "Confirm correct net weight from container weight ticket or bill of lading."
    },
    currentUserEmail: currentUserEmail || "operator@tradeflow.ai"
  }
];

type ConfirmAction = 'Approve' | 'Reject' | null;

interface TaskModalProps {
  task: MyTask;
  onClose: () => void;
  onRefresh: (actionType?: 'claim' | 'unclaim' | 'complete', taskId?: string, payload?: any) => void;
}

function TaskWorkstation({ task, onClose, onRefresh }: TaskModalProps) {
  const { activeRole } = useAuth();
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (task.data && typeof task.data === 'object') {
      for (const [k, v] of Object.entries(task.data)) {
        init[k] = typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v ?? '');
      }
    }
    return init;
  });
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [submitting, setSubmitting] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [unclaiming, setUnclaiming] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAssignedToMe =
    task.currentUserEmail &&
    task.assignedToUser &&
    task.assignedToUser.toLowerCase() === task.currentUserEmail.toLowerCase();

  const isUnassigned = !task.assignedToUser;
  
  const requiredRoles = getRequiredRolesForTask(task.title);
  const isRoleAuthorized = activeRole === 'admin' || requiredRoles.includes(activeRole);
  const badgeInfo = getRoleBadge(requiredRoles);

  const handleClaim = async () => {
    setClaiming(true);
    setErrorMsg(null);
    try {
      if (task.taskId.startsWith('demo-')) {
        setSuccessMsg('Task claimed successfully (Demo Sandbox)!');
        setTimeout(() => {
          onRefresh('claim', task.taskId);
          onClose();
        }, 1000);
      } else {
        await assignTask(task.taskId, task.folderId);
        setSuccessMsg('Task claimed successfully! Refreshing...');
        setTimeout(() => {
          onRefresh();
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMsg('Failed to claim task: ' + err.message);
    } finally {
      setClaiming(false);
    }
  };

  const handleUnassign = async () => {
    setUnclaiming(true);
    setErrorMsg(null);
    try {
      if (task.taskId.startsWith('demo-')) {
        setSuccessMsg('Task released successfully (Demo Sandbox)!');
        setTimeout(() => {
          onRefresh('unclaim', task.taskId);
          onClose();
        }, 1000);
      } else {
        await unassignTask(task.taskId, task.folderId);
        setSuccessMsg('Task released successfully! Refreshing...');
        setTimeout(() => {
          onRefresh();
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMsg('Failed to release task: ' + err.message);
    } finally {
      setUnclaiming(false);
    }
  };

  const handleSubmitAction = async () => {
    if (!confirmAction) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      if (task.taskId.startsWith('demo-')) {
        setSuccessMsg(`Task ${confirmAction === 'Approve' ? 'approved' : 'rejected'} successfully (Demo Sandbox)!`);
        setTimeout(() => {
          onRefresh('complete', task.taskId);
          onClose();
        }, 1000);
      } else {
        await completeTask(task.taskId, task.folderId, formValues, confirmAction);
        setSuccessMsg(`Task ${confirmAction === 'Approve' ? 'approved' : 'rejected'} successfully! Refreshing...`);
        setTimeout(() => {
          onRefresh();
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMsg('Failed to submit: ' + err.message);
      setConfirmAction(null);
    } finally {
      setSubmitting(false);
    }
  };

  const dataEntries = Object.entries(formValues);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease' }}>
      {/* Top control bar with Back button */}
      <div className="glass-panel" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-secondary" onClick={onClose} style={{ padding: '6px 12px' }}>
          ← Back to Tasks Inbox
        </button>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Active Workstation &mdash; <strong style={{ color: 'var(--text-primary)' }}>{task.taskId}</strong>
        </span>
      </div>

      <div className="glass-panel" style={{
        display: 'flex',
        flexDirection: 'row',
        padding: 0,
        height: 'calc(100vh - 280px)',
        minHeight: '650px',
        overflow: 'hidden'
      }}>
        {/* Left Side: S3 Document Viewer */}
        <div style={{ width: '60%', height: '100%', borderRight: '1px solid var(--glass-border)' }}>
          <S3DocumentViewer task={task} />
        </div>

        {/* Right Side: Task Form / Actions */}
        <div style={{ width: '40%', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {/* Header */}
          <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {task.title}
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: badgeInfo.bg,
                    color: badgeInfo.text,
                    border: '1px solid rgba(0,0,0,0.05)'
                  }}>
                    {badgeInfo.label}
                  </span>
                  <span className={`status-badge ${
                    (task.priority ?? '').toLowerCase() === 'high' || (task.priority ?? '').toLowerCase() === 'critical'
                      ? 'status-danger'
                      : (task.priority ?? '').toLowerCase() === 'medium'
                      ? 'status-warning'
                      : 'status-info'
                  }`} style={{ fontSize: '0.7rem' }}>
                    {task.priority || 'Medium'}
                  </span>
                  {isUnassigned && (
                    <span className="status-badge status-neutral" style={{ fontSize: '0.7rem' }}>Unassigned</span>
                  )}
                  {isAssignedToMe && (
                    <span className="status-badge status-success" style={{ fontSize: '0.7rem' }}>Assigned to you</span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <User size={13} /> {task.assignedToUser || 'Unassigned'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={13} /> Created: {formatDate(task.createdAt)}
              </span>
              {task.taskId && (
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>ID: {task.taskId}</span>
              )}
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Authorization Check */}
            {!isRoleAuthorized && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '8px', color: '#b91c1c', fontSize: '0.82rem' }}>
                <ShieldAlert size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <strong style={{ display: 'block', marginBottom: '2px' }}>Role Permission Warning</strong>
                  Your active role does not have authorization to modify or complete this task. You must switch to a matching role (e.g., <strong>{badgeInfo.label}</strong>) or log in as an Administrator.
                </div>
              </div>
            )}

            {/* Success / Error */}
            {successMsg && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', color: '#059669', fontSize: '0.875rem' }}>
                <CheckCircle size={16} /> {successMsg}
              </div>
            )}
            {errorMsg && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', color: '#dc2626', fontSize: '0.875rem' }}>
                <AlertTriangle size={16} /> {errorMsg}
              </div>
            )}

            {/* External link */}
            {task.externalLink && (
              <a
                href={task.externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ justifyContent: 'center', fontSize: '0.85rem', gap: '6px' }}
              >
                <ExternalLink size={14} /> Open in Action Center
              </a>
            )}

            {/* Task data fields */}
            {dataEntries.length > 0 && (
              <div>
                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Task Data
                </p>
                <div style={{ border: '1px solid var(--glass-border)', borderRadius: '8px', overflow: 'hidden' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Field</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataEntries.map(([key, val]) => (
                        <tr key={key}>
                          <td style={{ fontWeight: 500, color: 'var(--text-secondary)', width: '40%', whiteSpace: 'nowrap' }}>
                            {formatLabel(key)}
                          </td>
                          <td>
                            {isAssignedToMe && isRoleAuthorized ? (
                              <input
                                type="text"
                                value={val}
                                onChange={(e) => setFormValues((prev) => ({ ...prev, [key]: e.target.value }))}
                                disabled={submitting}
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  border: '1px solid var(--glass-border)',
                                  borderRadius: '4px',
                                  fontSize: '0.875rem',
                                  background: 'var(--bg-primary)',
                                  outline: 'none',
                                }}
                              />
                            ) : (
                              <span style={{ color: val ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                {val || '—'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Confirm step */}
            {confirmAction && (
              <div className="confirm-bar">
                <AlertTriangle size={16} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                <span style={{ flex: 1 }}>
                  Are you sure you want to <strong>{confirmAction}</strong> this task?
                </span>
                <button
                  className="btn btn-secondary"
                  onClick={() => setConfirmAction(null)}
                  disabled={submitting}
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitAction}
                  disabled={submitting}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                    background: confirmAction === 'Approve' ? 'var(--success)' : 'var(--danger)',
                    borderColor: confirmAction === 'Approve' ? 'var(--success)' : 'var(--danger)',
                  }}
                >
                  {submitting ? 'Submitting…' : `Yes, ${confirmAction}`}
                </button>
              </div>
            )}

            {/* Action buttons */}
            {!confirmAction && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', width: '100%' }}>
                {isUnassigned && (
                  <button
                    className="btn btn-primary"
                    onClick={handleClaim}
                    disabled={claiming || !!successMsg || !isRoleAuthorized}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    {claiming ? 'Claiming…' : 'Claim Task'}
                  </button>
                )}
                {isAssignedToMe && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => setConfirmAction('Approve')}
                        disabled={submitting || unclaiming || !!successMsg || !isRoleAuthorized}
                        style={{ flex: 1, justifyContent: 'center', background: 'var(--success)', borderColor: 'var(--success)' }}
                      >
                        <Check size={16} /> Approve
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setConfirmAction('Reject')}
                        disabled={submitting || unclaiming || !!successMsg || !isRoleAuthorized}
                        style={{ flex: 1, justifyContent: 'center', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)' }}
                      >
                        <X size={16} /> Reject
                      </button>
                    </div>
                    <button
                      className="btn btn-secondary"
                      onClick={handleUnassign}
                      disabled={submitting || unclaiming || !!successMsg}
                      style={{ width: '100%', justifyContent: 'center', borderColor: 'rgba(239, 68, 68, 0.3)', fontSize: '0.85rem' }}
                    >
                      {unclaiming ? 'Releasing…' : 'Release / Unclaim Task'}
                    </button>
                  </div>
                )}
                {!isUnassigned && !isAssignedToMe && (
                  <div style={{ flex: 1, padding: '10px', textAlign: 'center', background: 'rgba(0,0,0,0.03)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    This task is claimed by <strong>{task.assignedToUser}</strong> and is read-only.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Task Card ───────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: MyTask;
  onOpen: () => void;
}

function TaskCard({ task, onOpen }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { activeRole } = useAuth();

  const isAssignedToMe =
    task.currentUserEmail &&
    task.assignedToUser &&
    task.assignedToUser.toLowerCase() === task.currentUserEmail.toLowerCase();

  const isUnassigned = !task.assignedToUser;

  const priorityClass =
    (task.priority ?? '').toLowerCase() === 'high' || (task.priority ?? '').toLowerCase() === 'critical'
      ? 'status-danger'
      : (task.priority ?? '').toLowerCase() === 'medium'
      ? 'status-warning'
      : 'status-info';

  const requiredRoles = getRequiredRolesForTask(task.title);
  const isRoleAuthorized = activeRole === 'admin' || requiredRoles.includes(activeRole);
  const badgeInfo = getRoleBadge(requiredRoles);

  return (
    <div className={`task-card ${isUnassigned ? 'task-card-unassigned' : ''}`} style={{ opacity: isRoleAuthorized ? 1 : 0.65 }}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        {/* Icon */}
        <div style={{
          width: 40, height: 40, borderRadius: '8px', flexShrink: 0,
          background: isAssignedToMe
            ? 'rgba(16, 185, 129, 0.1)'
            : isUnassigned
            ? 'rgba(204, 177, 108, 0.12)'
            : 'rgba(41, 69, 134, 0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isAssignedToMe ? 'var(--success)' : isUnassigned ? 'var(--accent-secondary)' : 'var(--accent-primary)',
        }}>
          {isAssignedToMe ? <CheckCircle size={20} /> : isUnassigned ? <AlertTriangle size={20} /> : <User size={20} />}
        </div>

        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{task.title}</span>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '4px',
              background: badgeInfo.bg,
              color: badgeInfo.text,
              border: '1px solid rgba(0,0,0,0.04)'
            }}>
              {badgeInfo.label}
            </span>
            <span className={`status-badge ${priorityClass}`} style={{ fontSize: '0.68rem' }}>{task.priority || 'Medium'}</span>
            {isAssignedToMe && <span className="status-badge status-success" style={{ fontSize: '0.68rem' }}>Yours</span>}
            {isUnassigned && <span className="status-badge status-warning" style={{ fontSize: '0.68rem' }}>Unassigned</span>}
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <User size={12} /> {task.assignedToUser || 'Not assigned'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} /> {formatDate(task.createdAt)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          <button
            className="btn btn-secondary"
            onClick={() => setExpanded((x) => !x)}
            style={{ padding: '5px 10px', fontSize: '0.78rem', gap: '4px' }}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Less' : 'Preview'}
          </button>
          <button
            className="btn btn-primary"
            onClick={onOpen}
            style={{ padding: '5px 14px', fontSize: '0.78rem' }}
          >
            {!isRoleAuthorized ? 'Inspect' : isUnassigned ? 'Claim' : isAssignedToMe ? 'Review' : 'View'}
          </button>
        </div>
      </div>

      {/* Expanded preview */}
      {expanded && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)', animation: 'fadeIn 0.2s ease' }}>
          {Object.keys(task.data ?? {}).length > 0 ? (
            <div style={{ border: '1px solid var(--glass-border)', borderRadius: '6px', overflow: 'hidden' }}>
              <table className="data-table">
                <thead><tr><th>Field</th><th>Value</th></tr></thead>
                <tbody>
                  {Object.entries(task.data).slice(0, 6).map(([k, v]) => (
                    <tr key={k}>
                      <td style={{ fontWeight: 500, color: 'var(--text-secondary)', width: '35%' }}>{formatLabel(k)}</td>
                      <td>{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No task data fields available.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tasks Inbox Page ─────────────────────────────────────────────────────────

interface TasksInboxProps {
  onTaskCountChange?: (count: number) => void;
}

export default function TasksInbox({ onTaskCountChange }: TasksInboxProps) {
  const { activeRole, userEmail } = useAuth();
  
  // Use a local state for tasks to allow interactive claiming/releasing in demo mode
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<MyTask | null>(null);
  const [filter, setFilter] = useState<'all' | 'mine' | 'unassigned'>('all');
  const [demoTasksEnabled, setDemoTasksEnabled] = useState<boolean>(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const realTasks = await getMyTasks();
      
      let combined = [...realTasks];
      if (demoTasksEnabled) {
        // Filter out demo tasks that have been locally modified/removed to preserve sandbox state
        const demoBase = getDemoTasks(userEmail);
        combined = [...combined, ...demoBase];
      }
      
      setTasks(combined);
      onTaskCountChange?.(combined.length);
    } catch (err: any) {
      if (demoTasksEnabled) {
        // If API fails but demo mode is on, fallback to demo tasks
        const demoBase = getDemoTasks(userEmail);
        setTasks(demoBase);
        onTaskCountChange?.(demoBase.length);
      } else {
        if (!silent) setError(err.message || 'Failed to load tasks');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [onTaskCountChange, demoTasksEnabled, userEmail]);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 30000);
    return () => clearInterval(interval);
  }, [load]);

  // Handle local mock operations for demo tasks
  const handleTaskRefresh = (actionType?: 'claim' | 'unclaim' | 'complete', taskId?: string) => {
    if (actionType && taskId) {
      if (actionType === 'claim') {
        setTasks(prev => prev.map(t => t.taskId === taskId ? { ...t, assignedToUser: userEmail } : t));
      } else if (actionType === 'unclaim') {
        setTasks(prev => prev.map(t => t.taskId === taskId ? { ...t, assignedToUser: null } : t));
      } else if (actionType === 'complete') {
        setTasks(prev => prev.filter(t => t.taskId !== taskId));
      }
    } else {
      load();
    }
  };

  // Sync count on tasks change
  useEffect(() => {
    onTaskCountChange?.(tasks.length);
  }, [tasks, onTaskCountChange]);

  const filteredTasks = tasks.filter((t) => {
    // 1. Role Filter: if not admin, only show tasks matching the role
    if (activeRole !== 'admin') {
      const requiredRoles = getRequiredRolesForTask(t.title);
      if (requiredRoles.length > 0 && !requiredRoles.includes('admin') && !requiredRoles.includes(activeRole)) {
        return false;
      }
    }

    // 2. Tab filters
    if (filter === 'mine') {
      return t.assignedToUser && t.currentUserEmail &&
        t.assignedToUser.toLowerCase() === t.currentUserEmail.toLowerCase();
    }
    if (filter === 'unassigned') return !t.assignedToUser;
    return true;
  });

  const myCount = tasks.filter(
    (t) => t.assignedToUser && t.currentUserEmail &&
      t.assignedToUser.toLowerCase() === t.currentUserEmail.toLowerCase()
  ).length;

  const unassignedCount = tasks.filter((t) => !t.assignedToUser).length;

  if (selectedTask) {
    return (
      <TaskWorkstation
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onRefresh={handleTaskRefresh}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Inbox size={26} style={{ color: 'var(--accent-primary)' }} />
            Tasks Inbox
          </h1>
          <p className="text-secondary" style={{ marginTop: '6px', fontSize: '0.9rem' }}>
            Human-in-the-Loop tasks pending your review or action.
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Demo Mode Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(204,177,108,0.06)', border: '1px solid rgba(204,177,108,0.2)', borderRadius: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-secondary)' }}>Blueprint Demo Tasks</span>
            <input 
              type="checkbox"
              checked={demoTasksEnabled}
              onChange={(e) => {
                setDemoTasksEnabled(e.target.checked);
              }}
              style={{ width: '15px', height: '15px', cursor: 'pointer' }}
            />
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => load()}
            disabled={loading}
            style={{ padding: '8px 12px' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {([['all', `All (${tasks.length})`], ['mine', `Assigned to Me (${myCount})`], ['unassigned', `Unassigned (${unassignedCount})`]] as const).map(
          ([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`btn ${filter === key ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '7px 16px', fontSize: '0.85rem' }}
            >
              {label}
            </button>
          )
        )}
      </div>

      {/* Content */}
      {loading && !error && tasks.length === 0 && (
        <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <RefreshCw size={24} className="animate-spin text-gradient" style={{ margin: '0 auto 12px' }} />
          <p className="text-secondary">Loading tasks from Orchestrator…</p>
        </div>
      )}

      {error && tasks.length === 0 && (
        <div className="glass-panel" style={{ padding: '32px 24px', textAlign: 'center' }}>
          <AlertTriangle size={24} style={{ color: 'var(--danger)', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--danger)', marginBottom: '12px' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => load()}>Try Again</button>
        </div>
      )}

      {!loading && !error && filteredTasks.length === 0 && (
        <div className="glass-panel">
          <div className="inbox-empty">
            <div className="inbox-empty-icon">
              <Inbox size={28} />
            </div>
            <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
              {filter === 'all' ? 'No pending tasks for your role' : filter === 'mine' ? 'No tasks assigned to you' : 'No unassigned tasks'}
            </p>
            <p style={{ fontSize: '0.875rem', maxWidth: '360px', textAlign: 'center' }}>
              {filter === 'all'
                ? `All Human-in-the-Loop tasks matching the ${activeRole === 'admin' ? 'System Administrator' : activeRole === 'manager' ? 'Compliance Manager' : activeRole === 'reviewer_customs' ? 'Customs Specialist' : activeRole === 'reviewer_freight_forwarder' ? 'Freight Forwarder' : 'Shipper Operations'} role are completed.`
                : 'Switch to "All" to see available tasks you can claim.'}
            </p>
            {filter !== 'all' && (
              <button className="btn btn-secondary" onClick={() => setFilter('all')} style={{ marginTop: '4px', fontSize: '0.85rem' }}>
                View All Tasks
              </button>
            )}
          </div>
        </div>
      )}

      {filteredTasks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.taskId}
              task={task}
              onOpen={() => setSelectedTask(task)}
            />
          ))}
        </div>
      )}

    </div>
  );
}
