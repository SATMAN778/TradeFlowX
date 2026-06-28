// src/features/audit/AuditLog.tsx — DF AuditEntry records; filter + paginate
import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, RefreshCw, Download } from 'lucide-react';
import { entitiesSvc } from '../../lib/sdk';
import type { AuditEntry } from '../../types/entities';

const AUDIT_ENTITY = import.meta.env.VITE_ENTITY_AUDIT;

const ACTION_COLORS: Record<string, string> = {
  TASK_COMPLETED:       '#22c55e',
  TASK_ESCALATED:       '#d97706',
  DOCUMENT_UPLOADED:    '#818cf8',
  DOCUMENT_VIEWED:      '#60a5fa',
  CASE_VIEWED:          '#94a3b8',
  CASE_FIELD_UPDATED:   '#f59e0b',
  HTS_OVERRIDDEN:       '#fb923c',
  OFAC_REVIEW_COMPLETED:'#a78bfa',
  DUTY_SAVINGS_DECIDED: '#34d399',
  AUDIT_EXPORTED:       '#f472b6',
  SLA_ACKNOWLEDGED:     '#fbbf24',
};

export const AuditLog = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    if (!AUDIT_ENTITY) {
      // Mock data for demo
      const mockEntries: AuditEntry[] = Array.from({ length: 15 }, (_, i) => ({
        id: `mock-${i}`,
        CaseRef: `CASE-${1000 + i}`,
        ActorUserId: 'demo@tradeflow.ai',
        ActorRole: ['CustomsBroker', 'ComplianceOfficer', 'ImporterOps'][i % 3],
        ActionType: Object.keys(ACTION_COLORS)[i % Object.keys(ACTION_COLORS).length],
        StageId: `S${(i % 7) + 1}`,
        TaskCode: i % 3 === 0 ? `HT-${String(i % 18 + 1).padStart(2, '0')}` : undefined,
        RecordedAt: new Date(Date.now() - i * 3600000).toISOString(),
        DecisionOutcome: i % 2 === 0 ? 'Approved' : undefined,
      }));
      setEntries(mockEntries);
      setLoading(false);
      return;
    }
    try {
      const result = await entitiesSvc.getAll(AUDIT_ENTITY);
      const items: any[] = Array.isArray(result) ? result : (result as any).items || [];
      const sorted = [...items].sort((a: any, b: any) =>
        new Date(b.RecordedAt).getTime() - new Date(a.RecordedAt).getTime()
      );
      setEntries(sorted as AuditEntry[]);
    } catch (err: any) {
      setError(err?.message || 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = entries.filter(e =>
    !filter || JSON.stringify(e).toLowerCase().includes(filter.toLowerCase())
  );
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const exportCSV = () => {
    const headers = ['RecordedAt', 'CaseRef', 'ActorUserId', 'ActorRole', 'ActionType', 'StageId', 'TaskCode', 'DecisionOutcome'];
    const rows = filtered.map(e => headers.map(h => (e as any)[h] || '').join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `audit-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="section-heading">
            <div className="section-heading-icon"><ShieldCheck size={17} /></div>
            <h1 style={{ fontSize: '1.5rem' }}>Compliance Audit Log</h1>
          </div>
          <p className="text-secondary" style={{ fontSize: '0.875rem', marginTop: '4px', marginLeft: '42px' }}>
            {filtered.length} events · All actions tracked to Data Fabric
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => load()} disabled={loading} className="btn btn-secondary" style={{ padding: '8px 14px', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={exportCSV} className="btn btn-secondary" style={{ padding: '8px 14px', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter */}
      <input
        value={filter}
        onChange={e => { setFilter(e.target.value); setPage(0); }}
        placeholder="Filter by case, actor, action type…"
        style={{
          background: 'rgba(255,255,255,0.07)', border: '1px solid var(--glass-border)',
          borderRadius: '8px', padding: '10px 14px', color: 'var(--text-primary)',
          fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box',
        }}
      />

      {loading && <div className="text-secondary" style={{ textAlign: 'center', padding: '32px' }}>Loading audit log…</div>}
      {error && <div style={{ color: '#ef4444', background: 'rgba(220,38,38,0.1)', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>{error}</div>}

      {!loading && !error && (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px' }}>Timestamp</th>
                <th style={{ padding: '10px 14px' }}>Case</th>
                <th style={{ padding: '10px 14px' }}>Actor</th>
                <th style={{ padding: '10px 14px' }}>Action</th>
                <th style={{ padding: '10px 14px' }}>Stage</th>
                <th style={{ padding: '10px 14px' }}>Task</th>
                <th style={{ padding: '10px 14px' }}>Decision</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>No audit entries found.</td></tr>
              )}
              {paginated.map((e, i) => {
                const color = ACTION_COLORS[e.ActionType] || 'var(--text-secondary)';
                return (
                  <tr key={`${e.id || 'audit'}-${i}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '10px 14px', fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {new Date(e.RecordedAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 600 }}>{e.CaseRef}</td>
                    <td style={{ padding: '10px 14px', fontSize: '0.82rem' }}>
                      <div>{e.ActorRole}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{e.ActorUserId}</div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: `${color}18`, color }}>
                        {e.ActionType}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{e.StageId}</td>
                    <td style={{ padding: '10px 14px', fontSize: '0.82rem', fontFamily: 'monospace' }}>{e.TaskCode || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: '0.82rem' }}>{e.DecisionOutcome || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="btn btn-secondary" style={{ padding: '6px 14px', opacity: page === 0 ? 0.4 : 1 }}>← Prev</button>
          <span className="text-secondary" style={{ fontSize: '0.875rem' }}>Page {page + 1} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="btn btn-secondary" style={{ padding: '6px 14px', opacity: page >= totalPages - 1 ? 0.4 : 1 }}>Next →</button>
        </div>
      )}
    </div>
  );
};

export default AuditLog;
