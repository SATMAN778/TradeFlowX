// HT-08 — COO Documentation Required (ComplianceOfficer, 24 hrs)
import { useState } from 'react';
import type { HtFormProps } from '../../../types/task';
import { TaskFrame, FormRow, FormSelect, FormTextarea, DecisionBtn, InfoChip, useTaskSubmit } from './shared';

export const HT08_COODocs = ({ task, onClose }: HtFormProps) => {
  const { submitTask } = useTaskSubmit();
  const inp = task.inputData as any;
  const [form, setForm] = useState({ cooDocType: '', substantialTransformationEvidence: '', documentUploaded: 'false' });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (outcome: string) => {
    setSubmitting(true);
    try { await submitTask(task.id, outcome, form, { caseId: task.caseId, taskCode: task.taskCode, stageId: task.stageId }); onClose(); }
    finally { setSubmitting(false); }
  };

  return (
    <TaskFrame title="COO Documentation Required" task={task} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        <InfoChip label="Declared COO" value={inp.declaredCoo || '—'} />
        <InfoChip label="Supplier" value={inp.supplierName || '—'} />
        <InfoChip label="Transshipment Risk" value={inp.transshipmentRisk || 'Low'} />
      </div>

      <FormRow label="COO Document Type">
        <FormSelect value={form.cooDocType} onChange={set('cooDocType')} options={[
          { value: 'gsp_form_a', label: 'GSP Form A' },
          { value: 'certificate_of_origin', label: 'Certificate of Origin' },
          { value: 'manufacturer_declaration', label: "Manufacturer's Declaration" },
          { value: 'cbp_ruling', label: 'CBP Binding Ruling' },
        ]} />
      </FormRow>
      <FormRow label="Substantial Transformation Evidence">
        <FormTextarea value={form.substantialTransformationEvidence} onChange={set('substantialTransformationEvidence')} placeholder="Describe the substantial transformation evidence provided…" />
      </FormRow>
      <FormRow label="Document Uploaded?">
        <FormSelect value={form.documentUploaded} onChange={set('documentUploaded')} options={[
          { value: 'true', label: 'Yes — uploaded' }, { value: 'false', label: 'No' }
        ]} />
      </FormRow>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <DecisionBtn label="Escalate Legal" variant="danger" disabled={submitting} onClick={() => submit('EscalateLegal')} />
        <DecisionBtn label="Reject Transshipment" variant="danger" disabled={submitting} onClick={() => submit('RejectTransshipment')} />
        <DecisionBtn label="✓ Documents Submitted" variant="primary" disabled={submitting} onClick={() => submit('DocumentsSubmitted')} />
      </div>
    </TaskFrame>
  );
};
