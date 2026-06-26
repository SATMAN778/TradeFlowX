import React from 'react';
import { ShoppingCart, FileText, BarChart2, Building, Shield, Anchor, Archive, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import type { ImportCaseRecord, IsfFilingRecord, OfacScreeningRecord, DutyCalculation } from '../../types/entities';
import { ISFElementsPanel } from '../compliance/ISFElementsPanel';
import { OFACPartyTable } from '../compliance/OFACPartyTable';
import { DutyBreakdown } from '../compliance/DutyBreakdown';

const StagePanel = ({ icon: Icon, title, badge, children }: {
  icon: any; title: string; badge?: string; children: React.ReactNode;
}) => (
  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '12px', overflow: 'hidden' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={16} color="var(--accent-primary)" />
      </div>
      <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, flex: 1 }}>{title}</h3>
      {badge && <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(99,102,241,0.15)', color: 'var(--accent-primary)' }}>{badge}</span>}
    </div>
    <div style={{ padding: '18px' }}>{children}</div>
  </div>
);

const Field = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{label}</span>
    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{value ?? '—'}</span>
  </div>
);

// ─── S1: Order Intake ────────────────────────────────────────────────────────
export const S1_OrderIntake = ({ caseRecord }: { caseRecord: Partial<ImportCaseRecord> }) => (
  <StagePanel icon={ShoppingCart} title="S1 — Order Intake & PO Validation" badge="ERP Integration">
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
      <Field label="PO Number" value={caseRecord.PoNumber} />
      <Field label="Importer" value={caseRecord.ImporterName} />
      <Field label="Supplier" value={caseRecord.SupplierName} />
      <Field label="Country of Origin" value={caseRecord.CountryOfOrigin} />
      <Field label="Total Value (USD)" value={caseRecord.TotalValueUsd ? `$${caseRecord.TotalValueUsd.toLocaleString()}` : undefined} />
      <Field label="Port of Entry" value={caseRecord.PortOfEntry} />
      <Field label="HTS Code" value={caseRecord.HtsCode} />
      <Field label="Case State" value={caseRecord.CaseState} />
    </div>
    {caseRecord.SlaDeadline && (
      <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
        <Clock size={13} />
        SLA Deadline: <strong>{new Date(caseRecord.SlaDeadline).toLocaleString()}</strong>
      </div>
    )}
  </StagePanel>
);

// ─── S2: ISF Filing ──────────────────────────────────────────────────────────
export const S2_ISF = ({ isf }: { isf?: IsfFilingRecord }) => (
  <StagePanel icon={FileText} title="S2 — ISF 10+2 Filing" badge="24-hr SLA">
    {isf ? (
      <ISFElementsPanel isf={isf} />
    ) : (
      <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '24px', fontSize: '0.875rem' }}>
        <FileText size={32} style={{ marginBottom: '8px', opacity: 0.3 }} />
        <p>No ISF filing record found for this case.</p>
      </div>
    )}
  </StagePanel>
);

// ─── S3: HTS & Duty ─────────────────────────────────────────────────────────
export const S3_HTS = ({ duty, htsCode }: { duty?: DutyCalculation; htsCode?: string }) => (
  <StagePanel icon={BarChart2} title="S3 — HTS Classification & Duty Calculation" badge="AI + Manual">
    {duty ? (
      <DutyBreakdown duty={duty} />
    ) : (
      <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '24px' }}>
        <BarChart2 size={32} style={{ marginBottom: '8px', opacity: 0.3 }} />
        <p style={{ fontSize: '0.875rem' }}>HTS code: <strong>{htsCode || '—'}</strong></p>
        <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Duty calculation pending</p>
      </div>
    )}
  </StagePanel>
);

