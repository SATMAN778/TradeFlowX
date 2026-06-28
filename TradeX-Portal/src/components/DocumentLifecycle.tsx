import { useState, useCallback } from 'react';
import { 
  FileText, Upload, AlertCircle, Trash2, CheckCircle2, 
  Clock, Download, RefreshCw, Eye, Calendar, ShieldCheck 
} from 'lucide-react';
import type { ShipmentDoc } from '../types/cases';
import { uploadDocument, deleteDocument, getDocumentDownloadUrl } from '../services/casesService';
import { useAuth } from '../context/AuthContext';

// Define the 9 standard import documents required for CBP / PGA clearance
export const REQUIRED_DOCUMENT_TYPES = [
  'Commercial Invoice',
  'Packing List',
  'Bill of Lading',
  'Certificate of Origin',
  'Arrival Notice',
  'CBP Form 3461',
  'CBP Form 7501',
  'PGA Permit',
  'Delivery Order'
] as const;

export type RequiredDocType = typeof REQUIRED_DOCUMENT_TYPES[number];

// 1. Retention Badge Helper Component
export function RetentionBadge({ daysLeft }: { daysLeft: number }) {
  const years = (daysLeft / 365).toFixed(1);
  let badgeColor = '';
  let badgeLabel = '';
  let dotColor = '';

  if (daysLeft < 30) {
    badgeColor = 'rgba(239, 68, 68, 0.1)';
    badgeLabel = `Immediate Purge (${daysLeft}d left)`;
    dotColor = '#ef4444';
  } else if (daysLeft < 365) {
    badgeColor = 'rgba(245, 158, 11, 0.1)';
    badgeLabel = `Nearing Expire (${years} yr left)`;
    dotColor = '#f59e0b';
  } else {
    badgeColor = 'rgba(16, 185, 129, 0.1)';
    badgeLabel = `Archived (${years} yr left)`;
    dotColor = '#10b981';
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      background: badgeColor,
      color: 'var(--text-primary)',
      padding: '4px 8px',
      borderRadius: '6px',
      fontSize: '0.72rem',
      fontWeight: 500,
      border: '1px solid rgba(255,255,255,0.05)'
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColor }} />
      {badgeLabel}
    </span>
  );
}

// 2. Main Document Lifecycle Container / Panels
interface DocumentLifecycleProps {
  caseInstanceId: string;
  documents: ShipmentDoc[];
  onRefresh: () => void;
}

