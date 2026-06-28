// src/features/tasks/TaskInbox.tsx — Role-filtered, SLA-sorted task inbox (Blueprint v3)
import { useState, useEffect, useCallback } from 'react';
import { Inbox, RefreshCw, AlertTriangle } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import type { ActionCenterTask } from '../../types/task';
import { useAuth } from '../../context/AuthContext';
import { getMyTasks } from '../../services/casesService';

const toActionCenterTask = (raw: any): ActionCenterTask => ({
  id: raw.taskId || raw.id || '',
  taskCode: raw.data?.taskCode || raw.taskCode || 'HT-01',
  caseId: raw.caseInstanceId || raw.caseId || '',
  stageId: raw.data?.stageId || raw.stageId || 'S1',
  assigneeRole: raw.data?.assigneeRole || raw.assigneeRole || 'CustomsBroker',
  slaDeadline: raw.data?.slaDeadline || raw.slaDeadline || new Date(Date.now() + 4 * 3600000).toISOString(),
  taskState: raw.status || raw.taskState || 'Pending',
  inputData: raw.data || raw.inputData || {},
  title: raw.title || '',
  priority: raw.priority || 'Normal',
  createdAt: raw.createdAt || '',
});

interface TaskInboxProps {
  onTaskCountChange?: (count: number) => void;
}

export const TaskInbox = ({ onTaskCountChange }: TaskInboxProps) => {
  const { activeRole } = useAuth();
  const [tasks, setTasks] = useState<ActionCenterTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<ActionCenterTask | null>(null);
  const [filter, setFilter] = useState<'all' | 'urgent' | 'mine'>('all');

  const loadTasks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const raw = await getMyTasks();
      const mapped = raw.map(toActionCenterTask);
      // Sort by SLA (breached first, then closest deadline)
      mapped.sort((a, b) => new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime());
      setTasks(mapped);
      onTaskCountChange?.(mapped.length);
    } catch (err) {
      console.error('[TaskInbox] Failed to load tasks:', err);
      setError('Could not load tasks. Check your connection and permissions.');
    } finally {
      setLoading(false);
    }
  }, [onTaskCountChange]);

  useEffect(() => {
    loadTasks();
    const id = setInterval(() => loadTasks(true), 30_000);
    return () => clearInterval(id);
  }, [loadTasks]);

  const immediateTaskCodes = ['HT-04', 'HT-10', 'HT-12'];
  const immediateTasks = tasks.filter(t => immediateTaskCodes.includes(t.taskCode));
  
  const filtered = tasks.filter(t => {
    if (filter === 'urgent') return new Date(t.slaDeadline).getTime() - Date.now() < 4 * 3600000;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="section-heading">
            <div className="section-heading-icon"><Inbox size={17} /></div>
            <h1 style={{ fontSize: '1.5rem' }}>Task Inbox</h1>
          </div>
          <p className="text-secondary" style={{ fontSize: '0.875rem', marginTop: '4px', marginLeft: '42px' }}>
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} pending · Role: <strong>{activeRole}</strong>
          </p>
        </div>
        <button onClick={() => loadTasks()} disabled={loading} className="btn btn-secondary" style={{ padding: '8px 16px', display: 'flex', gap: '6px', alignItems: 'center' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Immediate alert banner */}
      {immediateTasks.length > 0 && (
        <div style={{ background: 'rgba(220,38,38,0.15)', border: '2px solid #dc2626', borderRadius: '10px', padding: '14px 18px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <AlertTriangle size={22} color="#ef4444" className="animate-pulse" />
          <div>
            <div style={{ fontWeight: 700, color: '#ef4444' }}>
              {immediateTasks.length} IMMEDIATE TASK{immediateTasks.length > 1 ? 'S' : ''} REQUIRE ATTENTION
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {immediateTasks.map(t => t.taskCode).join(' · ')} — click to act now
            </div>
          </div>
          {immediateTasks.map(t => (
            <button key={t.id} onClick={() => setSelectedTask(t)}
              style={{ marginLeft: 'auto', background: '#dc2626', border: 'none', borderRadius: '6px', color: 'white', padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}>
              Open {t.taskCode}
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {(['all', 'urgent'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--glass-border)', cursor: 'pointer',
            background: filter === f ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
            color: 'white', fontSize: '0.82rem', fontWeight: 600, textTransform: 'capitalize',
          }}>
            {f === 'all' ? `All (${tasks.length})` : `Urgent`}
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading && !tasks.length && (
        <div className="text-secondary" style={{ textAlign: 'center', padding: '40px' }}>Loading tasks…</div>
      )}
      {error && (
        <div style={{ color: 'var(--danger)', background: 'rgba(220,38,38,0.1)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
          {error}
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <Inbox size={36} color="var(--text-secondary)" style={{ marginBottom: '12px' }} />
          <p className="text-secondary">No tasks in queue for your current role.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.map(task => (
          <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
        ))}
      </div>

      {selectedTask && (
        <TaskModal task={selectedTask} onClose={() => { setSelectedTask(null); loadTasks(true); }} />
      )}
    </div>
  );
};

export default TaskInbox;
