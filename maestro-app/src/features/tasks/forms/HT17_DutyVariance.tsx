// HT-17 — Duty Variance Review (Finance, 2 days)
import { useState } from 'react';
import type { HtFormProps } from '../../../types/task';
import { TaskFrame, FormRow, FormInput, FormTextarea, DecisionBtn, InfoChip, useTaskSubmit } from './shared';

export const HT17_DutyVariance = ({ task, onClose }: HtFormProps) => {
  const { submitTask } = useTaskSubmit();
  const inp = task.inputData as any;
  const variancePct: number = inp.variancePct || 0;
  const isAboveThreshold = Math.abs(variancePct) > 5;
  const [form, setForm] = useState({ approvalNotes: '', glPostingRef: '' });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (outcome: string) => {
    setSubmitting(true);
    try { await submitTask(task.id, outcome, form, { caseId: task.caseId, taskCode: task.taskCode, stageId: task.stageId }); onClose(); }
    finally { setSubmitting(false); }
  };

  return (
    <TaskFrame title="Duty Variance Review" task={task} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        <InfoChip label="HTS Code" value={inp.htsCode || '—'} />
        <InfoChip label="Variance %" value={<span style={{ color: isAboveThreshold ? '#ef4444' : '#16a34a' }}>{variancePct > 0 ? '+' : ''}{variancePct}%</span>} />
        <InfoChip label="Variance (USD)" value={`$${Math.abs(inp.varianceUsd || 0).toLocaleString()}`} />
      </div>

      {/* Side-by-side estimated vs actual */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '16px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '8px' }}>ESTIMATED DUTY</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
            ${Number(inp.estimatedDutyUsd || 0).toLocaleString()}
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '16px', border: `1px solid ${isAboveThreshold ? '#dc262640' : '#16a34a40'}`, textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '8px' }}>ACTUAL DUTY</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: isAboveThreshold ? '#ef4444' : '#22c55e' }}>
            ${Number(inp.actualDutyUsd || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {isAboveThreshold && (
        <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid #dc262640', borderRadius: '8px', padding: '10px 14px', fontSize: '0.875rem', color: '#ef4444', fontWeight: 600 }}>
          ⚠️ Variance exceeds 5% threshold — investigation required before approval.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <FormRow label="Approval Notes">
          <FormTextarea value={form.approvalNotes} onChange={set('approvalNotes')} placeholder="Finance approval rationale…" rows={3} />
        </FormRow>
        <FormRow label="GL Posting Reference">
          <FormInput value={form.glPostingRef} onChange={set('glPostingRef')} placeholder="GL-2024-XXXX" />
        </FormRow>
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <DecisionBtn label="Investigate Variance" variant="warning" disabled={submitting} onClick={() => submit('InvestigateVariance')} />
        <DecisionBtn label="✓ Approve Variance" variant="primary" disabled={submitting} onClick={() => submit('ApproveVariance')} />
      </div>
    </TaskFrame>
  );
};
