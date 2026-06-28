import { useState, useEffect, useCallback, useMemo } from 'react';
import { Database, Search, RefreshCw, X, ExternalLink, AlertCircle, FileText, ShieldAlert, Percent, ShieldCheck, Box, ClipboardCheck, DollarSign, History } from 'lucide-react';
import { dfHelper } from '../lib/sdk';
import type {
  ImportCaseRecord,
  HumanTaskRecord,
  OfacScreeningRecord,
  IsfFilingRecord,
  ShipmentDocument,
  DutyCalculation,
  AuditEntry
} from '../types/entities';

// Props to link back to MainLayout inspection
interface DataRegistryProps {
  onInspectCase: (instanceId: string, folderKey: string) => void;
}

type EntityType = 'cases' | 'tasks' | 'ofac' | 'isf' | 'duty' | 'docs' | 'audit';

interface EntityConfig {
  id: EntityType;
  name: string;
  envKey: string;
  icon: any;
  color: string;
}

const ENTITIES: EntityConfig[] = [
  { id: 'cases', name: 'Case Records', envKey: 'VITE_ENTITY_CASE', icon: Box, color: 'var(--accent-primary)' },
  { id: 'tasks', name: 'Task Records', envKey: 'VITE_ENTITY_TASK', icon: ClipboardCheck, color: 'var(--accent-secondary)' },
  { id: 'ofac', name: 'OFAC Screening', envKey: 'VITE_ENTITY_OFAC', icon: ShieldAlert, color: '#ef4444' },
  { id: 'isf', name: 'ISF Filings', envKey: 'VITE_ENTITY_ISF', icon: FileText, color: '#0369a1' },
  { id: 'duty', name: 'Duty Calcs', envKey: 'VITE_ENTITY_DUTY', icon: DollarSign, color: '#10b981' },
  { id: 'docs', name: 'Documents', envKey: 'VITE_ENTITY_DOC', icon: FileText, color: '#8b5cf6' },
  { id: 'audit', name: 'Audit Entries', envKey: 'VITE_ENTITY_AUDIT', icon: History, color: '#64748b' }
];

