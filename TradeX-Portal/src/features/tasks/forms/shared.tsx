// src/features/tasks/forms/shared.tsx — Shared UI primitives for HT forms
import React, { useState } from 'react';
import type { HtFormProps } from '../../../types/task';
import { useTaskSubmit } from '../../../hooks/useTaskSubmit';
import { useSLATimer } from '../../../hooks/useSLATimer';
import { AlertTriangle, Clock, CheckCircle2, XCircle } from 'lucide-react';

// Shared styled button
export const DecisionBtn = ({
  label, variant, onClick, disabled
}: { label: string; variant: 'primary' | 'danger' | 'warning' | 'secondary'; onClick: () => void; disabled?: boolean }) => {
  const bg = variant === 'primary' ? 'var(--accent-primary)' :
             variant === 'danger'  ? '#dc2626' :
             variant === 'warning' ? '#d97706' : 'rgba(255,255,255,0.1)';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: bg, border: 'none', borderRadius: '8px',
        color: 'white', padding: '10px 20px', cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 600, fontSize: '0.875rem', opacity: disabled ? 0.5 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {label}
    </button>
  );
};

// SLA badge
export const SlaBadge = ({ deadline }: { deadline: string }) => {
  const { label, urgency } = useSLATimer(deadline);
  const color = urgency === 'breached' ? '#dc2626' : urgency === 'critical' ? '#ef4444' :
                urgency === 'warning' ? '#d97706' : '#16a34a';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color, fontWeight: 600 }}>
      <Clock size={13} />
      SLA: {label}
    </span>
  );
};

// Full-screen alert wrapper for HT-04, HT-10, HT-12
export const AlertModal = ({
  title, subtitle, children, color = '#dc2626'
}: { title: string; subtitle: string; children: React.ReactNode; color?: string }) => (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
  }}>
    <div style={{
      background: 'var(--bg-secondary)', border: `2px solid ${color}`, borderRadius: '16px',
      padding: '32px', maxWidth: '600px', width: '100%',
      boxShadow: `0 0 40px ${color}40`
    }}>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-start' }}>
        <AlertTriangle size={28} color={color} />
        <div>
          <h2 style={{ color, margin: 0, fontSize: '1.3rem' }}>{title}</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '0.9rem' }}>{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  </div>
);

// Form row
export const FormRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <label style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {label}
    </label>
    {children}
  </div>
);

// Text input
export const FormInput = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <input
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    style={{
      background: 'rgba(255,255,255,0.07)', border: '1px solid var(--glass-border)',
      borderRadius: '6px', padding: '8px 12px', color: 'var(--text-primary)',
      fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box',
    }}
  />
);

// Textarea
export const FormTextarea = ({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) => (
  <textarea
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    rows={rows}
    style={{
      background: 'rgba(255,255,255,0.07)', border: '1px solid var(--glass-border)',
      borderRadius: '6px', padding: '8px 12px', color: 'var(--text-primary)',
      fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box',
      resize: 'vertical',
    }}
  />
);

// Select
export const FormSelect = ({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    style={{
      background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
      borderRadius: '6px', padding: '8px 12px', color: 'var(--text-primary)',
      fontSize: '0.875rem', outline: 'none', width: '100%', cursor: 'pointer',
    }}
  >
    <option value="">— Select —</option>
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

// Info chip
export const InfoChip = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div style={{
    background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '10px 14px',
    border: '1px solid var(--glass-border)',
  }}>
    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{value}</div>
  </div>
);

// Task modal frame
export const TaskFrame = ({ title, task, onClose, children }: HtFormProps & { title: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--glass-border)' }}>
      <div>
        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>{title}</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Task: <strong>{task.taskCode}</strong></span>
          <SlaBadge deadline={task.slaDeadline} />
        </div>
      </div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}>
        <XCircle size={20} />
      </button>
    </div>
    {children}
  </div>
);

export { useTaskSubmit, CheckCircle2 };
export { useSLATimer } from '../../../hooks/useSLATimer';
export { useState };
