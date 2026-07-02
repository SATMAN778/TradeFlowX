import { useState, useEffect } from 'react';
import { FileText, Download, RefreshCw } from 'lucide-react';
import type { MyTask } from '../types/cases';
import { getDocumentDownloadUrl } from '../services/casesService';

interface S3DocumentViewerProps {
  task: MyTask | null;
  caseData?: any;
}

export default function S3DocumentViewer({ task }: S3DocumentViewerProps) {
  const [activeTab, setActiveTab] = useState<'ci' | 'bl' | 'pl' | 'co' | 'an' | 'fi' | 'isf'>('ci');
  const [downloading, setDownloading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  // Bucket file names mapping
  const bucketFileNames = {
    ci: 'Invoice_S01_GPC-INV-2025-0847.pdf',
    bl: 'BOL_S01_MSCU7741839UAE.pdf',
    pl: 'PackingList_S01_GPC-INV-2025-0847.pdf',
    co: 'COO_S01_DCOC-2025-COO-41892.pdf',
    an: 'ArrivalNotice_S01_AN-S01-41839UAE.pdf',
    fi: 'FreightInvoice_S01_TALS-FI-S01-0847.pdf',
    isf: 'ISF_S01_ISF-S01-2025-839UAE.pdf',
  };

  const currentFileName = bucketFileNames[activeTab];
  const currentUri = `orchestrator://TradeFlow/${currentFileName}`;

  useEffect(() => {
    let active = true;
    const fetchPdfUrl = async () => {
      setLoadingPdf(true);
      try {
        const url = await getDocumentDownloadUrl(currentFileName);
        if (active) {
          setPdfUrl(url);
        }
      } catch (err) {
        console.error("Failed to fetch PDF URL:", err);
        if (active) {
          setPdfUrl(null);
        }
      } finally {
        if (active) {
          setLoadingPdf(false);
        }
      }
    };
    fetchPdfUrl();
    return () => {
      active = false;
    };
  }, [activeTab]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const url = await getDocumentDownloadUrl(currentFileName);
      window.open(url, '_blank');
    } catch (err: any) {
      alert('Failed to get download URL from Orchestrator storage bucket: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--bg-primary)',
      border: '1px solid var(--glass-border)',
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      {/* Storage Bucket URI Header */}
      <div style={{
        background: 'rgba(41, 69, 134, 0.05)',
        borderBottom: '1px solid var(--glass-border)',
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span style={{
            background: 'var(--accent-gradient)',
            color: 'white',
            fontSize: '0.65rem',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>Storage Bucket</span>
          <span style={{
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {currentUri}
          </span>
        </div>
        <button 
          title="Download original document"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--glass-border)',
            borderRadius: '6px',
            padding: '4px 8px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />} Download
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        background: 'var(--glass-bg)',
        borderBottom: '1px solid var(--glass-border)',
        padding: '0 8px',
        overflowX: 'auto',
        gap: '4px'
      }}>
        {([
          ['ci', 'Commercial Invoice'],
          ['bl', 'Bill of Lading'],
          ['pl', 'Packing List'],
          ['co', 'Certificate of Origin'],
          ['an', 'Arrival Notice'],
          ['fi', 'Freight Invoice'],
          ['isf', 'ISF Filing']
        ] as const).map(([tabId, label]) => {
          const isActive = activeTab === tabId;
          return (
            <button
              key={tabId}
              onClick={() => setActiveTab(tabId)}
              style={{
                background: isActive ? 'var(--bg-primary)' : 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                padding: '12px 16px',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              <FileText size={14} style={{ color: isActive ? 'var(--accent-primary)' : 'inherit' }} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Document Viewport - Renders the actual PDF file loaded from Storage Bucket */}
      <div style={{
        flex: 1,
        background: '#475569',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {loadingPdf ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'white',
            gap: '12px'
          }}>
            <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Loading Document from Storage Bucket...</span>
          </div>
        ) : pdfUrl ? (
          <iframe 
            src={`${pdfUrl}#toolbar=1`} 
            title={currentFileName}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: 'white'
            }}
          />
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-secondary)',
            gap: '8px'
          }}>
            <FileText size={32} style={{ opacity: 0.5 }} />
            <span style={{ fontSize: '0.85rem' }}>No document file available in Storage Bucket</span>
          </div>
        )}
      </div>
    </div>
  );
}
