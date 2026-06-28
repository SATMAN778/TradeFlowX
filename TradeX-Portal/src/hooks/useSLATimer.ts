// src/hooks/useSLATimer.ts — SLA countdown hook (Blueprint v3)
import { useMemo, useState, useEffect } from 'react';

export type SlaUrgency = 'ok' | 'warning' | 'critical' | 'breached';

export const useSLATimer = (slaDeadlineUtc: string) => {
  const deadline = useMemo(() => new Date(slaDeadlineUtc).getTime(), [slaDeadlineUtc]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, deadline - now);
  const elapsed = now - (deadline - remaining);
  const total = elapsed + remaining;
  const pct = total > 0 ? (remaining / total) * 100 : 0;

  const urgency: SlaUrgency =
    remaining === 0 ? 'breached'
    : pct < 25 ? 'critical'
    : pct < 50 ? 'warning'
    : 'ok';

  const formatRemaining = () => {
    if (remaining === 0) return 'BREACHED';
    const secs  = Math.floor(remaining / 1000);
    const mins  = Math.floor(secs / 60);
    const hrs   = Math.floor(mins / 60);
    const days  = Math.floor(hrs / 24);
    if (days > 0) return `${days}d ${hrs % 24}h`;
    if (hrs > 0)  return `${hrs}h ${mins % 60}m`;
    return `${mins}m ${secs % 60}s`;
  };

  return {
    remaining,
    pct,
    isBreached: remaining === 0,
    urgency,
    label: formatRemaining(),
  };
};
