import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import type { Stage } from '../types/cases';

interface StageTrackerProps {
  stages: Stage[];
}

export default function StageTracker({ stages }: StageTrackerProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {stages.map((stage, index) => {
        const getIcon = () => {
          switch (stage.status) {
            case 'completed':
              return <CheckCircle2 size={24} style={{ color: 'var(--success)' }} />;
            case 'in_progress':
              return <Circle size={24} style={{ color: 'var(--accent-primary)', fill: 'rgba(41, 69, 134, 0.2)' }} />;
            case 'error':
              return <AlertCircle size={24} style={{ color: 'var(--danger)' }} />;
            default:
              return <Circle size={24} style={{ color: 'var(--text-secondary)' }} />;
          }
        };

        return (
          <div 
            key={stage.id} 
            style={{ 
              display: 'flex', 
              gap: '16px', 
              padding: '16px', 
              borderRadius: '12px',
              background: stage.status === 'in_progress' ? 'rgba(41, 69, 134, 0.05)' : 'transparent',
              border: stage.status === 'in_progress' ? '1px solid rgba(41, 69, 134, 0.2)' : '1px solid transparent',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {getIcon()}
              {index < stages.length - 1 && (
                <div style={{ 
                  width: '2px', 
                  height: '40px', 
                  background: stage.status === 'completed' ? 'var(--success)' : 'var(--glass-border)',
                  marginTop: '8px'
                }} />
              )}
            </div>
            
            <div>
              <h4 style={{ 
                color: stage.status === 'completed' ? 'var(--text-primary)' : stage.status === 'in_progress' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: stage.status === 'in_progress' ? 600 : 500
              }}>
                {stage.title}
              </h4>
              <p className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '4px' }}>{stage.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
