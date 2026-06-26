// src/features/cases/StageRail.tsx — Horizontal 7-stage progress (S1→S7, parallel branches)
import { CheckCircle2, Circle, AlertCircle, Loader } from 'lucide-react';

export interface StageInfo {
  id: string;
  label: string;
  status: 'completed' | 'in_progress' | 'pending' | 'error';
}

const STAGE_DEFS: { id: string; label: string; short: string }[] = [
  { id: 'S1', label: 'Order Intake',    short: 'S1 Intake' },
  { id: 'S2', label: 'ISF Filing',      short: 'S2 ISF' },
  { id: 'S3', label: 'HTS & COO',       short: 'S3 HTS' },
  { id: 'S4', label: 'PGA Review',      short: 'S4 PGA' },
  { id: 'S5', label: 'OFAC Screen',     short: 'S5 OFAC' },
  { id: 'S6', label: 'Customs Entry',   short: 'S6 CBP' },
  { id: 'S7', label: 'Post-Entry',      short: 'S7 Post' },
];

interface StageRailProps {
  currentStage: string;
  stageStatuses?: Record<string, 'completed' | 'in_progress' | 'pending' | 'error'>;
  onStageClick?: (stageId: string) => void;
}

const StageIcon = ({ status }: { status: string }) => {
  if (status === 'completed') return <CheckCircle2 size={18} color="#22c55e" />;
  if (status === 'in_progress') return <Loader size={18} color="var(--accent-primary)" className="animate-spin" />;
  if (status === 'error') return <AlertCircle size={18} color="#ef4444" />;
  return <Circle size={18} color="#6b7280" />;
};

export const StageRail = ({ currentStage, stageStatuses = {}, onStageClick }: StageRailProps) => {
  const getStatus = (id: string): 'completed' | 'in_progress' | 'pending' | 'error' => {
    if (stageStatuses[id]) return stageStatuses[id];
    const idx = STAGE_DEFS.findIndex(s => s.id === id);
    const curIdx = STAGE_DEFS.findIndex(s => s.id === currentStage);
    if (idx < curIdx) return 'completed';
    if (id === currentStage) return 'in_progress';
    return 'pending';
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0',
      background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
      borderRadius: '12px', padding: '16px 20px', overflowX: 'auto',
    }}>
      {STAGE_DEFS.map((stage, i) => {
        const status = getStatus(stage.id);
        const isCurrent = stage.id === currentStage;
        const isS4 = stage.id === 'S4'; // parallel/optional

        return (
          <div key={stage.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {/* Connector line */}
            {i > 0 && (
              <div style={{
                width: '32px', height: '2px', flexShrink: 0,
                background: getStatus(STAGE_DEFS[i - 1].id) === 'completed' ? '#22c55e' : 'rgba(255,255,255,0.1)',
              }} />
            )}

            {/* Stage node */}
            <button
              onClick={() => onStageClick?.(stage.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                background: isCurrent ? 'rgba(99,102,241,0.15)' : 'transparent',
                border: isCurrent ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
                borderRadius: '8px', padding: '8px 12px', cursor: onStageClick ? 'pointer' : 'default',
                transition: 'all 0.2s',
                opacity: isS4 && status === 'pending' ? 0.5 : 1,
              }}
            >
              <StageIcon status={status} />
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '0.72rem', fontWeight: 700, color: isCurrent ? 'var(--accent-primary)' :
                    status === 'completed' ? '#22c55e' : status === 'error' ? '#ef4444' : 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                }}>
                  {stage.short}
                </div>
                {isS4 && <div style={{ fontSize: '0.65rem', color: '#d97706', fontWeight: 600 }}>Conditional</div>}
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
};
