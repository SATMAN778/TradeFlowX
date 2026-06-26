import { useEffect, useState, useCallback } from 'react';
import { getCases, getMyTasks } from '../../services/casesService';
import type { CaseSummary } from '../../types/cases';
import { RefreshCw, ArrowRight } from 'lucide-react';
import KpiTiles from './KpiTiles';
import SlaAlertRail from './SlaAlertRail';
import ConnectorStatus from './ConnectorStatus';

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-gradient">Operations Command Center</h1>
          <p className="text-secondary" style={{ marginTop: '6px' }}>UAE-to-USA Global Import Trade &amp; Customs Intelligence</p>
        </div>
        <button onClick={loadCases} className="btn btn-secondary" disabled={isLoading} style={{ padding: '8px 12px' }}>
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </header>

      {/* 8-Tile Operations KPIs */}
      <KpiTiles 
        cases={cases} 
        pendingTaskCount={pendingTaskCount} 
        loading={isLoading} 
      />

      {/* Alerts and Connection statuses */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <SlaAlertRail onSelectCaseInstance={(id) => onSelectCase('dubai_usa_import_maestro', 'Dubai → USA Import (Dubai Tech Mfg to US Global Corp)')} />
        <ConnectorStatus />
      </div>

      {/* Case definitions listing */}
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
