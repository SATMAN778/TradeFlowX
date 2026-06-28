// src/features/documents/DocumentUpload.tsx — Drag-drop uploader to ShipmentDocument DF entity
import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { dfHelper } from '../../lib/sdk';
import { writeAuditEntry } from '../../lib/audit';
import { useAuth } from '../../context/AuthContext';

const DOC_ENTITY = import.meta.env.VITE_ENTITY_DOC;

const DOC_TYPES = [
  'Commercial Invoice', 'Packing List', 'Bill of Lading',
  'Certificate of Origin', 'ISF Filing', 'HTS Classification',
  'OFAC Clearance', 'Customs Entry', 'CBP Release',
];

interface DocumentUploadProps {
  caseId: string;
  onUploaded?: () => void;
}

export const DocumentUpload = ({ caseId, onUploaded }: DocumentUploadProps) => {
  const { activeRole, userName } = useAuth();
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [docType, setDocType] = useState('');
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: File[]) => {
    setFiles(prev => [...prev, ...incoming.filter(f => !prev.find(e => e.name === f.name))]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    addFiles(dropped);
  }, []);

  const handleUpload = async () => {
    if (!files.length || !docType) return;
    setUploading(true);
    setStatus('idle');
    try {
      for (const file of files) {
        const record: Record<string, unknown> = {
          CaseRef: caseId,
          FileName: file.name,
          DocumentCategory: docType,
          UploadedBy: userName || activeRole || 'unknown',
          UploadedAt: new Date().toISOString(),
          FileSizeBytes: file.size,
          RetentionYears: 7,
          ExpiresAt: new Date(Date.now() + 7 * 365.25 * 86400000).toISOString(),
        };
        if (DOC_ENTITY) {
          await dfHelper.insert(DOC_ENTITY, record);
        }
        await writeAuditEntry({
          caseId,
          actionType: 'DOCUMENT_UPLOADED',
          stageId: 'S7',
          fieldChanged: 'ShipmentDocument',
          newValue: file.name,
        });
      }
      setStatus('success');
      setStatusMsg(`${files.length} document${files.length > 1 ? 's' : ''} uploaded successfully`);
      setFiles([]);
      setDocType('');
      onUploaded?.();
    } catch (err: any) {
      setStatus('error');
      setStatusMsg(err?.message || 'Upload failed. Check your permissions.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
          borderRadius: '12px',
          padding: '36px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          background: dragging ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
        }}
      >
        <Upload size={36} color={dragging ? 'var(--accent-primary)' : 'var(--text-secondary)'} style={{ marginBottom: '10px' }} />
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
          {dragging ? 'Drop files here' : 'Drag & drop files or click to browse'}
        </p>
        <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '0.78rem', opacity: 0.6 }}>
          PDF, JPEG, PNG, XLSX, DOCX
        </p>
      </div>
      <input ref={fileRef} type="file" multiple style={{ display: 'none' }}
        onChange={e => addFiles(Array.from(e.target.files || []))} />

      {/* File list */}
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '10px 14px' }}>
              <FileText size={16} color="var(--accent-primary)" />
              <span style={{ flex: 1, fontSize: '0.875rem' }}>{f.name}</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{(f.size / 1024).toFixed(1)} KB</span>
              <button onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px' }}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Document type select */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <select
          value={docType}
          onChange={e => setDocType(e.target.value)}
          style={{
            flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
            borderRadius: '8px', padding: '10px 12px', color: 'var(--text-primary)', fontSize: '0.875rem', cursor: 'pointer',
          }}
        >
          <option value="">Select document type…</option>
          {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button
          onClick={handleUpload}
          disabled={!files.length || !docType || uploading}
          style={{
            padding: '10px 24px', background: 'var(--accent-primary)', border: 'none', borderRadius: '8px',
            color: 'white', fontWeight: 600, cursor: !files.length || !docType || uploading ? 'not-allowed' : 'pointer',
            opacity: !files.length || !docType || uploading ? 0.5 : 1,
            display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
          }}
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      {/* Status */}
      {status !== 'idle' && (
        <div style={{
          display: 'flex', gap: '8px', alignItems: 'center', padding: '12px 14px', borderRadius: '8px',
          background: status === 'success' ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
          border: `1px solid ${status === 'success' ? '#16a34a40' : '#dc262640'}`,
          fontSize: '0.875rem', color: status === 'success' ? '#22c55e' : '#ef4444',
        }}>
          {status === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {statusMsg}
        </div>
      )}
    </div>
  );
};
