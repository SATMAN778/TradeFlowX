import { useState, useEffect } from 'react';
import { Check, X, AlertTriangle, Clock, Edit3, MessageSquare } from 'lucide-react';
import { CodedActionApp, MessageSeverity } from '@uipath/coded-action-app';

interface EmbeddedTaskViewProps {
  initialTask: any;
}

function formatLabel(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
}

export default function EmbeddedTaskView({ initialTask }: EmbeddedTaskViewProps) {
  const [service] = useState(() => new CodedActionApp());
  const [task, setTask] = useState(initialTask);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'Approve' | 'Reject' | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  // Load task form values from task data
  useEffect(() => {
    const rawData = task?.data ?? {};
    const init: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawData)) {
      init[k] = typeof v === 'object' && v !== null ? JSON.stringify(v, null, 2) : String(v ?? '');
    }
    setFormValues(init);
  }, [task]);

  const handleFieldChange = (key: string, value: string) => {
    const updatedValues = { ...formValues, [key]: value };
    setFormValues(updatedValues);
    // Notify Action Center of data changes to enable Save button
    try {
      service.setTaskData(updatedValues);
    } catch (e) {
      console.warn("Failed to notify Action Center of data changes:", e);
    }
  };

  const handleCompleteTask = async () => {
    if (!confirmAction) return;
    setSubmitting(false);
    setStatusMessage(null);
    setSubmitting(true);
    
    const outcome = confirmAction === 'Approve' ? 'Approved' : confirmAction === 'Reject' ? 'Rejected' : confirmAction;

    // Build output payload conforming to schema
    const payload = {
      ...formValues,
      decision: outcome,
      comments: comments,
      reviewedBy: task.assignedToUser?.emailAddress || task.assignedToUser?.userName || "CodedActionApp Reviewer",
      reviewedAt: new Date().toISOString()
    };

    try {
      const result = await service.completeTask(outcome, payload);
      if (result.success) {
        service.showMessage(`Task completed successfully: ${outcome}`, MessageSeverity.Success);
        setStatusMessage({
          text: `Task submitted successfully as '${outcome}'!`,
          type: 'success'
        });
        // Retrieve updated state
        try {
          const updated = await service.getTask();
          setTask(updated);
        } catch (err) {
          // Keep current state but mark as readonly
          setTask((prev: any) => ({ ...prev, isReadOnly: true }));
        }
      } else {
        const errorMsg = result.errorMessage || "Unknown error";
        service.showMessage(`Completion failed: ${errorMsg}`, MessageSeverity.Error);
        setStatusMessage({
          text: `Failed to complete task: ${errorMsg}`,
          type: 'error'
        });
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        text: `Error completing task: ${err.message || err}`,
        type: 'error'
      });
    } finally {
      setSubmitting(false);
      setConfirmAction(null);
    }
  };

  const isReadOnly = task?.isReadOnly || task?.status === 'Completed' || task?.status === 2;
  const isUnassigned = !task?.assignedToUser;

  const priority = task?.priority || 'Medium';
  const priorityClass =
    priority.toLowerCase() === 'high' || priority.toLowerCase() === 'critical'
      ? 'status-danger'
      : priority.toLowerCase() === 'medium'
      ? 'status-warning'
      : 'status-info';

  const dataFields = Object.keys(formValues);

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', fontFamily: 'inherit', color: 'var(--text-primary)' }}>
      {/* Task Header */}
      <div className="glass-panel animate-fade-in" style={{ padding: '24px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 600, margin: 0 }}>{task?.title || 'Review Action Task'}</h2>
              <span className={`status-badge ${priorityClass}`} style={{ fontSize: '0.75rem' }}>
                {priority}
              </span>
              <span className={`status-badge ${isReadOnly ? 'status-neutral' : 'status-info'}`} style={{ fontSize: '0.75rem' }}>
                {isReadOnly ? 'Read Only' : 'Active'}
              </span>
            </div>
            <p className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '6px' }}>
              TradeFlow Portal Maestro Coded Task Action
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={13} /> {task?.creationTime ? new Date(task.creationTime).toLocaleString() : 'N/A'}
            </span>
          </div>
        </div>

        {/* Task Assignment Warning */}
        {isUnassigned && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'rgba(239, 140, 0, 0.08)', border: '1px solid rgba(239, 140, 0, 0.25)', borderRadius: '8px', color: '#d97706', fontSize: '0.85rem' }}>
            <AlertTriangle size={16} />
            This task is currently **Unassigned**. You must assign/claim the task in Action Center to edit and complete it.
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="glass-panel animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Status Message */}
        {statusMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '0.875rem',
            background: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            border: statusMessage.type === 'success' ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
            color: statusMessage.type === 'success' ? '#059669' : '#dc2626'
          }}>
            {statusMessage.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
            {statusMessage.text}
          </div>
        )}

        {/* Form Fields */}
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
            <Edit3 size={16} style={{ color: 'var(--accent-primary)' }} />
            Task Data Fields
          </h3>

          {dataFields.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {dataFields.map((key) => (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {formatLabel(key)}
                  </label>
                  <input
                    type="text"
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--glass-border)',
                      background: isReadOnly ? 'rgba(0,0,0,0.02)' : 'var(--bg-primary)',
                      color: isReadOnly ? 'var(--text-secondary)' : 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      transition: 'border 0.2s',
                      width: '100%',
                    }}
                    value={formValues[key] ?? ''}
                    onChange={(e) => handleFieldChange(key, e.target.value)}
                    disabled={isReadOnly || submitting}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-secondary" style={{ fontSize: '0.85rem' }}>No task data fields found.</p>
          )}
        </div>

        {/* Comments Box */}
        <div style={{ marginTop: '8px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
            <MessageSquare size={16} style={{ color: 'var(--accent-primary)' }} />
            Review Comments
          </h3>
          <textarea
            style={{
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid var(--glass-border)',
              background: isReadOnly ? 'rgba(0,0,0,0.02)' : 'var(--bg-primary)',
              color: isReadOnly ? 'var(--text-secondary)' : 'var(--text-primary)',
              fontSize: '0.9rem',
              outline: 'none',
              transition: 'border 0.2s',
              width: '100%',
              minHeight: '80px',
              resize: 'vertical',
            }}
            placeholder={isReadOnly ? "No comments." : "Enter approval/rejection comments or notes..."}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            disabled={isReadOnly || submitting}
          />
        </div>

        {/* Confirmation Bar */}
        {confirmAction && (
          <div className="confirm-bar" style={{ animation: 'fadeIn 0.2s ease', padding: '16px', borderRadius: '8px', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <AlertTriangle size={18} style={{ color: 'var(--warning)', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: '0.875rem' }}>
              Are you sure you want to <strong>{confirmAction}</strong> this task? This action is irreversible.
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setConfirmAction(null)}
                disabled={submitting}
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCompleteTask}
                disabled={submitting}
                style={{
                  padding: '6px 16px',
                  fontSize: '0.82rem',
                  background: confirmAction === 'Approve' ? 'var(--success)' : 'var(--danger)',
                  borderColor: confirmAction === 'Approve' ? 'var(--success)' : 'var(--danger)',
                }}
              >
                {submitting ? 'Submitting…' : `Yes, ${confirmAction}`}
              </button>
            </div>
          </div>
        )}

        {/* Decision Actions */}
        {!isReadOnly && !confirmAction && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              className="btn btn-primary"
              onClick={() => setConfirmAction('Approve')}
              disabled={submitting}
              style={{ flex: 1, justifyContent: 'center', background: 'var(--success)', borderColor: 'var(--success)', fontSize: '0.95rem', padding: '10px' }}
            >
              <Check size={18} /> Approve Case
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setConfirmAction('Reject')}
              disabled={submitting}
              style={{ flex: 1, justifyContent: 'center', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)', fontSize: '0.95rem', padding: '10px' }}
            >
              <X size={18} /> Reject Case
            </button>
          </div>
        )}

        {/* Read-Only Status Badge */}
        {isReadOnly && (
          <div style={{ textAlign: 'center', padding: '14px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            This task has been completed or is read-only.
          </div>
        )}
      </div>
    </div>
  );
}