export default function DataRegistry({ onInspectCase }: DataRegistryProps) {
  const [activeTab, setActiveTab] = useState<EntityType>('cases');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  const activeEntity = useMemo(() => ENTITIES.find(e => e.id === activeTab)!, [activeTab]);

  const loadData = useCallback(async () => {
    const entityId = import.meta.env[activeEntity.envKey];
    if (!entityId || entityId.startsWith('import') || entityId.startsWith('humantask') || entityId.includes('mock-')) {
      setError(`Data Fabric Entity ID not configured or contains placeholder for ${activeEntity.name}.`);
      setRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await dfHelper.getAll(entityId);
      const items = Array.isArray(res) ? res : (res as any).items || (res as any).value || [];
      setRecords(items);
    } catch (err: any) {
      console.error(`[DataRegistry] Failed to query ${activeEntity.name}:`, err);
      setError(`Failed to fetch records from Data Fabric: ${err.message || err}.`);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [activeEntity, activeTab]);

  useEffect(() => {
    loadData();
    setSelectedRecord(null);
  }, [loadData]);

  // Filter records based on search query
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const query = searchQuery.toLowerCase();
    return records.filter(r => {
      return Object.entries(r).some(([key, val]) => {
        if (key === 'id') return false;
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(query);
      });
    });
  }, [records, searchQuery]);

  // Render cell helper
  const renderCell = (key: string, value: any) => {
    if (value === null || value === undefined) return <span style={{ opacity: 0.4 }}>—</span>;
    if (typeof value === 'boolean') {
      return value ? (
        <span className="status-badge status-danger">TRUE</span>
      ) : (
        <span className="status-badge status-success">FALSE</span>
      );
    }

    // Status formatting
    if (key.toLowerCase().includes('status') || key.toLowerCase().includes('state')) {
      const valStr = String(value).toLowerCase();
      let badgeClass = 'status-neutral';
      if (['active', 'completed', 'clear', 'released', 'true', 'success'].includes(valStr)) badgeClass = 'status-success';
      if (['pending', 'inprogress', 'running', 'hold', 'exam', 'fuzzy_match'].includes(valStr)) badgeClass = 'status-warning';
      if (['closed', 'faulted', 'blocked', 'denied', 'seizure', 'do not load', 'failed', 'confirmed_hit'].includes(valStr)) badgeClass = 'status-danger';
      return <span className={`status-badge ${badgeClass}`}>{String(value)}</span>;
    }

    // Match score formatting (OFAC)
    if (key === 'MatchScore') {
      const score = Number(value);
      const color = score >= 85 ? '#ef4444' : score >= 60 ? '#d97706' : '#22c55e';
      return (
        <span style={{ fontWeight: 700, color }}>{score}%</span>
      );
    }

    // Currency formatting
    if (key.toLowerCase().includes('value') || key.toLowerCase().includes('amount') || key.toLowerCase().includes('usd')) {
      return <strong>${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>;
    }

    // Date formatting
    if (key.toLowerCase().includes('date') || key.toLowerCase().includes('at') || key.toLowerCase().includes('time')) {
      try {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          return <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{d.toLocaleString()}</span>;
        }
      } catch { /* fallback */ }
    }

    // Long string truncation
    const str = String(value);
    if (str.length > 50) {
      return <span title={str}>{str.substring(0, 47)}...</span>;
    }

    return str;
  };

  // Get keys to display in the main table based on active tab
  const getTableColumns = (tab: EntityType): { key: string; label: string }[] => {
    switch (tab) {
      case 'cases':
        return [
          { key: 'CaseRef', label: 'Case Reference' },
          { key: 'PoNumber', label: 'PO Number' },
          { key: 'ImporterName', label: 'Importer' },
          { key: 'SupplierName', label: 'Supplier' },
          { key: 'TotalValueUsd', label: 'Total Value' },
          { key: 'CurrentStage', label: 'Stage' },
          { key: 'CaseState', label: 'State' }
        ];
      case 'tasks':
        return [
          { key: 'CaseRef', label: 'Case Reference' },
          { key: 'TaskCode', label: 'Code' },
          { key: 'TaskTitle', label: 'Task Title' },
          { key: 'AssigneeRole', label: 'Assignee Role' },
          { key: 'TaskState', label: 'State' },
          { key: 'DecisionOutcome', label: 'Decision' }
        ];
      case 'ofac':
        return [
          { key: 'CaseRef', label: 'Case Reference' },
          { key: 'PartyName', label: 'Party Name' },
          { key: 'PartyRole', label: 'Role' },
          { key: 'MatchResult', label: 'Result' },
          { key: 'MatchScore', label: 'Match Score' },
          { key: 'ScreenedAt', label: 'Screened At' }
        ];
      case 'isf':
        return [
          { key: 'CaseRef', label: 'Case Reference' },
          { key: 'FilingStatus', label: 'Filing Status' },
          { key: 'AceTxnNumber', label: 'ACE Txn #' },
          { key: 'DeadlineUtc', label: 'Deadline' },
          { key: 'SubmittedAt', label: 'Submitted' }
        ];
      case 'duty':
        return [
          { key: 'CaseRef', label: 'Case Reference' },
          { key: 'HtsCode', label: 'HTS Code' },
          { key: 'DeclaredValueUsd', label: 'Declared Value' },
          { key: 'TotalDutyUsd', label: 'Calculated Duty' },
          { key: 'ActualDutyUsd', label: 'Actual Duty' },
          { key: 'VarianceUsd', label: 'Variance' }
        ];
      case 'docs':
        return [
          { key: 'CaseRef', label: 'Case Reference' },
          { key: 'FileName', label: 'File Name' },
          { key: 'DocumentCategory', label: 'Category' },
          { key: 'IdpConfidence', label: 'IDP Confidence' },
          { key: 'UploadedBy', label: 'Uploaded By' },
          { key: 'UploadedAt', label: 'Uploaded At' }
        ];
      case 'audit':
        return [
          { key: 'CaseRef', label: 'Case Reference' },
          { key: 'ActorUserId', label: 'Actor User' },
          { key: 'ActorRole', label: 'Actor Role' },
          { key: 'ActionType', label: 'Action Type' },
          { key: 'StageId', label: 'Stage' },
          { key: 'RecordedAt', label: 'Recorded At' }
        ];
    }
  };

  const columns = useMemo(() => getTableColumns(activeTab), [activeTab]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="section-heading">
            <div className="section-heading-icon" style={{ background: 'rgba(41, 69, 134, 0.1)', color: 'var(--accent-primary)' }}>
              <Database size={18} />
            </div>
            <h1 style={{ fontSize: '1.6rem' }}>Data Fabric Registry Explorer</h1>
          </div>
          <p className="text-secondary" style={{ fontSize: '0.9rem', marginTop: '4px', marginLeft: '42px' }}>
            Live browser for all backend Data Fabric record entities configured for TradeFlow.
          </p>
        </div>

        <button onClick={loadData} className="btn btn-secondary" disabled={loading} style={{ padding: '8px 12px', display: 'flex', gap: '6px', alignItems: 'center' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Warnings & Alerts */}
      {error && (
        <div style={{ display: 'flex', gap: '10px', padding: '12px 16px', background: 'rgba(204, 177, 108, 0.08)', border: '1px solid rgba(204, 177, 108, 0.3)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
          <AlertCircle size={16} color="var(--accent-secondary)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="glass-panel" style={{ padding: '8px', display: 'flex', gap: '8px', overflowX: 'auto' }}>
        {ENTITIES.map((ent) => {
          const Icon = ent.icon;
          const isActive = activeTab === ent.id;
          return (
            <button
              key={ent.id}
              onClick={() => setActiveTab(ent.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                border: 'none',
                borderRadius: '8px',
                background: isActive ? ent.color : 'transparent',
                color: isActive ? 'white' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              <Icon size={14} color={isActive ? 'white' : ent.color} />
              {ent.name}
            </button>
          );
        })}
      </div>

      {/* Control bar + Search */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div className="glass-panel" style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '10px', flex: 1, border: '1px solid var(--glass-border)' }}>
          <Search size={16} color="var(--text-secondary)" />
          <input
            type="text"
            placeholder={`Search across ${activeEntity.name}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              width: '100%',
              padding: '8px 0',
              outline: 'none',
              fontSize: '0.9rem',
              fontFamily: 'inherit'
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <X size={14} />
            </button>
          )}
        </div>
        <span className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
          Showing {filteredRecords.length} / {records.length} records
        </span>
      </div>

      {/* Main Table Grid */}
      <div className="glass-panel" style={{ overflowX: 'auto', padding: '0 16px' }}>
        {loading && records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="animate-spin text-gradient" style={{ marginBottom: '12px' }} />
            <p>Fetching records from Data Fabric...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
            <AlertCircle size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
            <p style={{ fontWeight: 600 }}>No matching records found.</p>
            <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '4px' }}>Try adjusting your search query or refresh the registry.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase' }}>
                {columns.map(col => (
                  <th key={col.key} style={{ padding: '14px 12px' }}>{col.label}</th>
                ))}
                <th style={{ padding: '14px 12px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((rec, i) => (
                <tr
                  key={`${rec.id || rec.CaseRef || 'rec'}-${i}`}
                  style={{
                    borderBottom: '1px solid var(--glass-border)',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onClick={() => setSelectedRecord(rec)}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  {columns.map(col => (
                    <td key={col.key} style={{ padding: '14px 12px', fontSize: '0.875rem' }}>
                      {col.key === 'CaseRef' ? (
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-primary)' }}>
                          {String(rec[col.key]).substring(0, 8)}
                        </span>
                      ) : (
                        renderCell(col.key, rec[col.key])
                      )}
                    </td>
                  ))}
                  <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRecord(rec);
                      }}
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Drawer (Right Side Panel) */}
      {selectedRecord && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '460px',
            height: '100vh',
            background: 'var(--bg-secondary)',
            borderLeft: '1px solid var(--glass-border)',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: activeEntity.color + '15', color: activeEntity.color, textTransform: 'uppercase' }}>
                {activeEntity.name} Details
              </span>
              <h3 style={{ marginTop: '8px', fontSize: '1.1rem', fontFamily: 'monospace' }}>
                ID: {String(selectedRecord.id || selectedRecord.CaseRef || '').substring(0, 12)}
              </h3>
            </div>
            <button
              onClick={() => setSelectedRecord(null)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--glass-border)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-primary)'
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Details Scroll Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Quick Inspection Link */}
            {selectedRecord.CaseRef && (
              <div style={{ background: 'rgba(41, 69, 134, 0.04)', border: '1px solid rgba(41, 69, 134, 0.12)', borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Inspect Main Case</div>
                  <div className="text-secondary" style={{ fontSize: '0.78rem', marginTop: '2px', fontFamily: 'monospace' }}>
                    Ref: {selectedRecord.CaseRef}
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    onInspectCase(selectedRecord.CaseRef, 'mock-folder-key-guid');
                    setSelectedRecord(null);
                  }}
                  style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', gap: '6px', alignItems: 'center' }}
                >
                  <ExternalLink size={12} />
                  Open Case
                </button>
              </div>
            )}

            {/* List all properties */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {Object.entries(selectedRecord).map(([prop, val]) => {
                if (prop === 'id') return null;
                return (
                  <div key={prop} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)', paddingBottom: '10px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      {prop.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500, wordBreak: 'break-all' }}>
                      {typeof val === 'object' && val !== null ? (
                        <pre style={{ background: 'rgba(0,0,0,0.02)', padding: '8px', borderRadius: '6px', fontSize: '0.8rem', overflowX: 'auto', border: '1px solid var(--glass-border)', fontFamily: 'monospace' }}>
                          {JSON.stringify(val, null, 2)}
                        </pre>
                      ) : (
                        renderCell(prop, val)
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* CSS Animation injection */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

