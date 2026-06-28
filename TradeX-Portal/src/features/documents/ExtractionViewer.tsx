// src/features/documents/ExtractionViewer.tsx — IDP field-level confidence scores viewer
import { useState } from 'react';
import { FileSearch, ChevronDown, ChevronUp } from 'lucide-react';
import type { ShipmentDocument } from '../../types/entities';

interface ExtractionViewerProps {
  document: ShipmentDocument;
}

const ConfidenceBadge = ({ score }: { score: number }) => {
  const color = score >= 0.9 ? '#22c55e' : score >= 0.7 ? '#d97706' : '#ef4444';
  const label = score >= 0.9 ? 'High' : score >= 0.7 ? 'Medium' : 'Low';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
      background: `${color}20`, color,
    }}>
      {Math.round(score * 100)}% {label}
    </span>
  );
};

export const ExtractionViewer = ({ document }: ExtractionViewerProps) => {
  const [expanded, setExpanded] = useState(true);
  
  let fields: Array<{ key: string; value: string; confidence: number }> = [];
  try {
    const raw = typeof document.ExtractedFields === 'string'
      ? JSON.parse(document.ExtractedFields)
      : document.ExtractedFields || {};
    fields = Object.entries(raw).map(([key, val]: [string, any]) => ({
      key,
      value: typeof val === 'object' ? val.value ?? JSON.stringify(val) : String(val),
      confidence: typeof val === 'object' ? (val.confidence ?? 1) : 1,
    }));
  } catch {
    fields = [];
  }

  const overallConfidence = document.IdpConfidence ?? (
    fields.length > 0 ? fields.reduce((s, f) => s + f.confidence, 0) / fields.length : 0
  );

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', cursor: 'pointer', borderBottom: expanded ? '1px solid var(--glass-border)' : 'none' }}
      >
        <FileSearch size={16} color="var(--accent-primary)" />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{document.FileName}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{document.DocumentCategory} · {fields.length} fields extracted</div>
        </div>
        <ConfidenceBadge score={overallConfidence} />
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>

      {expanded && (
        <div style={{ padding: '12px' }}>
          {fields.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.875rem', padding: '16px' }}>
              No extracted fields available.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {fields.map((f) => (
                <div key={f.key} style={{
                  background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '10px 12px',
                  border: '1px solid var(--glass-border)',
                }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                    {f.key.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '4px' }}>{f.value || '—'}</div>
                  <ConfidenceBadge score={f.confidence} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
