// HT-02 — Verify True Country of Origin (ComplianceOfficer, 4 hrs)
import { useState } from 'react';
import type { HtFormProps } from '../../../types/task';
import { TaskFrame, FormRow, FormTextarea, FormSelect, DecisionBtn, InfoChip, useTaskSubmit } from './shared';

export const HT02_VerifyCOO = ({ task, onClose }: HtFormProps) => {
  const { submitTask } = useTaskSubmit();
  const inp = task.inputData as any;
  const [form, setForm] = useState({ cooVerified: '', cooEvidenceType: '', substantialTransformationConfirmed: '', notes: '', documentUploaded: 'false' });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (outcome: string) => {
    setSubmitting(true);
    try { await submitTask(task.id, outcome, form, { caseId: task.caseId, taskCode: task.taskCode, stageId: task.stageId }); onClose(); }
    finally { setSubmitting(false); }
  };

  return (
    <TaskFrame title="Verify True Country of Origin" task={task} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        <InfoChip label="Declared COO" value={inp.cooDecl || '—'} />
        <InfoChip label="Supplier Zone" value={inp.supplierZone || '—'} />
        <InfoChip label="Transshipment Flag" value={inp.transshipmentFlag ? '⚠️ YES' : '✅ No'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <FormRow label="COO Verified">
          <FormSelect value={form.cooVerified} onChange={set('cooVerified')} options={[
            { value: 'confirmed', label: '✅ Confirmed' }, { value: 'rejected', label: '❌ Rejected' }, { value: 'pending_docs', label: '⏳ Pending Documents' }
          ]} />
        </FormRow>
        <FormRow label="Evidence Type">
          <FormSelect value={form.cooEvidenceType} onChange={set('cooEvidenceType')} options={[
            { value: 'certificate_of_origin', label: 'Certificate of Origin' },
            { value: 'manufacturer_affidavit', label: "Manufacturer's Affidavit" },
            { value: 'bills_of_material', label: 'Bills of Material' },
            { value: 'cbp_ruling', label: 'CBP Binding Ruling' },
          ]} />
        </FormRow>
        <FormRow label="Substantial Transformation">
          <FormSelect value={form.substantialTransformationConfirmed} onChange={set('substantialTransformationConfirmed')} options={[
            { value: 'yes', label: 'Yes — confirmed' }, { value: 'no', label: 'No' }, { value: 'na', label: 'N/A' }
          ]} />
        </FormRow>
        <FormRow label="Document Uploaded">
          <FormSelect value={form.documentUploaded} onChange={set('documentUploaded')} options={[
            { value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }
          ]} />
        </FormRow>
      </div>

      <FormRow label="Notes">
        <FormTextarea value={form.notes} onChange={set('notes')} placeholder="Add verification notes…" rows={3} />
      </FormRow>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <DecisionBtn label="Request Documents" variant="warning" disabled={submitting} onClick={() => submit('RequestDocuments')} />
        <DecisionBtn label="Reject Shipment" variant="danger" disabled={submitting} onClick={() => submit('RejectShipment')} />
        <DecisionBtn label="✓ Confirm COO" variant="primary" disabled={submitting} onClick={() => submit('ConfirmCOO')} />
      </div>
    </TaskFrame>
  );
};
