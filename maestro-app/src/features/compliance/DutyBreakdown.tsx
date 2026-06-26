// src/features/compliance/DutyBreakdown.tsx — MFN + Section 301 + ADD/CVD + MPF + HMF
import type { DutyCalculation } from '../../types/entities';

interface DutyBreakdownProps {
  duty: DutyCalculation;
}

const DutyRow = ({ label, amount, pct, highlight }: { label: string; amount?: number; pct?: number; highlight?: boolean }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 14px', borderRadius: '6px',
    background: highlight ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)',
    border: '1px solid var(--glass-border)',
  }}>
    <div>
      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{label}</div>
      {pct !== undefined && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{pct}% rate</div>}
    </div>
    <div style={{ fontWeight: 800, fontSize: '1rem', color: highlight ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
      {amount !== undefined ? `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
    </div>
  </div>
);

export const DutyBreakdown = ({ duty }: DutyBreakdownProps) => {
  const mfnAmount = duty.DeclaredValueUsd && duty.MfnRatePercent
    ? (duty.DeclaredValueUsd * duty.MfnRatePercent / 100) : undefined;
  const sec301Amount = duty.DeclaredValueUsd && duty.Section301Percent
    ? (duty.DeclaredValueUsd * duty.Section301Percent / 100) : undefined;
  const addcvdAmount = duty.DeclaredValueUsd && duty.AddCvdPercent
    ? (duty.DeclaredValueUsd * duty.AddCvdPercent / 100) : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '4px' }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>DECLARED VALUE</div>
          <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>
            {duty.DeclaredValueUsd ? `$${duty.DeclaredValueUsd.toLocaleString()}` : '—'}
          </div>
        </div>
        <div style={{ background: 'rgba(99,102,241,0.1)', borderRadius: '8px', padding: '12px', textAlign: 'center', border: '1px solid rgba(99,102,241,0.3)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>TOTAL DUTY</div>
          <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--accent-primary)' }}>
            {duty.TotalDutyUsd ? `$${duty.TotalDutyUsd.toLocaleString()}` : '—'}
          </div>
        </div>
      </div>

      <DutyRow label="MFN Duty" pct={duty.MfnRatePercent} amount={mfnAmount} />
      <DutyRow label="Section 301 Tariff" pct={duty.Section301Percent} amount={sec301Amount} />
      <DutyRow label="ADD/CVD" pct={duty.AddCvdPercent} amount={addcvdAmount} />
      <DutyRow label="MPF (Merch. Processing Fee)" amount={duty.MpfUsd} />
      <DutyRow label="HMF (Harbor Maintenance Fee)" amount={duty.HmfUsd} />
      <DutyRow label="Total Estimated Duty" amount={duty.TotalDutyUsd} highlight />

      {duty.ActualDutyUsd !== undefined && duty.ActualDutyUsd !== duty.TotalDutyUsd && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', marginTop: '4px',
          background: Math.abs((duty.VariancePct || 0)) > 5 ? 'rgba(220,38,38,0.1)' : 'rgba(22,163,74,0.1)',
          border: `1px solid ${Math.abs((duty.VariancePct || 0)) > 5 ? '#dc262640' : '#16a34a40'}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Actual Duty (CBP)</span>
            <span style={{ fontWeight: 800, color: Math.abs((duty.VariancePct || 0)) > 5 ? '#ef4444' : '#22c55e' }}>
              ${duty.ActualDutyUsd.toLocaleString()} ({duty.VariancePct !== undefined ? `${duty.VariancePct > 0 ? '+' : ''}${duty.VariancePct.toFixed(1)}%` : 'variance'})
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
