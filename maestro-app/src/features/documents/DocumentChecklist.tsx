// src/features/documents/DocumentChecklist.tsx — 9-document completeness gate
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { ShipmentDocument } from '../../types/entities';

const REQUIRED_DOCS = [
  'Commercial Invoice',
  'Packing List',
  'Bill of Lading',
  'Certificate of Origin',
  'ISF Filing',
  'HTS Classification',
  'OFAC Clearance',
  'Customs Entry',
  'CBP Release',
];

interface DocumentChecklistProps {
  documents: ShipmentDocument[];
  caseId: string;
}

type DocStatus = 'complete' | 'pending' | 'missing';

const StatusIcon = ({ status }: { status: DocStatus }) => {
  if (status === 'complete') return <CheckCircle2 size={18} color="#22c55e" />;
  if (status === 'pending')  return <Clock size={18} color="#d97706" />;
  return <XCircle size={18} color="#6b7280" />;
};

const statusColors: Record<DocStatus, string> = {
  complete: '#22c55e',
  pending: '#d97706',
  missing: '#6b7280',
};

export const DocumentChecklist = ({ documents, caseId }: DocumentChecklistProps) => {
  const docMap = new Map<string, ShipmentDocument>();
  documents.forEach(d => docMap.set(d.DocumentCategory, d));

  const statuses = REQUIRED_DOCS.map(name => ({
    name,
    status: docMap.has(name) ? 'complete' : 'missing' as DocStatus,
    doc: docMap.get(name),
  }));

  const complete = statuses.filter(s => s.status === 'complete').length;
  const pct = Math.round((complete / REQUIRED_DOCS.length) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Progress header */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Document Completeness</span>
          <span style={{
            fontWeight: 800, fontSize: '1rem',
            color: pct === 100 ? '#22c55e' : pct >= 60 ? '#d97706' : '#ef4444',
          }}>{pct}%</span>
        </div>
        <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: pct === 100 ? '#22c55e' : pct >= 60 ? '#d97706' : '#ef4444',
            borderRadius: '4px', transition: 'width 0.6s ease',
          }} />
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          {complete}/{REQUIRED_DOCS.length} required documents received
        </div>
      </div>

      {/* Checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {statuses.map(({ name, status, doc }) => (
          <div key={name} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 14px', borderRadius: '8px',
            background: status === 'complete' ? 'rgba(22,163,74,0.06)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${status === 'complete' ? '#16a34a30' : 'var(--glass-border)'}`,
          }}>
            <StatusIcon status={status} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: statusColors[status] }}>{name}</div>
              {doc && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {doc.FileName} · {new Date(doc.UploadedAt || '').toLocaleDateString()}
                </div>
              )}
            </div>
            <span style={{
              fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
              background: status === 'complete' ? 'rgba(22,163,74,0.15)' : 'rgba(255,255,255,0.06)',
              color: statusColors[status], textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              {status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
