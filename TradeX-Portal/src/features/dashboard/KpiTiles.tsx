import { Box, Clock, AlertTriangle, ClipboardCheck, Activity, Globe, ShieldCheck, TrendingUp } from 'lucide-react';
import type { CaseSummary } from '../../types/cases';

interface KpiTilesProps {
  cases: CaseSummary[];
  pendingTaskCount: number | null;
  loading: boolean;
}

export default function KpiTiles({ cases, pendingTaskCount, loading }: KpiTilesProps) {
  const totalRunning = cases.reduce((sum, c) => sum + c.running, 0);
  const totalCompleted = cases.reduce((sum, c) => sum + c.completed, 0);
  const totalFaulted = cases.reduce((sum, c) => sum + c.faulted, 0);
  
  // Synthesise KPI statistics based on mock case list or real values
  const isfSlaCompliance = 98.2;
  const ofacHits30Days = totalFaulted > 0 ? 1 : 0;
  const cbpExamRate = 4.5;
  const avgCycleTimeDays = 2.4;
  const slaBreachesToday = 0;

  const kpiData = [
    {
      title: 'Active Import Cases',
      value: loading ? '...' : totalRunning,
      icon: Box,
      color: 'var(--accent-primary)',
      bg: 'rgba(41, 69, 134, 0.1)',
      desc: 'Active runs in Maestro'
    },
    {
      title: 'ISF SLA Compliance',
      value: loading ? '...' : `${isfSlaCompliance}%`,
      icon: ShieldCheck,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)',
      desc: 'Filing within 24hr pre-departure'
    },
    {
      title: 'OFAC Sanctions Hits',
      value: loading ? '...' : ofacHits30Days,
      icon: AlertTriangle,
      color: ofacHits30Days > 0 ? 'var(--danger)' : '#64748b',
      bg: ofacHits30Days > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(100, 116, 139, 0.08)',
      desc: 'Confirmed hits (30 days)'
    },
    {
      title: 'Pending Action Tasks',
      value: pendingTaskCount === null ? '...' : pendingTaskCount,
      icon: ClipboardCheck,
      color: pendingTaskCount && pendingTaskCount > 0 ? 'var(--accent-secondary)' : '#64748b',
      bg: pendingTaskCount && pendingTaskCount > 0 ? 'rgba(204, 177, 108, 0.15)' : 'rgba(100, 116, 139, 0.08)',
      desc: 'HITL approvals in queue'
    },
    {
      title: 'CBP Examination Rate',
      value: loading ? '...' : `${cbpExamRate}%`,
      icon: Globe,
      color: '#0ea5e9',
      bg: 'rgba(14, 165, 233, 0.1)',
      desc: 'Selected for CET/X-Ray exams'
    },
    {
      title: 'Average Cycle Time',
      value: loading ? '...' : `${avgCycleTimeDays}d`,
      icon: Clock,
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.1)',
      desc: 'PO creation to CBP release'
    },
    {
      title: 'SLA Breaches Today',
      value: loading ? '...' : slaBreachesToday,
      icon: Activity,
      color: slaBreachesToday > 0 ? 'var(--danger)' : '#10b981',
      bg: slaBreachesToday > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
      desc: 'Breached task deadlines'
    },
    {
      title: 'Completed Shipments',
      value: loading ? '...' : totalCompleted,
      icon: TrendingUp,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)',
      desc: 'Closed cases this period'
    }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
      {kpiData.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div key={kpi.title} className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', transition: 'all 0.2s' }}>
            <div style={{ padding: '12px', background: kpi.bg, borderRadius: '8px', color: kpi.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={22} />
            </div>
            <div>
              <p className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 500 }}>{kpi.title}</p>
              <h2 style={{ fontSize: '1.5rem', marginTop: '2px', fontWeight: 700 }}>{kpi.value}</h2>
              <span className="text-secondary" style={{ fontSize: '0.7rem', display: 'block', marginTop: '2px' }}>{kpi.desc}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
