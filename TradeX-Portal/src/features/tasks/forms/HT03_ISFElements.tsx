// HT-03 — Collect Missing ISF Elements (CustomsBroker, 4 hrs)
import { useState } from 'react';
import type { HtFormProps } from '../../../types/task';
import { TaskFrame, FormRow, FormInput, DecisionBtn, SlaBadge, useTaskSubmit } from './shared';

const ISF_FIELDS = [
  'sellerNameAddress', 'buyerNameAddress', 'importerOfRecord', 'consigneeNameAddress',
  'manufacturerNameAddress', 'shipToParty', 'countryOfOrigin', 'htsCode',
  'containerStuffingLocation', 'consolidatorName',
];
const ISF_LABELS = [
  'Seller Name & Address', 'Buyer Name & Address', 'Importer of Record', 'Consignee Name & Address',
  "Manufacturer's Name & Address", 'Ship-To Party', 'Country of Origin', 'HTS Code',
  'Container Stuffing Location', 'Consolidator Name',
];

export const HT03_ISFElements = ({ task, onClose }: HtFormProps) => {
  const { submitTask } = useTaskSubmit();
  const inp = task.inputData as any;
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(ISF_FIELDS.map(f => [f, inp[f] || '']))
  );
  const [submitting, setSubmitting] = useState(false);

  const submit = async (outcome: string) => {
    setSubmitting(true);
    try { await submitTask(task.id, outcome, form, { caseId: task.caseId, taskCode: task.taskCode, stageId: task.stageId }); onClose(); }
    finally { setSubmitting(false); }
  };

  return (
    <TaskFrame title="Collect Missing ISF Elements" task={task} onClose={onClose}>
      {inp.missingElements?.length > 0 && (
        <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid #dc2626', borderRadius: '8px', padding: '12px', fontSize: '0.875rem' }}>
          <strong>Missing ISF elements:</strong> {(inp.missingElements as string[]).join(', ')}
        </div>
      )}
      {inp.isfDeadlineUtc && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SlaBadge deadline={inp.isfDeadlineUtc} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ISF 24-hr Pre-Departure Deadline</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {ISF_FIELDS.map((f, i) => (
          <FormRow key={f} label={ISF_LABELS[i]}>
            <FormInput value={form[f]} onChange={v => setForm(s => ({ ...s, [f]: v }))} placeholder={ISF_LABELS[i]} />
          </FormRow>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <DecisionBtn label="Escalate" variant="danger" disabled={submitting} onClick={() => submit('Escalate')} />
        <DecisionBtn label="Request From Carrier" variant="warning" disabled={submitting} onClick={() => submit('RequestFromCarrier')} />
        <DecisionBtn label="✓ Submit ISF" variant="primary" disabled={submitting} onClick={() => submit('SubmitISF')} />
      </div>
    </TaskFrame>
  );
};
