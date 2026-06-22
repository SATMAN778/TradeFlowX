import { useState, useEffect, useCallback } from 'react';
import { History, User, Clock, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, Check, X, FileText } from 'lucide-react';
import type { MyTask } from '../types/cases';
import { getTaskHistory } from '../services/casesService';

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

interface ActionHistoryProps {
  onHistoryCountChange?: (count: number) => void;
}

interface HistoryRowProps {
  task: MyTask;
}

function HistoryRow({ task }: HistoryRowProps) {
  const [expanded, setExpanded] = useState(false);
  
  const actionTaken = task.actionTaken || (task.data && task.data.decision) || 'Completed';
  
  const getActionBadgeClass = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('approve') || act === 'yes') return 'status-success';
    if (act.includes('reject') || act === 'no') return 'status-danger';
    return 'status-info';
  };

  const priorityClass =
    (task.priority ?? '').toLowerCase() === 'high' || (task.priority ?? '').toLowerCase() === 'critical'
      ? 'status-danger'
      : (task.priority ?? '').toLowerCase() === 'medium'
      ? 'status-warning'
      : 'status-info';

  const finalData = task.data || {};
  const hasData = Object.keys(finalData).length > 0;

  return (
    <div className="task-card" style={{ borderLeft: '3px solid var(--text-secondary)' }}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        {/* Icon */}
        <div style={{
          width: 40, height: 40, borderRadius: '8px', flexShrink: 0,
          background: 'rgba(255, 255, 255, 0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-secondary)',
        }}>
          <History size={20} />
        </div>

        {/* Main Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{task.title}</span>
            <span className={`status-badge ${getActionBadgeClass(actionTaken)}`} style={{ fontSize: '0.68rem', fontWeight: 600 }}>
              {actionTaken}
            </span>
            <span className={`status-badge ${priorityClass}`} style={{ fontSize: '0.68rem' }}>{task.priority || 'Medium'}</span>
          </div>
          
          <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <User size={12} /> {task.assignedToUser || 'Completed by system'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} /> Completed: {formatDate(task.completedAt || task.createdAt)}
            </span>
            {task.taskId && (
              <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>ID: {task.taskId}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          <button
            className="btn btn-secondary"
            onClick={() => setExpanded((x) => !x)}
            disabled={!hasData}
            style={{ padding: '5px 10px', fontSize: '0.78rem', gap: '4px', opacity: hasData ? 1 : 0.5 }}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Hide Payload' : 'View Payload'}
          </button>
        </div>
      </div>

      {/* Expanded payload details */}
      {expanded && hasData && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)', animation: 'fadeIn 0.2s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            <FileText size={13} /> FINAL ACTION DATA
          </div>
          <div style={{ border: '1px solid var(--glass-border)', borderRadius: '6px', overflow: 'hidden' }}>
            <table className="data-table">
              <thead><tr><th>Field</th><th>Value</th></tr></thead>
              <tbody>
                {Object.entries(finalData).map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ fontWeight: 500, color: 'var(--text-secondary)', width: '35%' }}>{formatLabel(k)}</td>
                    <td style={{ fontFamily: typeof v === 'object' ? 'monospace' : 'inherit', fontSize: typeof v === 'object' ? '0.8rem' : 'inherit' }}>
                      {typeof v === 'object' && v !== null ? JSON.stringify(v, null, 2) : String(v ?? '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ActionHistory({ onHistoryCountChange }: ActionHistoryProps) {
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await getTaskHistory();
      setTasks(data);
      onHistoryCountChange?.(data.length);
    } catch (err: any) {
      if (!silent) setError(err.message || 'Failed to load task history');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [onHistoryCountChange]);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 30000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History size={26} style={{ color: 'var(--accent-primary)' }} />
            Action History
          </h1>
          <p className="text-secondary" style={{ marginTop: '6px', fontSize: '0.9rem' }}>
            Historical record of Human-in-the-Loop case actions resolved by operators.
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

      {/* Content */}
      {loading && !error && (
        <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <RefreshCw size={24} className="animate-spin text-gradient" style={{ margin: '0 auto 12px' }} />
          <p className="text-secondary">Loading history from Orchestrator…</p>
        </div>
      )}

      {error && (
        <div className="glass-panel" style={{ padding: '32px 24px', textAlign: 'center' }}>
          <AlertTriangle size={24} style={{ color: 'var(--danger)', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--danger)', marginBottom: '12px' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => load()}>Try Again</button>
        </div>
      )}

      {!loading && !error && tasks.length === 0 && (
        <div className="glass-panel">
          <div className="inbox-empty">
            <div className="inbox-empty-icon" style={{ background: 'rgba(255, 255, 255, 0.04)' }}>
              <History size={28} />
            </div>
            <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>No completed actions</p>
            <p style={{ fontSize: '0.875rem', maxWidth: '320px', textAlign: 'center' }}>
              Actions submitted by operators in the Case Management Portal will appear here.
            </p>
          </div>
        </div>
      )}

      {!loading && !error && tasks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tasks.map((task) => (
            <HistoryRow key={task.taskId} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
