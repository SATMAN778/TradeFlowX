// HT-07 — Manual HTS Classification <70% (ClassificationSpecialist, 8 hrs)
import { useState } from 'react';
import type { HtFormProps } from '../../../types/task';
import { TaskFrame, FormRow, FormInput, FormTextarea, DecisionBtn, useTaskSubmit } from './shared';

export const HT07_HTSManual = ({ task, onClose }: HtFormProps) => {
  const { submitTask } = useTaskSubmit();
  const inp = task.inputData as any;
  const [form, setForm] = useState({ manualHtsCode: '', classificationBasis: '', rulingCitationUsed: '' });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (outcome: string) => {
    setSubmitting(true);
    try { await submitTask(task.id, outcome, form, { caseId: task.caseId, taskCode: task.taskCode, stageId: task.stageId }); onClose(); }
    finally { setSubmitting(false); }
  };

  const candidates: any[] = inp.aiHtsCandidates || [];

  return (
    <TaskFrame title="Manual HTS Classification Required" task={task} onClose={onClose}>
      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
        AI confidence below 70% — specialist manual classification required.<br />
        <strong>Product:</strong> {inp.productDescription || '—'}
      </p>

      {candidates.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', border: '1px solid var(--glass-border)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>AI Reference (Low Confidence)</div>
          {candidates.slice(0, 3).map((c: any, i: number) => (
            <div key={i} style={{ fontSize: '0.85rem', padding: '4px 0', opacity: 0.6 }}>
              {c.htsCode} — {c.confidence}% confidence
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <FormRow label="Manual HTS Code">
          <FormInput value={form.manualHtsCode} onChange={set('manualHtsCode')} placeholder="e.g. 8471.30.0100" />
        </FormRow>
        <FormRow label="Ruling Citation Used">
          <FormInput value={form.rulingCitationUsed} onChange={set('rulingCitationUsed')} placeholder="NY H12345 / HQ 123456" />
        </FormRow>
      </div>
      <FormRow label="Classification Basis">
        <FormTextarea value={form.classificationBasis} onChange={set('classificationBasis')} placeholder="Explain the GRI rules applied and basis for classification…" rows={4} />
      </FormRow>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <DecisionBtn label="Request Binding Ruling" variant="warning" disabled={submitting} onClick={() => submit('RequestBindingRuling')} />
        <DecisionBtn label="✓ Submit HTS" variant="primary" disabled={submitting} onClick={() => submit('SubmitHTS')} />
      </div>
    </TaskFrame>
  );
};
