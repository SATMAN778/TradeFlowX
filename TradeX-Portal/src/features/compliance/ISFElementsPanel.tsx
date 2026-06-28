// src/features/compliance/ISFElementsPanel.tsx — 10+2 elements with fill status
import type { IsfFilingRecord } from '../../types/entities';
import { useSLATimer } from '../../hooks/useSLATimer';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

const ISF_FIELD_MAP = [
  { key: 'SellerNameAddress',      label: 'Seller Name & Address',      element: '1' },
  { key: 'BuyerNameAddress',       label: 'Buyer Name & Address',        element: '2' },
  { key: 'ImporterOfRecord',       label: 'Importer of Record',          element: '3' },
  { key: 'ConsigneeNameAddress',   label: 'Consignee Name & Address',    element: '4' },
  { key: 'ManufacturerNameAddress',label: "Manufacturer's Name & Address", element: '5' },
  { key: 'ShipToParty',            label: 'Ship-To Party',               element: '6' },
  { key: 'CountryOfOrigin',        label: 'Country of Origin',           element: '7' },
  { key: 'HtsCode',                label: 'HTS Code',                    element: '8' },
  { key: 'ContainerStuffingLocation', label: 'Container Stuffing Location', element: '9' },
  { key: 'ConsolidatorName',       label: 'Consolidator Name',           element: '10' },
] as const;

// "2" additional ISF elements (carrier-provided)
const ISF_CARRIER = [
  { key: 'bill_of_lading', label: 'Bill of Lading Number' },
  { key: 'foreign_port_unlading', label: 'Foreign Port of Unlading' },
];

interface ISFElementsPanelProps {
  isf: IsfFilingRecord;
}

export const ISFElementsPanel = ({ isf }: ISFElementsPanelProps) => {
  const sla = useSLATimer(isf.DeadlineUtc || new Date(Date.now() + 86400000).toISOString());

  const getFieldStatus = (key: string): 'filled' | 'missing' => {
    const val = (isf as any)[key];
    return val && String(val).trim() ? 'filled' : 'missing';
  };

  const filledCount = ISF_FIELD_MAP.filter(f => getFieldStatus(f.key) === 'filled').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Status header */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '0.8rem', fontWeight: 700, padding: '4px 10px', borderRadius: '6px',
          background: isf.FilingStatus === 'SUBMITTED' ? 'rgba(22,163,74,0.15)' : 'rgba(217,119,6,0.15)',
          color: isf.FilingStatus === 'SUBMITTED' ? '#22c55e' : '#d97706',
        }}>
          {isf.FilingStatus || 'PENDING'}
        </span>
        {isf.AceTxnNumber && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ACE TXN: <strong>{isf.AceTxnNumber}</strong></span>
        )}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: sla.urgency === 'ok' ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
          <Clock size={12} /> {sla.label}
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{filledCount}/10 elements complete</span>
      </div>

      {/* SLA bar */}
      <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${sla.pct}%`, background: sla.pct > 50 ? '#22c55e' : sla.pct > 25 ? '#d97706' : '#ef4444', borderRadius: '3px' }} />
      </div>

      {/* ISF 10 elements */}
      <div>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
          Importer-Provided Elements (10)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {ISF_FIELD_MAP.map(field => {
            const status = getFieldStatus(field.key);
            const value = (isf as any)[field.key];
            return (
              <div key={field.key} style={{
                display: 'flex', gap: '10px', alignItems: 'flex-start',
                padding: '8px 12px', borderRadius: '6px',
                background: status === 'filled' ? 'rgba(22,163,74,0.05)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${status === 'filled' ? '#16a34a30' : 'var(--glass-border)'}`,
              }}>
                <div style={{ marginTop: '1px' }}>
                  {status === 'filled'
                    ? <CheckCircle2 size={14} color="#22c55e" />
                    : <XCircle size={14} color="#6b7280" />
                  }
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    #{field.element} {field.label}
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, marginTop: '2px', color: status === 'filled' ? 'var(--text-primary)' : '#6b7280' }}>
                    {value || 'Not provided'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Carrier-provided 2 */}
      <div>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
          Carrier-Provided Elements (+2)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {ISF_CARRIER.map(f => (
            <div key={f.key} style={{
              padding: '8px 12px', borderRadius: '6px', display: 'flex', gap: '10px', alignItems: 'center',
              background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)',
            }}>
              <Clock size={14} color="#d97706" />
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{f.label}</div>
                <div style={{ fontSize: '0.82rem', color: '#d97706' }}>Carrier-provided</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
