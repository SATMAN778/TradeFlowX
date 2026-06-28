// HT-14 — CF-28 Unanswered Questions (CustomsBroker+ImporterOps, 5 days)
import { useState } from 'react';
import type { HtFormProps } from '../../../types/task';
import { TaskFrame, FormTextarea, DecisionBtn, InfoChip, useTaskSubmit, useSLATimer } from './shared';

interface CF28Question { questionId: string; questionText: string; }

export const HT14_CF28 = ({ task, onClose }: HtFormProps) => {
  const { submitTask } = useTaskSubmit();
  const inp = task.inputData as any;
  const questions: CF28Question[] = inp.cf28Questions || [];
  const [responses, setResponses] = useState<Record<string, string>>(
    Object.fromEntries(questions.map(q => [q.questionId, '']))
  );
  const [submitting, setSubmitting] = useState(false);
  const sla = useSLATimer(task.slaDeadline);

  const submit = async (outcome: string) => {
    setSubmitting(true);
    const questionResponses = questions.map(q => ({ questionId: q.questionId, responseText: responses[q.questionId] }));
    try { await submitTask(task.id, outcome, { questionResponses }, { caseId: task.caseId, taskCode: task.taskCode, stageId: task.stageId }); onClose(); }
    finally { setSubmitting(false); }
  };

  return (
    <TaskFrame title="CF-28 — CBP Unanswered Questions" task={task} onClose={onClose}>
      {/* 5-day deadline progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>CBP Response Deadline</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: sla.urgency === 'breached' ? '#dc2626' : sla.urgency === 'critical' ? '#ef4444' : '#d97706' }}>{sla.label}</span>
        </div>
        <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${sla.pct}%`, background: sla.pct > 50 ? '#16a34a' : sla.pct > 25 ? '#d97706' : '#dc2626', borderRadius: '4px', transition: 'width 0.3s' }} />
        </div>
      </div>

      {inp.cbpResponseDeadline && <InfoChip label="Response Deadline" value={new Date(inp.cbpResponseDeadline).toLocaleString()} />}

      {questions.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No questions loaded — check inputData.cf28Questions</p>}
      {questions.map((q, i) => (
        <div key={q.questionId} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '14px', border: '1px solid var(--glass-border)' }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '8px' }}>Q{i + 1}: {q.questionText}</div>
          <FormTextarea
            value={responses[q.questionId] || ''}
            onChange={v => setResponses(r => ({ ...r, [q.questionId]: v }))}
            placeholder="Your response to this CBP question…"
            rows={3}
          />
        </div>
      ))}

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <DecisionBtn label="Request CBP Extension" variant="warning" disabled={submitting} onClick={() => submit('RequestCBPExtension')} />
        <DecisionBtn label="✓ Submit Response" variant="primary" disabled={submitting} onClick={() => submit('SubmitResponse')} />
      </div>
    </TaskFrame>
  );
};
