import { useState, useEffect } from 'react';
import { User, Check, X, Shield, AlertTriangle, Clock, Hash, ExternalLink } from 'lucide-react';
import type { TaskDetailsResponse } from '../types/cases';

interface HumanTasksProps {
  taskDetails: TaskDetailsResponse | null;
  onClaim: () => Promise<void>;
  onUnassign: () => Promise<void>;
  onComplete: (action: 'Approve' | 'Reject', data: Record<string, string>) => Promise<void>;
  claiming: boolean;
  unclaiming: boolean;
  completing: boolean;
}

function formatLabel(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
}

function extractAssignedUser(raw: any): string | null {
  if (raw == null) return null;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    const val = raw.emailAddress ?? raw.EmailAddress ?? raw.Email ?? raw.email ?? raw.userName ?? raw.UserName ?? raw.Name ?? raw.name;
    if (typeof val === 'string') return val;
  }
  return String(raw);
}

function toFormValues(data: Record<string, any>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    result[key] =
      typeof value === 'object' && value !== null
        ? JSON.stringify(value, null, 2)
        : String(value ?? '');
  }
  return result;
}

export default function HumanTasks({
  taskDetails,
  onClaim,
  onUnassign,
  onComplete,
  claiming,
  unclaiming,
  completing,
}: HumanTasksProps) {
  const task = taskDetails?.task;
  const data = task?.data ?? {};
  const assignedToUser = extractAssignedUser(task?.assignedToUser);
  const title = task?.title || 'Active Action Task';
  const priority = task?.priority || 'Medium';
  const taskId = taskDetails?.taskId;
  const createdAt = task?.creationTime || task?.CreationTime || task?.createdAt || null;

  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [confirmAction, setConfirmAction] = useState<'Approve' | 'Reject' | null>(null);

  useEffect(() => {
    if (data) {
      setFormValues(toFormValues(data));
    }
  }, [data]);

  const handleFieldChange = (key: string, newValue: string) => {
    setFormValues((prev) => ({ ...prev, [key]: newValue }));
  };

  const isAssigned = assignedToUser != null;
  const isAssignedToMe =
    isAssigned &&
    taskDetails?.currentUserEmail &&
    assignedToUser.toLowerCase() === taskDetails.currentUserEmail.toLowerCase();

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    await onComplete(confirmAction, formValues);
    setConfirmAction(null);
  };

  const priorityClass =
    priority.toLowerCase() === 'high' || priority.toLowerCase() === 'critical'
      ? 'status-danger'
      : priority.toLowerCase() === 'medium'
      ? 'status-warning'
      : 'status-info';

  if (!taskDetails || !task) {
    return (
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h3>Human Task Queue</h3>
          <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '4px' }}>Review and take action on pending tasks.</p>
        </div>
        <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(41,69,134,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'var(--accent-primary)' }}>
            <Shield size={22} />
          </div>
          <p style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>No Active Task</p>
          <p style={{ fontSize: '0.8rem' }}>No Human-in-the-Loop tasks for this case instance.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Human Task Queue</h3>
          <span className={`status-badge ${priorityClass}`} style={{ fontSize: '0.75rem' }}>
            {priority}
          </span>
        </div>
        <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '4px' }}>Active task requiring human review &amp; approval.</p>
      </div>

      {/* Task card */}
      <div style={{ border: '1px solid var(--glass-border)', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
        {/* Accent bar */}
        <div style={{ height: '3px', background: isAssignedToMe ? 'var(--success)' : 'var(--accent-gradient)' }} />

        <div style={{ padding: '16px' }}>
          <h4 style={{ fontSize: '1rem', color: 'var(--accent-primary)', marginBottom: '12px' }}>{title}</h4>

          {/* Meta info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={13} />
              {isAssigned
                ? isAssignedToMe
                  ? <span style={{ color: 'var(--success)', fontWeight: 500 }}>Assigned to you</span>
                  : `Assigned to ${assignedToUser}`
                : 'Unassigned — you can claim this task'}
            </span>
            {createdAt && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={13} /> Created: {new Date(createdAt).toLocaleString()}
              </span>
            )}
            {taskId && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Hash size={13} /> Task ID: <span style={{ fontFamily: 'monospace' }}>{taskId}</span>
              </span>
            )}
          </div>

          {/* Task data — editable if assigned to me, read-only otherwise */}
          {Object.keys(data).length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Task Data
              </p>
              {isAssignedToMe ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {Object.keys(data).map((key) => (
                    <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {formatLabel(key)}
                      </label>
                      <input
                        type="text"
                        style={{
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--glass-border)',
                          background: 'var(--bg-primary)',
                          fontSize: '0.875rem',
                          outline: 'none',
                          transition: 'border 0.2s',
                          width: '100%',
                        }}
                        value={formValues[key] ?? ''}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        disabled={completing}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ border: '1px solid var(--glass-border)', borderRadius: '6px', overflow: 'hidden' }}>
                  <table className="data-table">
                    <tbody>
                      {Object.entries(data).map(([key, val]) => (
                        <tr key={key}>
                          <td style={{ fontWeight: 500, color: 'var(--text-secondary)', width: '40%' }}>{formatLabel(key)}</td>
                          <td>{typeof val === 'object' ? JSON.stringify(val) : String(val ?? '—')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* External link */}
          {taskDetails.externalLink && (
            <a
              href={taskDetails.externalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', gap: '6px', marginBottom: '12px', textDecoration: 'none' }}
            >
              <ExternalLink size={13} /> Open in Action Center
            </a>
          )}

          {/* Inline confirmation */}
          {confirmAction && (
            <div className="confirm-bar" style={{ marginBottom: '10px' }}>
              <AlertTriangle size={15} style={{ color: 'var(--warning)', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: '0.82rem' }}>
                Confirm <strong>{confirmAction}</strong>?
              </span>
              <button
                className="btn btn-secondary"
                onClick={() => setConfirmAction(null)}
                disabled={completing}
                style={{ padding: '5px 10px', fontSize: '0.78rem' }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmAction}
                disabled={completing}
                style={{
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  background: confirmAction === 'Approve' ? 'var(--success)' : 'var(--danger)',
                  borderColor: confirmAction === 'Approve' ? 'var(--success)' : 'var(--danger)',
                }}
              >
                {completing ? 'Submitting…' : `Yes, ${confirmAction}`}
              </button>
            </div>
          )}

          {/* Action buttons */}
          {!confirmAction && (
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              {!isAssigned && (
                <button
                  className="btn btn-primary"
                  onClick={onClaim}
                  disabled={claiming}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {claiming ? 'Assigning…' : 'Assign to myself'}
                </button>
              )}

              {isAssignedToMe && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => setConfirmAction('Approve')}
                      disabled={completing || unclaiming}
                      style={{ flex: 1, justifyContent: 'center', background: 'var(--success)', borderColor: 'var(--success)' }}
                    >
                      <Check size={16} /> Approve
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setConfirmAction('Reject')}
                      disabled={completing || unclaiming}
                      style={{ flex: 1, justifyContent: 'center', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                    >
                      <X size={16} /> Reject
                    </button>
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={onUnassign}
                    disabled={completing || unclaiming}
                    style={{ width: '100%', justifyContent: 'center', borderColor: 'rgba(239, 68, 68, 0.2)', fontSize: '0.8rem' }}
                  >
                    {unclaiming ? 'Releasing…' : 'Release / Unassign Task'}
                  </button>
                </div>
              )}

              {isAssigned && !isAssignedToMe && (
                <div style={{ padding: '10px', textAlign: 'center', background: 'rgba(0,0,0,0.02)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)', width: '100%' }}>
                  This task is claimed by another user and is read-only.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
