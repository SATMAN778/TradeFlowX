// HT-15 — CF-29 / CBP Action Review (CustomsBroker+LegalCounsel, 2 days)
import { useState } from 'react';
import type { HtFormProps } from '../../../types/task';
import { TaskFrame, FormRow, FormTextarea, DecisionBtn, InfoChip, useTaskSubmit, useSLATimer } from './shared';

export const HT15_CF29 = ({ task, onClose }: HtFormProps) => {
  const { submitTask } = useTaskSubmit();
  const inp = task.inputData as any;
  const dutyDelta: number = inp.dutyDelta || 0;
  const [form, setForm] = useState({ decision: '', protestGrounds: '' });
  const [submitting, setSubmitting] = useState(false);
  const sla = useSLATimer(task.slaDeadline);
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (outcome: string) => {
    setSubmitting(true);
    try { await submitTask(task.id, outcome, { ...form, decision: outcome }, { caseId: task.caseId, taskCode: task.taskCode, stageId: task.stageId }); onClose(); }
    finally { setSubmitting(false); }
  };

  return (
    <TaskFrame title="CF-29 / CBP Action Review" task={task} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <InfoChip label="Action Type" value={inp.actionType || '—'} />
        <InfoChip label="Protest Eligible?" value={inp.protestEligible ? 'Yes' : 'No'} />
        <InfoChip label="Protest Deadline" value={inp.protestDeadline ? new Date(inp.protestDeadline).toLocaleDateString() : '—'} />
        <InfoChip label="Duty Delta" value={dutyDelta >= 0 ? `+$${Math.abs(dutyDelta).toLocaleString()}` : `-$${Math.abs(dutyDelta).toLocaleString()}`} />
      </div>

      {/* Duty delta visualization */}
      {dutyDelta !== 0 && (
        <div style={{ background: dutyDelta > 0 ? 'rgba(220,38,38,0.1)' : 'rgba(22,163,74,0.1)', borderRadius: '8px', padding: '12px', border: `1px solid ${dutyDelta > 0 ? '#dc262640' : '#16a34a40'}` }}>
          <div style={{ fontWeight: 700, color: dutyDelta > 0 ? '#ef4444' : '#22c55e', fontSize: '1.1rem' }}>
            {dutyDelta > 0 ? '▲ Additional Duty: ' : '▼ Duty Reduction: '}
            ${Math.abs(dutyDelta).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            CBP has issued an action affecting duty amount. Review and decide whether to protest.
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
        <span>Protest Deadline:</span>
        <span style={{ fontWeight: 700, color: sla.urgency === 'critical' || sla.urgency === 'breached' ? '#ef4444' : '#d97706' }}>{sla.label}</span>
      </div>

      <FormRow label="Protest Grounds (if filing protest)">
        <FormTextarea value={form.protestGrounds} onChange={set('protestGrounds')} placeholder="Legal basis for protest under 19 USC §1514…" rows={3} />
      </FormRow>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <DecisionBtn label="Accept CBP Action" variant="secondary" disabled={submitting} onClick={() => submit('AcceptAction')} />
        <DecisionBtn label="✓ File PBP Protest" variant="primary" disabled={submitting} onClick={() => submit('FilePBPProtest')} />
      </div>
    </TaskFrame>
  );
};
