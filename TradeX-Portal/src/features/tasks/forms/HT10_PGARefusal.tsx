// HT-10 — PGA Refusal (ComplianceOfficer+LegalCounsel, IMMEDIATE — full-screen alert)
import { useState } from 'react';
import type { HtFormProps } from '../../../types/task';
import { AlertModal, FormRow, FormTextarea, DecisionBtn, InfoChip, useTaskSubmit } from './shared';

export const HT10_PGARefusal = ({ task, onClose }: HtFormProps) => {
  const { submitTask } = useTaskSubmit();
  const inp = task.inputData as any;
  const [form, setForm] = useState({ dispositionDecision: '', legalHoldNotes: '' });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (outcome: string) => {
    if (!form.legalHoldNotes) {
      alert('Legal hold notes are mandatory before proceeding.');
      return;
    }
    setSubmitting(true);
    try { await submitTask(task.id, outcome, form, { caseId: task.caseId, taskCode: task.taskCode, stageId: task.stageId }); onClose(); }
    finally { setSubmitting(false); }
  };

  return (
    <AlertModal title="🚨 PGA REFUSAL — Immediate Action Required" subtitle="Partner Government Agency has refused the shipment. Legal counsel and compliance officer must decide disposition.">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <InfoChip label="Agency" value={inp.agencyName || '—'} />
        <InfoChip label="Refusal Reason" value={inp.refusalReason || '—'} />
        <InfoChip label="HTS Code" value={inp.htsCode || '—'} />
        <InfoChip label="Shipment Value" value={inp.shipmentValueUsd ? `$${Number(inp.shipmentValueUsd).toLocaleString()}` : '—'} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
        <FormRow label="Legal Hold Notes *">
          <FormTextarea value={form.legalHoldNotes} onChange={set('legalHoldNotes')} placeholder="Document the legal basis for the disposition decision…" rows={4} />
        </FormRow>
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <DecisionBtn label="Re-Export Shipment" variant="warning" disabled={submitting} onClick={() => submit('ReExport')} />
        <DecisionBtn label="Request Destruction" variant="danger" disabled={submitting} onClick={() => submit('RequestDestruction')} />
        <DecisionBtn label="Appeal Refusal" variant="primary" disabled={submitting} onClick={() => submit('AppealRefusal')} />
      </div>
    </AlertModal>
  );
};
