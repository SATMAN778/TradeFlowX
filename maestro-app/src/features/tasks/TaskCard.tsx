// src/features/tasks/TaskCard.tsx — Task preview card with SLA countdown
import { Inbox, Clock, ChevronRight, AlertTriangle } from 'lucide-react';
import type { ActionCenterTask } from '../../types/task';
import { useSLATimer } from '../../hooks/useSLATimer';

interface TaskCardProps {
  task: ActionCenterTask;
  onClick: () => void;
}

const urgencyColors = {
  ok:       { border: 'var(--glass-border)', bg: 'rgba(255,255,255,0.03)', badge: '#16a34a' },
  warning:  { border: '#d9770640',           bg: 'rgba(217,119,6,0.05)',   badge: '#d97706' },
  critical: { border: '#ef444440',           bg: 'rgba(239,68,68,0.05)',   badge: '#ef4444' },
  breached: { border: '#dc262660',           bg: 'rgba(220,38,38,0.1)',    badge: '#dc2626' },
};

const TASK_CODE_LABELS: Record<string, string> = {
  'HT-01': 'Complete PO Data',
  'HT-02': 'Verify COO',
  'HT-03': 'ISF Elements',
  'HT-04': '🚨 ISF Do Not Load',
  'HT-05': 'ISF Amendment',
  'HT-06': 'HTS Review',
  'HT-07': 'Manual HTS',
  'HT-08': 'COO Docs Required',
  'HT-09': 'PGA May Hold',
  'HT-10': '🚨 PGA Refusal',
  'HT-11': 'OFAC Fuzzy Match',
  'HT-12': '🔴 OFAC Hit',
  'HT-13': 'CBP Exam',
  'HT-14': 'CF-28 Questions',
  'HT-15': 'CF-29 Review',
  'HT-16': 'Doc Discrepancy',
  'HT-17': 'Duty Variance',
  'HT-18': 'Duty Savings',
};

export const TaskCard = ({ task, onClick }: TaskCardProps) => {
  const { urgency, label } = useSLATimer(task.slaDeadline);
  const colors = urgencyColors[urgency];
  const isImmediate = ['HT-04', 'HT-10', 'HT-12'].includes(task.taskCode);

  return (
    <div
      onClick={onClick}
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '10px',
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        animation: isImmediate ? 'pulse 2s infinite' : undefined,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = '';
        (e.currentTarget as HTMLElement).style.boxShadow = '';
      }}
    >
      <div style={{
        width: '36px', height: '36px', borderRadius: '8px',
        background: `${colors.badge}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {isImmediate
          ? <AlertTriangle size={18} color={colors.badge} />
          : <Inbox size={18} color={colors.badge} />
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.title || TASK_CODE_LABELS[task.taskCode] || task.taskCode}
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {task.taskCode} · {task.assigneeRole}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem', color: colors.badge, fontWeight: 600 }}>
            <Clock size={11} /> {label}
          </span>
        </div>
      </div>

      <ChevronRight size={16} color="var(--text-secondary)" />
    </div>
  );
};
