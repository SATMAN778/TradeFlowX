// src/features/cases/CaseHeader.tsx — 17-field header bar; status badges
import { Package, Globe, DollarSign, Clock, Ship } from 'lucide-react';
import type { ImportCaseRecord } from '../../types/entities';

interface CaseHeaderProps {
  caseRecord: Partial<ImportCaseRecord>;
  instanceId?: string;
}

const Badge = ({ label, variant }: { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'muted' }) => {
  const colors = {
    success: { bg: 'rgba(22,163,74,0.15)', color: '#22c55e', border: '#16a34a40' },
    warning: { bg: 'rgba(217,119,6,0.15)',  color: '#d97706', border: '#d9770640' },
    danger:  { bg: 'rgba(220,38,38,0.15)',  color: '#ef4444', border: '#dc262640' },
    info:    { bg: 'rgba(99,102,241,0.15)', color: '#818cf8', border: 'rgba(99,102,241,0.4)' },
    muted:   { bg: 'rgba(255,255,255,0.07)', color: 'var(--text-secondary)', border: 'var(--glass-border)' },
  };
  const c = colors[variant];
  return (
    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '6px', background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {label}
    </span>
  );
};

const statusToVariant = (status?: string): 'success' | 'warning' | 'danger' | 'info' | 'muted' => {
  const s = (status || '').toUpperCase();
  if (['ACTIVE', 'RELEASED', 'COMPLETED'].includes(s)) return 'success';
  if (['PENDING', 'PROCESSING', 'IN_REVIEW'].includes(s)) return 'warning';
  if (['HOLD', 'BLOCKED', 'REFUSED', 'FAULTED'].includes(s)) return 'danger';
  if (['EXAM', 'PGA_HOLD'].includes(s)) return 'info';
  return 'muted';
};

const Field = ({ icon: Icon, label, value }: { icon?: any; label: string; value?: string | number }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '110px' }}>
    <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
      {Icon && <Icon size={10} />}{label}
    </div>
    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{value || '—'}</div>
  </div>
);

export const CaseHeader = ({ caseRecord, instanceId }: CaseHeaderProps) => {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)',
      borderRadius: '12px', padding: '18px 20px',
    }}>
      {/* Top row: case ref + status badges */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={18} color="var(--accent-primary)" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{caseRecord.PoNumber || instanceId?.substring(0, 12) || 'New Case'}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{instanceId || caseRecord.CaseRef}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <Badge label={caseRecord.CaseState || 'ACTIVE'} variant={statusToVariant(caseRecord.CaseState)} />
          <Badge label={`Stage: ${caseRecord.CurrentStage || 'S1'}`} variant="info" />
          {caseRecord.CbpStatus && <Badge label={`CBP: ${caseRecord.CbpStatus}`} variant={statusToVariant(caseRecord.CbpStatus)} />}
          {caseRecord.PgaFlag && <Badge label="PGA FLAG" variant="warning" />}
        </div>
      </div>

      {/* Field grid */}
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <Field icon={Package} label="Importer" value={caseRecord.ImporterName} />
        <Field icon={Globe} label="Supplier" value={caseRecord.SupplierName} />
        <Field icon={Ship} label="Port of Entry" value={caseRecord.PortOfEntry} />
        <Field icon={Globe} label="Country of Origin" value={caseRecord.CountryOfOrigin} />
        <Field label="HTS Code" value={caseRecord.HtsCode} />
        <Field icon={DollarSign} label="Total Value" value={caseRecord.TotalValueUsd ? `$${caseRecord.TotalValueUsd.toLocaleString()}` : undefined} />
        <Field icon={DollarSign} label="Duty Amount" value={caseRecord.DutyAmountUsd ? `$${caseRecord.DutyAmountUsd.toLocaleString()}` : undefined} />
        <Field label="CBP Entry #" value={caseRecord.CbpEntryNumber} />
        {caseRecord.SlaDeadline && (
          <Field icon={Clock} label="SLA Deadline" value={new Date(caseRecord.SlaDeadline).toLocaleString()} />
        )}
      </div>
    </div>
  );
};
