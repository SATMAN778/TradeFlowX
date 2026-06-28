// HT-18 — Duty Savings Opportunity (TradeCounsel, 5 days)
import { useState } from 'react';
import type { HtFormProps } from '../../../types/task';
import { TaskFrame, FormRow, FormTextarea, DecisionBtn, InfoChip, useTaskSubmit } from './shared';

export const HT18_DutySavings = ({ task, onClose }: HtFormProps) => {
  const { submitTask } = useTaskSubmit();
  const inp = task.inputData as any;
  const [form, setForm] = useState({ decisionNotes: '' });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (outcome: string) => {
    setSubmitting(true);
    try { await submitTask(task.id, outcome, form, { caseId: task.caseId, taskCode: task.taskCode, stageId: task.stageId }); onClose(); }
    finally { setSubmitting(false); }
  };

  return (
    <TaskFrame title="Duty Savings Opportunity" task={task} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <InfoChip label="Opportunity Type" value={inp.opportunityType || '—'} />
        <InfoChip label="Estimated Savings" value={inp.estimatedSavingsUsd ? <span style={{ color: '#22c55e', fontWeight: 800 }}>${Number(inp.estimatedSavingsUsd).toLocaleString()}</span> : '—'} />
      </div>

      {inp.counselRecommendation && (
        <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', padding: '14px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#818cf8', marginBottom: '6px', textTransform: 'uppercase' }}>Counsel Recommendation</div>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>{inp.counselRecommendation}</p>
        </div>
      )}

      <FormRow label="Decision Notes">
        <FormTextarea value={form.decisionNotes} onChange={v => setForm(f => ({ ...f, decisionNotes: v }))} placeholder="Document your decision rationale for the duty savings opportunity…" rows={5} />
      </FormRow>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <DecisionBtn label="Decline Savings" variant="secondary" disabled={submitting} onClick={() => submit('DeclineSavings')} />
        <DecisionBtn label="✓ Pursue Savings" variant="primary" disabled={submitting} onClick={() => submit('PursueSavings')} />
      </div>
    </TaskFrame>
  );
};
