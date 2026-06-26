import { useEffect, useState, useCallback } from 'react';
import { getCases } from '../services/casesService';
import { getMyTasks } from '../services/casesService';
import type { CaseSummary } from '../types/cases';
import { ArrowRight, Box, AlertCircle, Clock, RefreshCw, ClipboardCheck } from 'lucide-react';

interface DashboardProps {
  onSelectCase: (processKey: string, name: string) => void;
  onOpenInbox: () => void;
}

export default function Dashboard({ onSelectCase, onOpenInbox }: DashboardProps) {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingTaskCount, setPendingTaskCount] = useState<number | null>(null);
  const [tasksLoading, setTasksLoading] = useState(true);

  const loadCases = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCases();
      setCases(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load cases from UiPath');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadTaskCount = useCallback(async (silent = false) => {
    if (!silent) setTasksLoading(true);
    try {
      const tasks = await getMyTasks();
      setPendingTaskCount(tasks.length);
    } catch {
      // silently ignore — don't break dashboard for task count errors
      setPendingTaskCount(null);
    } finally {
      if (!silent) setTasksLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCases();
    loadTaskCount();
    const interval = setInterval(() => loadTaskCount(true), 30000);
    return () => clearInterval(interval);
  }, [loadCases, loadTaskCount]);

  const totalRunning = cases.reduce((sum, c) => sum + c.running, 0);
  const totalCompleted = cases.reduce((sum, c) => sum + c.completed, 0);
  const totalFaulted = cases.reduce((sum, c) => sum + c.faulted, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Global Import Command Center</h1>
          <p className="text-secondary" style={{ marginTop: '8px' }}>Monitor and manage all active cross-border trade flows.</p>
        </div>
        <button onClick={loadCases} className="btn btn-secondary" disabled={isLoading} style={{ padding: '8px 12px' }}>
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </header>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(41, 69, 134, 0.1)', borderRadius: '6px', color: 'var(--accent-primary)' }}>
            <Box size={24} />
          </div>
          <div>
            <p className="text-secondary" style={{ fontSize: '0.875rem' }}>Active Runs</p>
            <h2 style={{ fontSize: '1.75rem', marginTop: '4px' }}>{totalRunning}</h2>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px', color: 'var(--success)' }}>
            <Clock size={24} />
          </div>
          <div>
            <p className="text-secondary" style={{ fontSize: '0.875rem' }}>Completed Runs</p>
            <h2 style={{ fontSize: '1.75rem', marginTop: '4px' }}>{totalCompleted}</h2>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', color: 'var(--danger)' }}>
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-secondary" style={{ fontSize: '0.875rem' }}>Faulted Runs</p>
            <h2 style={{ fontSize: '1.75rem', marginTop: '4px' }}>{totalFaulted}</h2>
          </div>
        </div>

        {/* Performance Metric card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '6px', color: '#a855f7' }}>
            <Clock size={24} />
          </div>
          <div>
            <p className="text-secondary" style={{ fontSize: '0.875rem' }}>Avg Execution Time</p>
            <h2 style={{ fontSize: '1.75rem', marginTop: '4px' }}>
              {(() => {
                const durations = cases.map(c => c.avgDurationMs).filter(d => d != null && d > 0) as number[];
                if (durations.length === 0) return '—';
                const avgMs = durations.reduce((a, b) => a + b, 0) / durations.length;
                const minutes = Math.round(avgMs / 60000);
                if (minutes > 0) return `${minutes} min`;
                return `${Math.round(avgMs / 1000)} sec`;
              })()}
            </h2>
          </div>
        </div>

        {/* Pending Approvals card */}
        <div
          className="glass-panel"
          onClick={onOpenInbox}
          style={{
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: pendingTaskCount && pendingTaskCount > 0
              ? '1px solid rgba(204, 177, 108, 0.4)'
              : '1px solid var(--glass-border)',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(204,177,108,0.15)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
        >
          <div style={{
            padding: '12px',
            background: pendingTaskCount && pendingTaskCount > 0 ? 'rgba(204, 177, 108, 0.15)' : 'rgba(100, 116, 139, 0.08)',
            borderRadius: '6px',
            color: pendingTaskCount && pendingTaskCount > 0 ? 'var(--accent-secondary)' : 'var(--text-secondary)',
            position: 'relative',
          }}>
            <ClipboardCheck size={24} />
            {pendingTaskCount && pendingTaskCount > 0 ? (
              <span className="badge-pulse" style={{
                position: 'absolute', top: -4, right: -4,
                width: 10, height: 10, background: 'var(--danger)',
                borderRadius: '50%', border: '2px solid white',
              }} />
            ) : null}
          </div>
          <div style={{ flex: 1 }}>
            <p className="text-secondary" style={{ fontSize: '0.875rem' }}>Pending Approvals</p>
            <h2 style={{
              fontSize: '1.75rem',
              marginTop: '4px',
              color: pendingTaskCount && pendingTaskCount > 0 ? 'var(--accent-secondary)' : undefined,
            }}>
              {tasksLoading && pendingTaskCount === null ? '—' : (pendingTaskCount ?? 0)}
            </h2>
          </div>
          <ArrowRight size={16} style={{ color: 'var(--text-secondary)' }} />
        </div>
      </div>

      {/* Case List */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>Recent Case Definitions</h3>
          <span className="text-secondary" style={{ fontSize: '0.85rem' }}>{cases.length} definition(s) found</span>
        </div>

        {error && (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--danger)' }}>
            <p>{error}</p>
            <button onClick={loadCases} className="btn btn-primary" style={{ marginTop: '12px' }}>Try Again</button>
          </div>
        )}

        {isLoading && !error && (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading cases from Data Fabric...
          </div>
        )}

        {!isLoading && !error && cases.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No Case definitions found.
          </div>
        )}

        {!isLoading && !error && cases.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px', fontWeight: 500 }}>Case Name</th>
                <th style={{ padding: '12px', fontWeight: 500 }}>Folder Location</th>
                <th style={{ padding: '12px', fontWeight: 500 }}>Total Executions</th>
                <th style={{ padding: '12px', fontWeight: 500 }}>Avg Duration</th>
                <th style={{ padding: '12px', fontWeight: 500 }}>Status Summary</th>
                <th style={{ padding: '12px', fontWeight: 500 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.processKey} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '16px 12px', fontWeight: 500 }}>{c.name}</td>
                  <td style={{ padding: '16px 12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{c.location}</td>
                  <td style={{ padding: '16px 12px' }}>{c.total} runs</td>
                  <td style={{ padding: '16px 12px', color: 'var(--text-secondary)' }}>
                    {c.avgDurationMs ? `${Math.round(c.avgDurationMs / 1000)}s` : '—'}
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {c.running > 0 && <span className="status-badge status-info">{c.running} running</span>}
                      {c.completed > 0 && <span className="status-badge status-success">{c.completed} completed</span>}
                      {c.faulted > 0 && <span className="status-badge status-danger">{c.faulted} faulted</span>}
                      {c.running === 0 && c.completed === 0 && c.faulted === 0 && <span className="status-badge status-neutral">Idle</span>}
                    </div>
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <button className="btn btn-primary" onClick={() => onSelectCase(c.processKey, c.name)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                      Open Dashboard <ArrowRight size={12} style={{ marginLeft: '4px' }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
