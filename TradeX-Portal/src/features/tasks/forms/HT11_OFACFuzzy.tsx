// HT-11 — OFAC Fuzzy Match Review ≥85% (ComplianceOfficer, 2 hrs)
import { useState } from 'react';
import type { HtFormProps } from '../../../types/task';
import { TaskFrame, FormRow, FormTextarea, DecisionBtn, InfoChip, useTaskSubmit } from './shared';

export const HT11_OFACFuzzy = ({ task, onClose }: HtFormProps) => {
  const { submitTask } = useTaskSubmit();
  const inp = task.inputData as any;
  const matchScore: number = inp.matchScore || 85;
  const [form, setForm] = useState({ reviewNotes: '', researchSummary: '' });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (outcome: string) => {
    setSubmitting(true);
    try { await submitTask(task.id, outcome, form, { caseId: task.caseId, taskCode: task.taskCode, stageId: task.stageId }); onClose(); }
    finally { setSubmitting(false); }
  };

  const scoreColor = matchScore >= 95 ? '#dc2626' : matchScore >= 85 ? '#d97706' : '#16a34a';

  return (
    <TaskFrame title="OFAC Fuzzy Match Review" task={task} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        <InfoChip label="Party Name" value={inp.partyName || '—'} />
        <InfoChip label="Party Role" value={inp.partyRole || '—'} />
        <InfoChip label="Country" value={inp.partyCountry || '—'} />
      </div>

      {/* Match score gauge */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '14px', border: `1px solid ${scoreColor}40` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>SDN Match Score</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: scoreColor }}>{matchScore}%</span>
        </div>
        <div style={{ height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${matchScore}%`, background: scoreColor, borderRadius: '5px', transition: 'width 1s ease' }} />
        </div>
        {inp.matchedSdnEntry && (
          <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            SDN Entry: <strong>{inp.matchedSdnEntry}</strong>
            {inp.listVersion && <> · List version: <strong>{inp.listVersion}</strong></>}
          </div>
        )}
      </div>

      <FormRow label="Research Summary">
        <FormTextarea value={form.researchSummary} onChange={set('researchSummary')} placeholder="Summarize your research on the matched party…" rows={3} />
      </FormRow>
      <FormRow label="Review Notes">
        <FormTextarea value={form.reviewNotes} onChange={set('reviewNotes')} placeholder="Document your compliance review decision rationale…" rows={2} />
      </FormRow>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <DecisionBtn label="Block Shipment" variant="danger" disabled={submitting} onClick={() => submit('BlockShipment')} />
        <DecisionBtn label="Escalate to Legal" variant="warning" disabled={submitting} onClick={() => submit('EscalateToLegal')} />
        <DecisionBtn label="✓ Clear Party" variant="primary" disabled={submitting} onClick={() => submit('ClearParty')} />
      </div>
    </TaskFrame>
  );
};
