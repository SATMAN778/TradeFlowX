import { useState } from 'react';
import { FileText, Download, ShieldCheck } from 'lucide-react';
import type { MyTask } from '../types/cases';

interface S3DocumentViewerProps {
  task: MyTask | null;
  caseData?: any;
}

export default function S3DocumentViewer({ task }: S3DocumentViewerProps) {
  const [activeTab, setActiveTab] = useState<'ci' | 'bl' | 'pl' | 'co'>('ci');
  
  // Extract info from task data or use default fallbacks
  const data = task?.data || {};
  const poNumber = data.poNumber || "PO-991204";
  const supplierName = data.supplierName || "Al-Ghurair Industrial LLC";
  const supplierAddress = data.supplierAddress || "Plot S30219, JAFZA Free Zone, Dubai, UAE";
  const goodsDescription = data.goodsDescription || "Industrial anodized aluminum sheets & coils";
  const incoterms = data.incoterms || "CIF Newark";
  const containerNo = data.containerNumber || "MSKU8842109";
  const vesselName = data.vesselName || "Maersk Horizon";
  const voyageNo = data.voyageNumber || "V-2604N";
  const portOfEntry = data.portOfEntry || "Port of Newark, NJ";
  const htsCode = data.declaredHtsCode || data.htsCode || "7606.12.3030";
  const declaredOrigin = data.declaredCountryOfOrigin || data.originDeclared || "UAE";
  
  // Handle discrepancy task net weights
  const ciWeight = data.commercialInvoiceNetWeight || "22,400 kg";
  const plWeight = data.packingListNetWeight || "22,850 kg";

  // Mock S3 URIs
  const s3Uris = {
    ci: `s3://tradeflow-maestro-docs/${task?.caseInstanceId || 'TF-88201'}/commercial_invoice_CI-${poNumber.replace('PO-', '')}.pdf`,
    bl: `s3://tradeflow-maestro-docs/${task?.caseInstanceId || 'TF-88201'}/bill_of_lading_BL-${containerNo.slice(-6)}.pdf`,
    pl: `s3://tradeflow-maestro-docs/${task?.caseInstanceId || 'TF-88201'}/packing_list_PL-${poNumber.replace('PO-', '')}.pdf`,
    co: `s3://tradeflow-maestro-docs/${task?.caseInstanceId || 'TF-88201'}/certificate_of_origin_CO-4819.pdf`,
  };

  const currentUri = s3Uris[activeTab];

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
      {/* S3 URI Header */}
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
          }}>S3 Source</span>
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
          onClick={() => alert(`Downloading from S3:\n${currentUri}`)}
        >
          <Download size={12} /> Download
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
          ['co', 'Certificate of Origin']
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

      {/* Paper Canvas (PDF viewport simulation) */}
      <div style={{
        flex: 1,
        padding: '24px',
        overflowY: 'auto',
        background: '#475569', // Gray slate background representing PDF reader canvas
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '700px',
          background: 'white',
          color: '#1e293b',
          boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
          borderRadius: '2px',
          padding: '40px',
          fontFamily: '"Courier New", Courier, monospace', // Typewriter courier font for retro cargo doc feel
          fontSize: '0.82rem',
          lineHeight: '1.4',
          position: 'relative',
          minHeight: '800px',
          border: '1px solid #cbd5e1'
        }}>
          {/* Watermark/Stamp */}
          <div style={{
            position: 'absolute',
            top: '40px',
            right: '40px',
            border: '2px solid #ef4444',
            borderRadius: '4px',
            padding: '6px 12px',
            color: '#ef4444',
            fontSize: '0.75rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            transform: 'rotate(5deg) scale(0.95)',
            opacity: 0.8,
            fontFamily: 'sans-serif'
          }}>
            Maestro Verified
          </div>

          {/* Render Tab Contents */}
          {activeTab === 'ci' && (
            <div>
              {/* Header */}
              <div style={{ borderBottom: '2px solid #000', paddingBottom: '16px', marginBottom: '20px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '2px' }}>COMMERCIAL INVOICE</h1>
                <p style={{ margin: 0, fontSize: '0.75rem' }}>Invoice No: CI-{poNumber.replace('PO-', '')} &bull; Date: {new Date().toLocaleDateString()}</p>
              </div>

              {/* Shippers info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div style={{ border: '1px solid #000', padding: '10px' }}>
                  <strong style={{ fontSize: '0.75rem', borderBottom: '1px solid #000', display: 'block', paddingBottom: '4px', marginBottom: '6px' }}>1. EXPORTER / SHIPPER</strong>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{supplierName}</p>
                  <p style={{ margin: '4px 0 0 0', whiteSpace: 'pre-line' }}>{supplierAddress}</p>
                </div>
                <div style={{ border: '1px solid #000', padding: '10px' }}>
                  <strong style={{ fontSize: '0.75rem', borderBottom: '1px solid #000', display: 'block', paddingBottom: '4px', marginBottom: '6px' }}>2. IMPORTER OF RECORD / CONSIGNEE</strong>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>US Import Corporation</p>
                  <p style={{ margin: '4px 0 0 0' }}>100 Port Street, Terminal 4<br />Newark, NJ 07114, USA<br />EIN: 12-3456789</p>
                </div>
              </div>

              {/* Transport info */}
              <div style={{ border: '1px solid #000', padding: '10px', marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <strong>PO Number:</strong><br />{poNumber}
                </div>
                <div>
                  <strong>Port of Loading:</strong><br />Jebel Ali, Dubai (AEJEA)
                </div>
                <div>
                  <strong>Port of Entry:</strong><br />{portOfEntry}
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #000', borderTop: '2px solid #000' }}>
                    <th style={{ textAlign: 'left', padding: '8px 0' }}>No.</th>
                    <th style={{ textAlign: 'left', padding: '8px 0' }}>Description of Goods</th>
                    <th style={{ textAlign: 'left', padding: '8px 0' }}>HTS Code</th>
                    <th style={{ textAlign: 'right', padding: '8px 0' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '8px 0' }}>Price (USD)</th>
                    <th style={{ textAlign: 'right', padding: '8px 0' }}>Total (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #ccc' }}>
                    <td style={{ padding: '8px 0', verticalAlign: 'top' }}>01</td>
                    <td style={{ padding: '8px 0', verticalAlign: 'top', paddingRight: '12px' }}>{goodsDescription}</td>
                    <td style={{ padding: '8px 0', verticalAlign: 'top' }}>{htsCode.substring(0, 9)}</td>
                    <td style={{ padding: '8px 0', verticalAlign: 'top', textAlign: 'right' }}>180 Pcs</td>
                    <td style={{ padding: '8px 0', verticalAlign: 'top', textAlign: 'right' }}>$500.00</td>
                    <td style={{ padding: '8px 0', verticalAlign: 'top', textAlign: 'right' }}>$90,000.00</td>
                  </tr>
                </tbody>
              </table>

              {/* Totals */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '32px' }}>
                <div style={{ width: '250px', border: '1px solid #000', padding: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Subtotal:</span>
                    <span>$90,000.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Incoterms:</span>
                    <span>{incoterms}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: '4px', marginTop: '6px' }}>
                    <span>TOTAL VALUE:</span>
                    <span>$90,000.00</span>
                  </div>
                </div>
              </div>

              {/* Weight Details */}
              <div style={{ fontSize: '0.75rem', borderTop: '1px dashed #000', paddingTop: '10px' }}>
                <p style={{ margin: '0 0 4px 0' }}><strong>Declared Country of Origin:</strong> {declaredOrigin}</p>
                <p style={{ margin: '0 0 4px 0' }}><strong>Net Weight:</strong> {ciWeight}</p>
                <p style={{ margin: '0 0 4px 0' }}><strong>Gross Weight:</strong> 23,650 kg</p>
              </div>
            </div>
          )}

          {activeTab === 'bl' && (
            <div>
              {/* Carrier */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '20px' }}>
                <div>
                  <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0 }}>MAERSK LINE</h1>
                  <span style={{ fontSize: '0.65rem' }}>OCEAN CARRIER &bull; BILL OF LADING</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>B/L No:</strong> {containerNo}<br />
                  <strong>Booking Ref:</strong> M-REF99104
                </div>
              </div>

              {/* Parties */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', border: '1px solid #000' }}>
                <div style={{ padding: '8px', borderRight: '1px solid #000' }}>
                  <strong style={{ fontSize: '0.7rem', display: 'block', marginBottom: '4px' }}>SHIPPER / EXPORTER</strong>
                  {supplierName}<br />
                  JAFZA Free Zone, Dubai, UAE
                </div>
                <div style={{ padding: '8px' }}>
                  <strong style={{ fontSize: '0.7rem', display: 'block', marginBottom: '4px' }}>CONSIGNEE / NOTIFY PARTY</strong>
                  US Import Corporation<br />
                  Newark, NJ, USA
                </div>
              </div>

              {/* Voyage Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', padding: '8px', border: '1px solid #000', marginBottom: '24px', fontSize: '0.75rem' }}>
                <div>
                  <strong>Pre-Carriage By:</strong><br />Road Transport
                </div>
                <div>
                  <strong>Vessel / Voyage:</strong><br />{vesselName} / {voyageNo}
                </div>
                <div>
                  <strong>Port of Loading:</strong><br />Jebel Ali Port, UAE
                </div>
                <div>
                  <strong>Port of Discharge:</strong><br />Port of Newark, USA
                </div>
              </div>

              {/* Cargo Details */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #000', borderTop: '2px solid #000' }}>
                    <th style={{ textAlign: 'left', padding: '8px 0' }}>Container &amp; Seal No.</th>
                    <th style={{ textAlign: 'left', padding: '8px 0' }}>Marks &amp; Numbers</th>
                    <th style={{ textAlign: 'left', padding: '8px 0' }}>Description of Cargo</th>
                    <th style={{ textAlign: 'right', padding: '8px 0' }}>Gross Weight</th>
                    <th style={{ textAlign: 'right', padding: '8px 0' }}>Measurement</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #ccc' }}>
                    <td style={{ padding: '8px 0', verticalAlign: 'top' }}>
                      Container: {containerNo}<br />
                      Seal: MSK-9284102
                    </td>
                    <td style={{ padding: '8px 0', verticalAlign: 'top' }}>
                      I.R.O.C.<br />
                      NEWARK
                    </td>
                    <td style={{ padding: '8px 0', verticalAlign: 'top', paddingRight: '12px' }}>
                      1 x 40 FT Container STC:<br />
                      {goodsDescription}
                    </td>
                    <td style={{ padding: '8px 0', verticalAlign: 'top', textAlign: 'right' }}>23,650 Kg</td>
                    <td style={{ padding: '8px 0', verticalAlign: 'top', textAlign: 'right' }}>65.4 CBM</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', fontSize: '0.72rem' }}>
                <div>
                  <strong>FREIGHT PREPAID</strong><br />
                  Released at Dubai Office
                </div>
                <div style={{ textAlign: 'right', borderTop: '1px solid #000', width: '200px', paddingTop: '6px' }}>
                  <span>For MAERSK LINE as Carrier</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pl' && (
            <div>
              {/* Header */}
              <div style={{ borderBottom: '2px solid #000', paddingBottom: '16px', marginBottom: '20px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '2px' }}>PACKING LIST</h1>
                <p style={{ margin: 0, fontSize: '0.75rem' }}>Ref No: PL-{poNumber.replace('PO-', '')} &bull; Date: {new Date().toLocaleDateString()}</p>
              </div>

              {/* Transport Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', fontSize: '0.75rem' }}>
                <div>
                  <strong>Exporter:</strong> {supplierName}<br />
                  <strong>Consignee:</strong> US Import Corporation
                </div>
                <div>
                  <strong>Invoice No:</strong> CI-{poNumber.replace('PO-', '')}<br />
                  <strong>Container Number:</strong> {containerNo}
                </div>
              </div>

              {/* Items Weight Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #000', borderTop: '2px solid #000' }}>
                    <th style={{ textAlign: 'left', padding: '8px 0' }}>Pkg No.</th>
                    <th style={{ textAlign: 'left', padding: '8px 0' }}>Description</th>
                    <th style={{ textAlign: 'right', padding: '8px 0' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '8px 0' }}>Net Wt (Kg)</th>
                    <th style={{ textAlign: 'right', padding: '8px 0' }}>Gross Wt (Kg)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #ccc' }}>
                    <td style={{ padding: '8px 0' }}>Pallets 1-6</td>
                    <td style={{ padding: '8px 0' }}>Anodized aluminum alloy coils (grade 6061-T6)</td>
                    <td style={{ padding: '8px 0', textAlign: 'right' }}>180 rolls</td>
                    <td style={{ padding: '8px 0', textAlign: 'right' }}>{plWeight.replace(' kg', '').replace(' Kg', '')}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right' }}>23,650</td>
                  </tr>
                </tbody>
              </table>

              {/* Summary */}
              <div style={{ border: '1px solid #000', padding: '12px', fontSize: '0.75rem' }}>
                <strong>TOTAL WEIGHT SUMMARY:</strong><br />
                Total Packages: 6 Pallets<br />
                Total Net Weight: <span style={{ color: plWeight !== ciWeight ? '#dc2626' : 'inherit', fontWeight: plWeight !== ciWeight ? 'bold' : 'normal' }}>{plWeight}</span> (Measured at loading scale)<br />
                Total Gross Weight: 23,650 kg
              </div>
            </div>
          )}

          {activeTab === 'co' && (
            <div style={{ border: '2px double #000', padding: '16px', height: '100%' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px solid #000', paddingBottom: '16px', marginBottom: '20px' }}>
                <h1 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 4px 0' }}>CERTIFICATE OF ORIGIN</h1>
                <h2 style={{ fontSize: '0.9rem', fontWeight: 'bold', margin: '0 0 8px 0', color: '#1e3a8a' }}>DUBAI CHAMBER OF COMMERCE</h2>
                <p style={{ margin: 0, fontSize: '0.7rem' }}>CHAMBER REF: DCC-CO-2026-481920</p>
              </div>

              <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p>
                  We hereby certify that the goods detailed below were manufactured and processed in:
                  <br />
                  <strong style={{ fontSize: '1rem', display: 'block', margin: '4px 0', textDecoration: 'underline' }}>UNITED ARAB EMIRATES ({declaredOrigin})</strong>
                </p>

                <div style={{ border: '1px solid #000', padding: '8px' }}>
                  <strong>Produced by:</strong> {supplierName}<br />
                  <strong>Address:</strong> {supplierAddress}
                </div>

                <div style={{ border: '1px solid #000', padding: '8px' }}>
                  <strong>Consigned to:</strong> US Import Corporation, Newark, NJ, USA
                </div>

                <div style={{ border: '1px solid #000', padding: '8px' }}>
                  <strong>Description of Cargo:</strong><br />
                  {goodsDescription}<br />
                  Exporting invoice: CI-{poNumber.replace('PO-', '')}
                </div>

                <p style={{ marginTop: '20px', fontStyle: 'italic', fontSize: '0.7rem', lineHeight: '1.5' }}>
                  Substantial Transformation Certification: The goods undergo substantial transformation and value addition at Jebel Ali Free Zone (JAFZA) Dubai, UAE, in accordance with the regulations of the Department of Economic Development.
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#047857' }}>
                    <ShieldCheck size={18} /> Verified Origin Certificate
                  </div>
                  <div style={{ borderTop: '1px solid #000', width: '220px', textAlign: 'center', paddingTop: '4px', fontSize: '0.7rem' }}>
                    Dubai Chamber of Commerce Authorized Officer
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
