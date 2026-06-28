// HT-12 — Confirmed OFAC/DPL Hit (LegalCounsel+Management, IMMEDIATE — full-screen red alert)
import { useState } from 'react';
import type { HtFormProps } from '../../../types/task';
import { AlertModal, FormRow, FormTextarea, DecisionBtn, InfoChip, useTaskSubmit } from './shared';

export const HT12_OFACHit = ({ task, onClose }: HtFormProps) => {
  const { submitTask } = useTaskSubmit();
  const inp = task.inputData as any;
  const [form, setForm] = useState({ legalHoldReason: '', reportingObligation: '' });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (outcome: string) => {
    if (!form.legalHoldReason || !form.reportingObligation) {
      alert('Both Legal Hold Reason and Reporting Obligation are required before any decision.');
      return;
    }
    setSubmitting(true);
    try { await submitTask(task.id, outcome, form, { caseId: task.caseId, taskCode: task.taskCode, stageId: task.stageId }); onClose(); }
    finally { setSubmitting(false); }
  };

  return (
    <AlertModal title="🔴 CONFIRMED OFAC / DPL HIT" subtitle="A confirmed sanctions list match has been detected. No dismiss without a mandatory legal review and decision.">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <InfoChip label="Party Name" value={inp.partyName || '—'} />
        <InfoChip label="Hit Type" value={inp.hitType || '—'} />
        <InfoChip label="SDN List Entry" value={inp.sdnListEntry || '—'} />
        <InfoChip label="Match Score" value={inp.matchScore ? `${inp.matchScore}%` : '—'} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
        <FormRow label="Legal Hold Reason *">
          <FormTextarea value={form.legalHoldReason} onChange={set('legalHoldReason')} placeholder="Document the legal basis for the hold decision…" rows={3} />
        </FormRow>
        <FormRow label="Reporting Obligation *">
          <FormTextarea value={form.reportingObligation} onChange={set('reportingObligation')} placeholder="e.g. OFAC VCAP filing required within 10 days, notify BSA officer…" rows={3} />
        </FormRow>
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <DecisionBtn label="Legal Review" variant="warning" disabled={submitting} onClick={() => submit('LegalReview')} />
        <DecisionBtn label="🚫 Block & Report" variant="danger" disabled={submitting} onClick={() => submit('BlockAndReport')} />
      </div>
    </AlertModal>
  );
};
