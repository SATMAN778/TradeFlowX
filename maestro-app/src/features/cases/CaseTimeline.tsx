// src/features/cases/CaseTimeline.tsx — Merged Maestro events + DF AuditEntry (newest first)
import { History, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { AuditEntry } from '../../types/entities';

interface TimelineEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  stage?: string;
  taskCode?: string;
  decision?: string;
  source: 'audit' | 'maestro';
}

interface CaseTimelineProps {
  auditEntries: AuditEntry[];
  maestroEvents?: Array<{ id: string; timestamp: string; name: string; status: string }>;
}

const SOURCE_COLORS = {
  audit: 'var(--accent-primary)',
  maestro: '#10b981',
};

export const CaseTimeline = ({ auditEntries, maestroEvents = [] }: CaseTimelineProps) => {
  const [expanded, setExpanded] = useState(true);
  const [limit, setLimit] = useState(15);

  // Merge and sort events
  const events: TimelineEvent[] = [
    ...auditEntries.map(e => ({
      id: e.id || e.RecordedAt,
      timestamp: e.RecordedAt,
      actor: `${e.ActorRole} (${e.ActorUserId})`,
      action: e.ActionType,
      stage: e.StageId,
      taskCode: e.TaskCode,
      decision: e.DecisionOutcome,
      source: 'audit' as const,
    })),
    ...maestroEvents.map(e => ({
      id: e.id,
      timestamp: e.timestamp,
      actor: 'Maestro Engine',
      action: e.name,
      stage: undefined,
      taskCode: undefined,
      decision: e.status,
      source: 'maestro' as const,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const displayed = events.slice(0, limit);

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '10px', overflow: 'hidden' }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', cursor: 'pointer', borderBottom: expanded ? '1px solid var(--glass-border)' : 'none' }}
      >
        <History size={16} color="var(--accent-primary)" />
        <span style={{ fontWeight: 700, fontSize: '0.9rem', flex: 1 }}>Case Timeline</span>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{events.length} events</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>

      {expanded && (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '0' }}>
          {events.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '16px', fontSize: '0.875rem' }}>
              No timeline events yet.
            </p>
          )}
          {displayed.map((event, i) => (
            <div key={event.id} style={{ display: 'flex', gap: '12px', paddingBottom: i < displayed.length - 1 ? '12px' : '0' }}>
              {/* Timeline spine */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '16px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: SOURCE_COLORS[event.source], marginTop: '3px', flexShrink: 0 }} />
                {i < displayed.length - 1 && <div style={{ width: '1px', flex: 1, background: 'rgba(255,255,255,0.1)', marginTop: '4px' }} />}
              </div>

              {/* Event content */}
              <div style={{ flex: 1, paddingBottom: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: SOURCE_COLORS[event.source] }}>{event.action}</span>
                    {event.taskCode && <span style={{ marginLeft: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>· {event.taskCode}</span>}
                    {event.stage && <span style={{ marginLeft: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>· {event.stage}</span>}
                    {event.decision && (
                      <span style={{ marginLeft: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#22c55e' }}>→ {event.decision}</span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{event.actor}</div>
              </div>
            </div>
          ))}

          {events.length > limit && (
            <button onClick={() => setLimit(l => l + 15)}
              style={{ marginTop: '8px', background: 'none', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-secondary)', padding: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
              Load more ({events.length - limit} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  );
};
