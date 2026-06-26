// HT-04 — ISF Do Not Load (CustomsBroker+LegalCounsel, IMMEDIATE — full-screen alert)
import { useState } from 'react';
import type { HtFormProps } from '../../../types/task';
import { AlertModal, FormRow, FormInput, FormTextarea, DecisionBtn, InfoChip, useTaskSubmit } from './shared';

export const HT04_ISFDoNotLoad = ({ task, onClose }: HtFormProps) => {
  const { submitTask } = useTaskSubmit();
  const inp = task.inputData as any;
  const [form, setForm] = useState({ correctionSummary: '', actionTaken: '' });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (outcome: string) => {
    if (!form.correctionSummary && !form.actionTaken) {
      alert('You must enter correction summary and action taken before proceeding.');
      return;
    }
    setSubmitting(true);
    try { await submitTask(task.id, outcome, form, { caseId: task.caseId, taskCode: task.taskCode, stageId: task.stageId }); onClose(); }
    finally { setSubmitting(false); }
  };

  return (
    <AlertModal title="🚨 ISF DO NOT LOAD Received" subtitle="CBP has issued a Do Not Load order. Immediate action required — shipment cannot depart until resolved.">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <InfoChip label="ISF Txn #" value={inp.isfTxnNumber || '—'} />
        <InfoChip label="Error Code" value={inp.errorCode || '—'} />
        <InfoChip label="Error Detail" value={inp.errorDetail || '—'} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
        <FormRow label="Correction Summary *">
          <FormTextarea value={form.correctionSummary} onChange={set('correctionSummary')} placeholder="Describe what was corrected in the ISF filing…" rows={3} />
        </FormRow>
        <FormRow label="Action Taken *">
          <FormInput value={form.actionTaken} onChange={set('actionTaken')} placeholder="e.g. Amended shipper name in ACE portal and resubmitted" />
        </FormRow>
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <DecisionBtn label="✓ Corrected & Resubmitted" variant="primary" disabled={submitting} onClick={() => submit('CorrectedAndResubmitted')} />
        <DecisionBtn label="Hold Shipment" variant="danger" disabled={submitting} onClick={() => submit('HoldShipment')} />
        <DecisionBtn label="Escalate Legal" variant="warning" disabled={submitting} onClick={() => submit('EscalateLegal')} />
      </div>
    </AlertModal>
  );
};