// ─── S4: PGA Review ─────────────────────────────────────────────────────────
export const S4_PGA = ({ caseRecord }: { caseRecord: Partial<ImportCaseRecord> }) => {
  if (!caseRecord.PgaFlag) {
    return (
      <StagePanel icon={Building} title="S4 — PGA Compliance" badge="Not Triggered">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#22c55e', padding: '8px' }}>
          <CheckCircle2 size={20} />
          <span style={{ fontWeight: 600 }}>No Partner Government Agency review required for this shipment.</span>
        </div>
      </StagePanel>
    );
  }
  return (
    <StagePanel icon={Building} title="S4 — PGA Compliance Review" badge="⚠️ PGA TRIGGERED">
      <div style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid #d9770640', borderRadius: '8px', padding: '14px', display: 'flex', gap: '10px' }}>
        <AlertTriangle size={20} color="#d97706" />
        <div>
          <div style={{ fontWeight: 700, color: '#d97706' }}>PGA Hold Active</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            One or more Partner Government Agencies have flagged this shipment for additional compliance review.
          </div>
        </div>
      </div>
    </StagePanel>
  );
};

// ─── S5: OFAC Screening ─────────────────────────────────────────────────────
export const S5_OFAC = ({ ofacRecords }: { ofacRecords: OfacScreeningRecord[] }) => {
  const hits = ofacRecords.filter(r => r.MatchResult === 'CONFIRMED_HIT');
  const fuzzy = ofacRecords.filter(r => r.MatchResult === 'FUZZY_MATCH');
  return (
    <StagePanel icon={Shield} title="S5 — OFAC Party Screening">
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(22,163,74,0.1)', border: '1px solid #16a34a30' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Clear</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#22c55e' }}>{ofacRecords.filter(r => r.MatchResult === 'CLEAR').length}</span>
        </div>
        {fuzzy.length > 0 && (
          <div style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(217,119,6,0.1)', border: '1px solid #d9770640' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Fuzzy Match</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#d97706' }}>{fuzzy.length}</span>
          </div>
        )}
        {hits.length > 0 && (
          <div style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(220,38,38,0.15)', border: '1px solid #dc262640' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Confirmed Hit</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ef4444' }}>{hits.length}</span>
          </div>
        )}
      </div>
      <OFACPartyTable records={ofacRecords} />
    </StagePanel>
  );
};

// ─── S6: Customs Entry ──────────────────────────────────────────────────────
export const S6_CustomsEntry = ({ caseRecord }: { caseRecord: Partial<ImportCaseRecord> }) => (
  <StagePanel icon={Anchor} title="S6 — Customs Entry & CBP Release">
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
      <Field label="CBP Entry Number" value={caseRecord.CbpEntryNumber} />
      <Field label="CBP Status" value={caseRecord.CbpStatus} />
      <Field label="Port of Entry" value={caseRecord.PortOfEntry} />
    </div>
    {caseRecord.CbpStatus === 'EXAM' && (
      <div style={{ marginTop: '14px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', padding: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <AlertTriangle size={18} color="#818cf8" />
        <span style={{ fontSize: '0.875rem', color: '#818cf8', fontWeight: 600 }}>CBP Exam Selected — Port agent coordination required</span>
      </div>
    )}
  </StagePanel>
);

// ─── S7: Post-Entry ─────────────────────────────────────────────────────────
export const S7_PostEntry = ({
  caseRecord, onUploadClick
}: { caseRecord: Partial<ImportCaseRecord>; onUploadClick?: () => void }) => (
  <StagePanel icon={Archive} title="S7 — Post-Entry & Document Retention">
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
        Review final duty reconciliation, document archival status, and protest deadlines.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px' }}>
        <Field label="Duty Amount (USD)" value={caseRecord.DutyAmountUsd ? `$${caseRecord.DutyAmountUsd.toLocaleString()}` : undefined} />
        <Field label="Case State" value={caseRecord.CaseState} />
      </div>
      {onUploadClick && (
        <button onClick={onUploadClick}
          style={{ padding: '10px 18px', background: 'var(--accent-primary)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 600, cursor: 'pointer', width: 'fit-content', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Archive size={15} /> Upload Archival Documents
        </button>
      )}
    </div>
  </StagePanel>
);
