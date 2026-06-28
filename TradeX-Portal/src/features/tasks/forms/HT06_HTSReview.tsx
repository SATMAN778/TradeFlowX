// HT-06 — HTS Review 70–90% Confidence (CustomsBroker, 4 hrs)
import { useState } from 'react';
import type { HtFormProps } from '../../../types/task';
import { TaskFrame, FormRow, FormInput, FormTextarea, DecisionBtn, useTaskSubmit } from './shared';

export const HT06_HTSReview = ({ task, onClose }: HtFormProps) => {
  const { submitTask } = useTaskSubmit();
  const inp = task.inputData as any;
  const candidates: Array<{ htsCode: string; confidence: number; citation: string }> = inp.aiHtsCandidates || [];
  const [form, setForm] = useState({ confirmedHtsCode: inp.topCandidate || '', brokerNotes: '' });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (outcome: string) => {
    setSubmitting(true);
    try { await submitTask(task.id, outcome, form, { caseId: task.caseId, taskCode: task.taskCode, stageId: task.stageId }); onClose(); }
    finally { setSubmitting(false); }
  };

  return (
    <TaskFrame title="HTS Code Review — AI Confidence 70–90%" task={task} onClose={onClose}>
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
        <strong>Product:</strong> {inp.productDescription || '—'}
      </p>

      {/* AI candidates */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>AI Candidates</div>
        {candidates.map((c, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '10px 14px', border: '1px solid var(--glass-border)', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem' }}>{c.htsCode}</span>
            <div style={{ flex: 1 }}>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${c.confidence}%`, background: c.confidence > 85 ? '#16a34a' : c.confidence > 70 ? '#d97706' : '#dc2626', borderRadius: '3px' }} />
              </div>
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{c.confidence}%</span>
            {c.citation && <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{c.citation}</span>}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
        <FormRow label="Confirmed HTS Code">
          <FormInput value={form.confirmedHtsCode} onChange={set('confirmedHtsCode')} placeholder="e.g. 8471.30.01" />
        </FormRow>
        <FormRow label="Broker Notes">
          <FormTextarea value={form.brokerNotes} onChange={set('brokerNotes')} placeholder="Rationale for your decision…" />
        </FormRow>
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <DecisionBtn label="Escalate to Specialist" variant="warning" disabled={submitting} onClick={() => submit('EscalateToSpecialist')} />
        <DecisionBtn label="Override with Manual" variant="secondary" disabled={submitting} onClick={() => submit('OverrideWithManual')} />
        <DecisionBtn label="✓ Confirm AI Suggestion" variant="primary" disabled={submitting} onClick={() => submit('ConfirmAISuggestion')} />
      </div>
    </TaskFrame>
  );
};
