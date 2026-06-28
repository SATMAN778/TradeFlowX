// HT-16 — Document Discrepancy (ImporterOps, 4 hrs)
import { useState } from 'react';
import type { HtFormProps } from '../../../types/task';
import { TaskFrame, FormRow, FormTextarea, DecisionBtn, InfoChip, useTaskSubmit } from './shared';

export const HT16_DocDiscrepancy = ({ task, onClose }: HtFormProps) => {
  const { submitTask } = useTaskSubmit();
  const inp = task.inputData as any;
  const [form, setForm] = useState({ correctionNotes: '' });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (outcome: string) => {
    setSubmitting(true);
    try { await submitTask(task.id, outcome, form, { caseId: task.caseId, taskCode: task.taskCode, stageId: task.stageId }); onClose(); }
    finally { setSubmitting(false); }
  };

  return (
    <TaskFrame title="Document Discrepancy Review" task={task} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <InfoChip label="Discrepancy Type" value={inp.discrepancyType || '—'} />
        <InfoChip label="Source Document" value={inp.sourceDocument || '—'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid #16a34a40', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#16a34a', marginBottom: '4px' }}>EXPECTED</div>
          <div style={{ fontWeight: 700 }}>{inp.expectedValue || '—'}</div>
        </div>
        <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid #dc262640', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ef4444', marginBottom: '4px' }}>ACTUAL</div>
          <div style={{ fontWeight: 700 }}>{inp.actualValue || '—'}</div>
        </div>
      </div>

      <FormRow label="Correction Notes">
        <FormTextarea value={form.correctionNotes} onChange={v => setForm(f => ({ ...f, correctionNotes: v }))} placeholder="Describe how the discrepancy was identified and what action was taken…" rows={4} />
      </FormRow>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <DecisionBtn label="Escalate to Finance" variant="danger" disabled={submitting} onClick={() => submit('EscalateToFinance')} />
        <DecisionBtn label="Accept Variance" variant="warning" disabled={submitting} onClick={() => submit('AcceptVariance')} />
        <DecisionBtn label="✓ Corrected" variant="primary" disabled={submitting} onClick={() => submit('Corrected')} />
      </div>
    </TaskFrame>
  );
};
