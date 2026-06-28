import { useState, useEffect, useCallback } from 'react';
import { getCaseInstances } from '../../services/casesService';
import type { CaseInstance } from '../../types/cases';
import { Package, Clock } from 'lucide-react';

interface CaseListProps {
  caseName: string;
  processKey: string;
  onBackToDashboard: () => void;
  onSelectInstance: (id: string, folder: string) => void;
}

export default function CaseList({ caseName, processKey, onBackToDashboard, onSelectInstance }: CaseListProps) {
  const [instances, setInstances] = useState<CaseInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInstances = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCaseInstances(processKey);
      setInstances(data);
    } catch {
      setError('Failed to load case instances');
    } finally {
      setIsLoading(false);
    }
  }, [processKey]);

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="section-heading">
            <div className="section-heading-icon">
              <Package size={17} />
            </div>
            <h1 style={{ fontSize: '1.6rem' }}>{caseName}</h1>
          </div>
          <p className="text-secondary" style={{ fontSize: '0.9rem', marginTop: '4px', marginLeft: '42px' }}>
            Select an active case execution instance to inspect and manage.
          </p>
        </div>
        <button onClick={onBackToDashboard} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
          &larr; Back
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1rem' }}>Execution Instances</h3>
          <span className="text-secondary" style={{ fontSize: '0.82rem' }}>{instances.length} instance(s)</span>
        </div>

        {isLoading && <div className="text-secondary" style={{ padding: '20px', textAlign: 'center' }}>Loading instances…</div>}
        {error && <div style={{ color: 'var(--danger)', padding: '20px', textAlign: 'center' }}>{error}</div>}
        {!isLoading && !error && instances.length === 0 && (
          <div className="text-secondary" style={{ padding: '20px', textAlign: 'center' }}>No active instances found for this case.</div>
        )}

        {!isLoading && !error && instances.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px', fontWeight: 500 }}>Instance ID</th>
                <th style={{ padding: '12px', fontWeight: 500 }}>Started At</th>
                <th style={{ padding: '12px', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '12px', fontWeight: 500 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {instances.map((inst) => (
                <tr key={inst.instanceId} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '16px 12px', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.9rem' }}>
                    {inst.id || inst.instanceId.substring(0, 8)}
                  </td>
                  <td style={{ padding: '16px 12px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={13} /> {inst.startedAt}
                    </span>
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <span className={`status-badge ${
                      inst.status.toLowerCase() === 'inprogress' || inst.status.toLowerCase() === 'running'
                        ? 'status-info' : inst.status.toLowerCase() === 'completed'
                        ? 'status-success' : 'status-danger'
                    }`}>
                      {inst.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => onSelectInstance(inst.instanceId, inst.folderKey)}
                      style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                    >
                      Inspect &rarr;
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