export default function DocumentLifecycle({ caseInstanceId, documents, onRefresh }: DocumentLifecycleProps) {
  const { userEmail, activeRole } = useAuth();
  const [selectedDoc, setSelectedDoc] = useState<ShipmentDoc | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<RequiredDocType>('Commercial Invoice');
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  const handleDownloadOriginal = async (doc: ShipmentDoc) => {
    setDownloadingDocId(doc.id);
    try {
      const fileNameMap: Record<string, string> = {
        'Commercial Invoice': 'commercial_invoice.pdf',
        'Packing List': 'packing_list.pdf',
        'Bill of Lading': 'bill_of_lading.pdf',
        'Certificate of Origin': 'certificate_of_origin.pdf',
      };
      const fileName = fileNameMap[doc.documentType] || (doc.documentType.toLowerCase().replace(/\s+/g, '_') + '.pdf');
      const url = await getDocumentDownloadUrl(fileName);
      window.open(url, '_blank');
    } catch (err: any) {
      alert('Failed to get download URL from Storage Bucket: ' + err.message);
    } finally {
      setDownloadingDocId(null);
    }
  };

  // Compute status metrics
  const uploadedTypesMap = new Map(documents.map(d => [d.documentType, d]));
  const completenessCount = REQUIRED_DOCUMENT_TYPES.filter(type => uploadedTypesMap.has(type)).length;
  const completenessPercent = Math.round((completenessCount / REQUIRED_DOCUMENT_TYPES.length) * 100);

  // Handle Drag & Drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const triggerUpload = async (file: File) => {
    setUploading(true);
    try {
      const uploaderName = userEmail || 'shipper.ops@tradeflow.ai';
      await uploadDocument(caseInstanceId, selectedDocType, file, uploaderName);
      onRefresh();
      // Auto select first missing type
      const remainingTypes = REQUIRED_DOCUMENT_TYPES.filter(type => type !== selectedDocType && !uploadedTypesMap.has(type));
      if (remainingTypes.length > 0) {
        setSelectedDocType(remainingTypes[0]);
      }
    } catch (e: any) {
      alert('Failed to upload: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      triggerUpload(e.dataTransfer.files[0]);
    }
  }, [selectedDocType, documents]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      triggerUpload(e.target.files[0]);
    }
  };

  const handleDelete = async (docId: string) => {
    if (activeRole !== 'admin') {
      alert('Access Denied: Only System Administrators can remove documents from archives.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this document? This will remove it from Data Fabric archives.')) return;
    try {
      await deleteDocument(docId);
      if (selectedDoc?.id === docId) setSelectedDoc(null);
      onRefresh();
    } catch (e: any) {
      alert('Delete failed: ' + e.message);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selectedDoc ? '1.2fr 0.8fr' : '1fr', gap: '24px', transition: 'all 0.3s' }}>
      
      {/* Document Control Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Metric Bar */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} style={{ color: 'var(--accent-primary)' }} />
              Shipment Document completeness Gate
            </h3>
            <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '4px' }}>
              Checked against 9 mandatory CBP/PGA filing categories.
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
              {completenessPercent}%
            </span>
            <div style={{ width: '120px', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${completenessPercent}%`, height: '100%', background: 'var(--accent-gradient)', borderRadius: '4px' }} />
            </div>
            <span className="text-secondary" style={{ fontSize: '0.82rem' }}>
              ({completenessCount}/9 Files)
            </span>
          </div>
        </div>

        {/* Drag Drop Uploader */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Upload Shipment File</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span className="text-secondary" style={{ fontSize: '0.75rem' }}>Select Document Category:</span>
              <select
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value as RequiredDocType)}
                style={{
                  padding: '8px 12px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  borderRadius: '6px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {REQUIRED_DOCUMENT_TYPES.map(type => (
                  <option key={type} value={type} disabled={uploadedTypesMap.has(type)}>
                    {type} {uploadedTypesMap.has(type) ? '✓ (Received)' : ''}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              onClick={onRefresh}
              className="btn btn-secondary"
              style={{ alignSelf: 'flex-end', height: '38px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} /> Sync Docs
            </button>
          </div>

          {/* Upload Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragActive ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
              borderRadius: '8px',
              padding: '32px',
              textAlign: 'center',
              background: dragActive ? 'rgba(41, 69, 134, 0.05)' : 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.2s'
            }}
          >
            <input
              type="file"
              id="doc-file-input"
              multiple={false}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              disabled={uploading}
            />
            <label htmlFor="doc-file-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              {uploading ? (
                <RefreshCw size={32} className="animate-spin text-gradient" />
              ) : (
                <Upload size={32} className="text-secondary" />
              )}
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  {uploading ? 'Processing File through IDP Engine...' : 'Drag & Drop document or Click to Browse'}
                </p>
                <p className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                  Supports PDF, PNG, JPG (Max 5MB). Auto extracts fields with AI.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* 9-Document Completeness Checklist */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Requirement Checklist</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {REQUIRED_DOCUMENT_TYPES.map((type) => {
              const doc = uploadedTypesMap.get(type);
              
              return (
                <div 
                  key={type}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: doc ? 'rgba(16, 185, 129, 0.03)' : 'rgba(255,255,255,0.01)',
                    border: '1px solid var(--glass-border)',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    {doc ? (
                      <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                    ) : (
                      <AlertCircle size={16} style={{ color: 'var(--text-secondary)', opacity: 0.5, flexShrink: 0 }} />
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: doc ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {type}
                      </span>
                      {doc && (
                        <span className="text-secondary" style={{ fontSize: '0.72rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginTop: '1px' }}>
                          {doc.fileName} &bull; {doc.fileSize}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    {doc ? (
                      <>
                        <RetentionBadge daysLeft={doc.retentionDaysLeft} />
                        <span style={{
                          fontSize: '0.72rem',
                          background: doc.idpConfidence >= 95 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 600
                        }}>
                          AI: {doc.idpConfidence}%
                        </span>
                        
                        <button
                          title="Inspect extracted fields"
                          onClick={() => setSelectedDoc(doc)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            padding: '4px'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                        >
                          <Eye size={15} />
                        </button>
                        
                        <button
                          title="Delete from Data Fabric archives"
                          onClick={() => handleDelete(doc.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            padding: '4px'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', opacity: 0.5, fontStyle: 'italic' }}>
                        Missing
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 3. Extraction Viewer Side Panel */}
      {selectedDoc && (
        <div className="glass-panel animate-slide-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', height: 'fit-content' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} style={{ color: 'var(--accent-primary)' }} />
                IDP Extraction Viewer
              </h3>
              <p className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                {selectedDoc.documentType}
              </p>
            </div>
            
            <button 
              onClick={() => setSelectedDoc(null)} 
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                color: 'var(--text-primary)',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
            >
              Close
            </button>
          </div>

          {/* AI confidence block */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--glass-border)',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span className="text-secondary" style={{ fontSize: '0.7rem' }}>Document Integrity</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>AI Extraction Confidence</span>
            </div>
            <div style={{
              background: selectedDoc.idpConfidence >= 95 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              color: selectedDoc.idpConfidence >= 95 ? '#10b981' : '#f59e0b',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: 700
            }}>
              {selectedDoc.idpConfidence}%
            </div>
          </div>

          {/* Extracted Fields list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--glass-border)', paddingBottom: '4px' }}>
              EXTRACTED FIELDS
            </span>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(selectedDoc.extractionData).map(([key, val]) => (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span className="text-secondary" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span style={{
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    background: 'rgba(0,0,0,0.1)',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: '1px solid rgba(255,255,255,0.02)',
                    wordBreak: 'break-all'
                  }}>
                    {String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Retention status Policy metadata */}
          <div style={{
            background: 'rgba(255,255,255,0.01)',
            border: '1px dashed var(--glass-border)',
            borderRadius: '8px',
            padding: '16px',
            fontSize: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={13} />
              Retention Policy details
            </strong>
            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Federal Trade Compliance requires standard import paperwork to be archived in Data Fabric records for a minimum of 5 years (CBP watch-lists require 7 years).
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <span className="text-secondary">Uploaded By:</span>
              <span style={{ fontWeight: 500 }}>{selectedDoc.uploadedBy}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-secondary">Uploaded At:</span>
              <span style={{ fontWeight: 500 }}>{new Date(selectedDoc.uploadedAt).toLocaleDateString()}</span>
            </div>
          </div>

          <button 
            onClick={() => handleDownloadOriginal(selectedDoc)}
            disabled={downloadingDocId === selectedDoc.id}
            className="btn btn-primary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px' }}
          >
            {downloadingDocId === selectedDoc.id ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />} 
            {downloadingDocId === selectedDoc.id ? 'Downloading...' : 'Download Original Document'}
          </button>

        </div>
      )}

    </div>
  );
}

// 3. Admin Retention Dashboard View (Blueprint v3)
export function RetentionDashboard() {
  const [search, setSearch] = useState('');
  
  // Flatten mock documents across cases for admin overview
  const allDocs = [
    { id: 'doc-1', caseRef: 'TF-88201', fileName: 'commercial_invoice_CI-88201.pdf', type: 'Commercial Invoice', daysLeft: 2550, size: '428 KB', uploadedBy: 'shipper.ops@tradeflow.ai' },
    { id: 'doc-2', caseRef: 'TF-88201', fileName: 'bill_of_lading_BL-88201.pdf', type: 'Bill of Lading', daysLeft: 1820, size: '1.2 MB', uploadedBy: 'logistics.ff@tradeflow.ai' },
    { id: 'doc-3', caseRef: 'TF-88201', fileName: 'packing_list_PL-88201.pdf', type: 'Packing List', daysLeft: 2190, size: '315 KB', uploadedBy: 'shipper.ops@tradeflow.ai' },
    { id: 'doc-4', caseRef: 'TF-88201', fileName: 'certificate_of_origin_CO-4819.pdf', type: 'Certificate of Origin', daysLeft: 2555, size: '582 KB', uploadedBy: 'shipper.ops@tradeflow.ai' },
    { id: 'doc-5', caseRef: 'TF-10023', fileName: 'commercial_invoice_CI-10023.pdf', type: 'Commercial Invoice', daysLeft: 2900, size: '410 KB', uploadedBy: 'shipper.ops@tradeflow.ai' }
  ];

  const filtered = allDocs.filter(d => 
    d.fileName.toLowerCase().includes(search.toLowerCase()) || 
    d.caseRef.toLowerCase().includes(search.toLowerCase()) || 
    d.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={20} style={{ color: 'var(--accent-primary)' }} />
          Federal Trade Document Retention Dashboard
        </h2>
        <p className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
          System administrator portal monitoring audit retention timelines across all Data Fabric document records.
        </p>
      </div>

      <input
        type="text"
        placeholder="Filter by Case Ref, File Name, or Doc Type..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          padding: '8px 12px',
          background: 'var(--bg-primary)',
          border: '1px solid var(--glass-border)',
          color: 'var(--text-primary)',
          borderRadius: '6px',
          outline: 'none',
          fontSize: '0.85rem'
        }}
      />

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
            <th style={{ padding: '10px' }}>Case Ref</th>
            <th style={{ padding: '10px' }}>File Name</th>
            <th style={{ padding: '10px' }}>Doc Type</th>
            <th style={{ padding: '10px' }}>Uploader</th>
            <th style={{ padding: '10px' }}>Policy Status / Life Left</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(d => (
            <tr key={d.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <td style={{ padding: '12px 10px', fontFamily: 'monospace', fontWeight: 600 }}>{d.caseRef}</td>
              <td style={{ padding: '12px 10px' }}>{d.fileName}</td>
              <td style={{ padding: '12px 10px', fontWeight: 500 }}>{d.type}</td>
              <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{d.uploadedBy}</td>
              <td style={{ padding: '12px 10px' }}>
                <RetentionBadge daysLeft={d.daysLeft} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
