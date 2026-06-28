// HT-05 — ISF Material Amendment (CustomsBroker, 2 hrs)
import { useState } from 'react';
import type { HtFormProps } from '../../../types/task';
import { TaskFrame, FormRow, FormInput, FormTextarea, DecisionBtn, InfoChip, useTaskSubmit } from './shared';

export const HT05_ISFAmendment = ({ task, onClose }: HtFormProps) => {
  const { submitTask } = useTaskSubmit();
  const inp = task.inputData as any;
  const [form, setForm] = useState({ amendmentReason: '', changedFields: '' });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (outcome: string) => {
    setSubmitting(true);
    try { await submitTask(task.id, outcome, { ...form, changedFields: form.changedFields.split(',').map(s => s.trim()) }, { caseId: task.caseId, taskCode: task.taskCode, stageId: task.stageId }); onClose(); }
    finally { setSubmitting(false); }
  };

  return (
    <TaskFrame title="ISF Material Amendment Required" task={task} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        <InfoChip label="B/L Number" value={inp.blNumber || '—'} />
        <InfoChip label="Discrepancy Type" value={inp.discrepancyType || '—'} />
        <InfoChip label="Discrepancy Detail" value={inp.discrepancyDetail || '—'} />
      </div>

      <FormRow label="Amendment Reason">
        <FormTextarea value={form.amendmentReason} onChange={set('amendmentReason')} placeholder="Explain why the ISF amendment is required…" />
      </FormRow>
      <FormRow label="Changed Fields (comma-separated)">
        <FormInput value={form.changedFields} onChange={set('changedFields')} placeholder="shipper name, HTS code, country of origin" />
      </FormRow>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <DecisionBtn label="Hold for Review" variant="warning" disabled={submitting} onClick={() => submit('HoldForReview')} />
        <DecisionBtn label="✓ Amend & Resubmit" variant="primary" disabled={submitting} onClick={() => submit('AmendAndResubmit')} />
      </div>
    </TaskFrame>
  );
};
