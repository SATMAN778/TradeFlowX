// HT-09 — PGA May Hold (CustomsBroker, 4 hrs)
import { useState } from 'react';
import type { HtFormProps } from '../../../types/task';
import { TaskFrame, FormRow, FormInput, FormTextarea, DecisionBtn, InfoChip, useTaskSubmit } from './shared';

export const HT09_PGAHold = ({ task, onClose }: HtFormProps) => {
  const { submitTask } = useTaskSubmit();
  const inp = task.inputData as any;
  const [form, setForm] = useState({ actionTaken: '', permitUploaded: 'false', permitNumber: '' });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (outcome: string) => {
    setSubmitting(true);
    try { await submitTask(task.id, outcome, form, { caseId: task.caseId, taskCode: task.taskCode, stageId: task.stageId }); onClose(); }
    finally { setSubmitting(false); }
  };

  return (
    <TaskFrame title="PGA May Hold — Action Required" task={task} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <InfoChip label="Agency" value={inp.agencyName || '—'} />
        <InfoChip label="Hold Reason" value={inp.holdReason || '—'} />
        <InfoChip label="Port Arrival ETA" value={inp.portArrivalEta || '—'} />
        <InfoChip label="Required Documents" value={(inp.requiredDocuments || []).join(', ') || 'None'} />
      </div>

      <FormRow label="Action Taken">
        <FormTextarea value={form.actionTaken} onChange={set('actionTaken')} placeholder="Describe the action taken to address the PGA hold…" />
      </FormRow>
      <FormRow label="Permit Number (if applicable)">
        <FormInput value={form.permitNumber} onChange={set('permitNumber')} placeholder="Permit or license number" />
      </FormRow>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <DecisionBtn label="Escalate Compliance" variant="danger" disabled={submitting} onClick={() => submit('EscalateCompliance')} />
        <DecisionBtn label="Request Extension" variant="warning" disabled={submitting} onClick={() => submit('RequestExtension')} />
        <DecisionBtn label="✓ Documents Submitted" variant="primary" disabled={submitting} onClick={() => submit('DocumentsSubmitted')} />
      </div>
    </TaskFrame>
  );
};
