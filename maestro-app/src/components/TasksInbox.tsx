import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle, User, Clock, RefreshCw, Inbox,
  AlertTriangle, ExternalLink, ChevronDown, ChevronUp, Check, X
} from 'lucide-react';
import type { MyTask } from '../types/cases';
import { getMyTasks, assignTask, unassignTask, completeTask } from '../services/casesService';

interface TasksInboxProps {
  onTaskCountChange?: (count: number) => void;
}

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

type ConfirmAction = 'Approve' | 'Reject' | null;

interface TaskModalProps {
  task: MyTask;
  onClose: () => void;
  onRefresh: () => void;
}

function TaskModal({ task, onClose, onRefresh }: TaskModalProps) {
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

  const handleClaim = async () => {
    setClaiming(true);
    setErrorMsg(null);
    try {
      await assignTask(task.taskId, task.folderId);
      setSuccessMsg('Task claimed successfully! Refreshing...');
      setTimeout(() => {
        onRefresh();
        onClose();
      }, 1200);
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
      await unassignTask(task.taskId, task.folderId);
      setSuccessMsg('Task released successfully! Refreshing...');
      setTimeout(() => {
        onRefresh();
        onClose();
      }, 1200);
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
      await completeTask(task.taskId, task.folderId, formValues, confirmAction);
      setSuccessMsg(`Task ${confirmAction === 'Approve' ? 'approved' : 'rejected'} successfully! Refreshing...`);
      setTimeout(() => {
        onRefresh();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg('Failed to submit: ' + err.message);
      setConfirmAction(null);
    } finally {
      setSubmitting(false);
    }
  };

  const dataEntries = Object.entries(formValues);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>{task.title}</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                <span className={`status-badge ${
                  (task.priority ?? '').toLowerCase() === 'high' || (task.priority ?? '').toLowerCase() === 'critical'
                    ? 'status-danger'
                    : (task.priority ?? '').toLowerCase() === 'medium'
                    ? 'status-warning'
                    : 'status-info'
                }`} style={{ fontSize: '0.7rem' }}>
                  {task.priority || 'Medium'}
                </span>
                <span className={`status-badge ${
                  (task.status ?? '').toLowerCase() === 'pending' ? 'status-warning' : 'status-info'
                }`} style={{ fontSize: '0.7rem' }}>
                  {task.status}
                </span>
                {isUnassigned && (
                  <span className="status-badge status-neutral" style={{ fontSize: '0.7rem' }}>Unassigned</span>
                )}
                {isAssignedToMe && (
                  <span className="status-badge status-success" style={{ fontSize: '0.7rem' }}>Assigned to you</span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)', flexShrink: 0 }}
            >
              <X size={20} />
            </button>
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
                          {isAssignedToMe ? (
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
                  disabled={claiming || !!successMsg}
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
                      disabled={submitting || unclaiming || !!successMsg}
                      style={{ flex: 1, justifyContent: 'center', background: 'var(--success)', borderColor: 'var(--success)' }}
                    >
                      <Check size={16} /> Approve
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setConfirmAction('Reject')}
                      disabled={submitting || unclaiming || !!successMsg}
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
  );
}

// ─── Task Card ───────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: MyTask;
  onOpen: () => void;
}

function TaskCard({ task, onOpen }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);

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

  return (
    <div className={`task-card ${isUnassigned ? 'task-card-unassigned' : ''}`}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{task.title}</span>
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
            {isUnassigned ? 'Claim' : isAssignedToMe ? 'Review' : 'View'}
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

export default function TasksInbox({ onTaskCountChange }: TasksInboxProps) {
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<MyTask | null>(null);
  const [filter, setFilter] = useState<'all' | 'mine' | 'unassigned'>('all');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await getMyTasks();
      setTasks(data);
      onTaskCountChange?.(data.length);
    } catch (err: any) {
      if (!silent) setError(err.message || 'Failed to load tasks');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [onTaskCountChange]);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 30000);
    return () => clearInterval(interval);
  }, [load]);

  const filteredTasks = tasks.filter((t) => {
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
        <button
          className="btn btn-secondary"
          onClick={() => load()}
          disabled={loading}
          style={{ padding: '8px 12px' }}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
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
      {loading && !error && (
        <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <RefreshCw size={24} className="animate-spin text-gradient" style={{ margin: '0 auto 12px' }} />
          <p className="text-secondary">Loading tasks from Orchestrator…</p>
        </div>
      )}

      {error && (
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
              {filter === 'all' ? 'No pending tasks' : filter === 'mine' ? 'No tasks assigned to you' : 'No unassigned tasks'}
            </p>
            <p style={{ fontSize: '0.875rem', maxWidth: '320px', textAlign: 'center' }}>
              {filter === 'all'
                ? 'All Human-in-the-Loop tasks are completed or no active case instances have pending approvals.'
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

      {!loading && !error && filteredTasks.length > 0 && (
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

      {/* Modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onRefresh={() => load(true)}
        />
      )}
    </div>
  );
}
