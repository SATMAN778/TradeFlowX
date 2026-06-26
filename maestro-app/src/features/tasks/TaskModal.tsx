// src/features/tasks/TaskModal.tsx — Modal wrapper rendering the correct HT form (Blueprint v3)
import type { ActionCenterTask } from '../../types/task';
import { HT_FORM_MAP } from './forms';
import { useCanApprove } from '../../hooks/useCanApprove';
import { Eye, Lock } from 'lucide-react';

interface TaskModalProps {
  task: ActionCenterTask;
  onClose: () => void;
}

const ReadOnlyTaskView = ({ task, onClose }: TaskModalProps) => (
  <div style={{ padding: '24px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
      <Lock size={20} color="#d97706" />
      <h3 style={{ margin: 0 }}>View Only — {task.taskCode}</h3>
    </div>
    <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
      You don't have the required role to act on this task. Assigned role: <strong>{task.assigneeRole}</strong>
    </p>
    <pre style={{
      background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '14px',
      fontSize: '0.8rem', overflow: 'auto', maxHeight: '300px', color: 'var(--text-secondary)',
    }}>
      {JSON.stringify(task.inputData, null, 2)}
    </pre>
    <button onClick={onClose} style={{ marginTop: '16px', padding: '8px 20px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer' }}>
      Close
    </button>
  </div>
);

const UnknownTaskFallback = ({ task, onClose }: TaskModalProps) => (
  <div style={{ padding: '24px', textAlign: 'center' }}>
    <Eye size={36} color="var(--text-secondary)" style={{ marginBottom: '12px' }} />
    <p style={{ color: 'var(--text-secondary)' }}>Unknown task code: <strong>{task.taskCode}</strong></p>
    <pre style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '14px', fontSize: '0.8rem', overflow: 'auto', maxHeight: '300px' }}>
      {JSON.stringify(task, null, 2)}
    </pre>
    <button onClick={onClose} style={{ marginTop: '16px', padding: '8px 20px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer' }}>
      Close
    </button>
  </div>
);

export const TaskModal = ({ task, onClose }: TaskModalProps) => {
  const canApprove = useCanApprove(task.taskCode);
  const FormComponent = HT_FORM_MAP[task.taskCode];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
        borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '720px',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        {!FormComponent
          ? <UnknownTaskFallback task={task} onClose={onClose} />
          : !canApprove
          ? <ReadOnlyTaskView task={task} onClose={onClose} />
          : <FormComponent task={task} onClose={onClose} />
        }
      </div>
    </div>
  );
};
