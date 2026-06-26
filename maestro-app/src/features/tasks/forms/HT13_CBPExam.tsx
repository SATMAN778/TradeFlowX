// HT-13 — CBP Exam Selected (PortAgent, 4 hrs)
import { useState } from 'react';
import type { HtFormProps } from '../../../types/task';
import { TaskFrame, FormRow, FormInput, DecisionBtn, InfoChip, useTaskSubmit } from './shared';

export const HT13_CBPExam = ({ task, onClose }: HtFormProps) => {
  const { submitTask } = useTaskSubmit();
  const inp = task.inputData as any;
  const [form, setForm] = useState({ portAgentContact: '', examLocation: '', estimatedDurationHrs: '' });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (outcome: string) => {
    setSubmitting(true);
    try { await submitTask(task.id, outcome, form, { caseId: task.caseId, taskCode: task.taskCode, stageId: task.stageId }); onClose(); }
    finally { setSubmitting(false); }
  };

  return (
    <TaskFrame title="CBP Exam Selected — Port Agent Notification" task={task} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <InfoChip label="Exam Type" value={inp.examType || '—'} />
        <InfoChip label="Port of Entry" value={inp.portOfEntry || '—'} />
        <InfoChip label="Entry Number" value={inp.entryNumber || '—'} />
        <InfoChip label="Containers" value={(inp.containerNumbers || []).join(', ') || '—'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
        <FormRow label="Port Agent Contact">
          <FormInput value={form.portAgentContact} onChange={set('portAgentContact')} placeholder="Name / phone" />
        </FormRow>
        <FormRow label="Exam Location">
          <FormInput value={form.examLocation} onChange={set('examLocation')} placeholder="Pier 400, Terminal B" />
        </FormRow>
        <FormRow label="Estimated Duration (hrs)">
          <FormInput value={form.estimatedDurationHrs} onChange={set('estimatedDurationHrs')} placeholder="4" />
        </FormRow>
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <DecisionBtn label="Request Clarification" variant="warning" disabled={submitting} onClick={() => submit('RequestClarification')} />
        <DecisionBtn label="✓ Acknowledged" variant="primary" disabled={submitting} onClick={() => submit('Acknowledged')} />
      </div>
    </TaskFrame>
  );
};
