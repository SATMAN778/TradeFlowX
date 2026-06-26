import { AlertTriangle, Clock, ArrowRight } from 'lucide-react';

interface SlaAlert {
  id: string;
  caseRef: string;
  type: string;
  deadlineLabel: string;
  remainingPercent: number;
  remainingTime: string;
  urgency: 'critical' | 'warning';
}

interface SlaAlertRailProps {
  onSelectCaseInstance: (instanceId: string) => void;
}

export default function SlaAlertRail({ onSelectCaseInstance }: SlaAlertRailProps) {
  // Mock active SLA alerts for cases that require immediate attention
  const alerts: SlaAlert[] = [
    {
      id: '5d6fee7e-bfc4-46df-b198-c7216de8cfda',
      caseRef: 'TF-88201',
      type: 'ISF Pre-Departure filing',
      deadlineLabel: '24 hrs before Vessel loading',
      remainingPercent: 15,
      remainingTime: '2h 14m left',
      urgency: 'critical'
    },
    {
      id: '3d3cee7e-dfc4-46df-b198-c7216de8cfdb',
      caseRef: 'TF-10023',
      type: 'CF-28 cbp request response',
      deadlineLabel: 'CBP Response Deadline',
      remainingPercent: 40,
      remainingTime: '1d 8h left',
      urgency: 'warning'
    }
  ];

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <AlertTriangle size={18} style={{ color: 'var(--accent-secondary)' }} />
        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Active SLA Deadlines Alert</h3>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {alerts.map((alert) => (
          <div 
            key={alert.id}
            onClick={() => onSelectCaseInstance(alert.id)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: '8px',
              background: alert.urgency === 'critical' ? 'rgba(239, 68, 68, 0.04)' : 'rgba(245, 158, 11, 0.04)',
              border: alert.urgency === 'critical' ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid rgba(245, 158, 11, 0.15)',
              cursor: 'pointer',
              transition: 'transform 0.15s'
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem' }}>{alert.caseRef}</span>
                <span className="text-secondary" style={{ fontSize: '0.75rem' }}>&bull; {alert.type}</span>
              </div>
              <span className="text-secondary" style={{ fontSize: '0.7rem' }}>{alert.deadlineLabel}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <span style={{ 
                  fontSize: '0.8rem', 
                  fontWeight: 600, 
                  color: alert.urgency === 'critical' ? 'var(--danger)' : '#f59e0b'
                }}>
                  {alert.remainingTime}
                </span>
                <div style={{ width: '80px', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${alert.remainingPercent}%`, 
                    height: '100%', 
                    background: alert.urgency === 'critical' ? 'var(--danger)' : '#f59e0b' 
                  }} />
                </div>
              </div>
              <ArrowRight size={14} className="text-secondary" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
