// src/features/audit/RetentionBadge.tsx — green/amber/red by days to expiry
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface RetentionBadgeProps {
  expiresAt?: string;
  retentionYears?: number;
}

export const RetentionBadge = ({ expiresAt, retentionYears }: RetentionBadgeProps) => {
  if (!expiresAt) {
    return (
      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
        No expiry set
      </span>
    );
  }

  const daysLeft = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  const isExpired = daysLeft < 0;
  const isCritical = daysLeft >= 0 && daysLeft < 30;
  const isWarning = daysLeft >= 30 && daysLeft < 180;

  const config = isExpired
    ? { color: '#ef4444', bg: 'rgba(220,38,38,0.1)', border: '#dc262640', icon: AlertTriangle, label: 'EXPIRED' }
    : isCritical
    ? { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: '#ef444440', icon: AlertTriangle, label: `${daysLeft}d left` }
    : isWarning
    ? { color: '#d97706', bg: 'rgba(217,119,6,0.1)', border: '#d9770640', icon: Clock, label: `${daysLeft}d left` }
    : { color: '#22c55e', bg: 'rgba(22,163,74,0.1)', border: '#16a34a40', icon: CheckCircle2, label: `${daysLeft}d left` };

  const Icon = config.icon;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px',
      background: config.bg, border: `1px solid ${config.border}`, color: config.color,
    }}>
      <Icon size={11} />
      {retentionYears && `${retentionYears}yr · `}{config.label}
    </span>
  );
};
