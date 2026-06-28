// src/features/compliance/OFACPartyTable.tsx — Screened parties with match scores
import type { OfacScreeningRecord } from '../../types/entities';

interface OFACPartyTableProps {
  records: OfacScreeningRecord[];
}

const matchResultStyles: Record<string, { bg: string; color: string; label: string }> = {
  'CLEAR':          { bg: 'rgba(22,163,74,0.1)',  color: '#22c55e', label: 'Clear' },
  'FUZZY_MATCH':    { bg: 'rgba(217,119,6,0.1)',  color: '#d97706', label: 'Fuzzy Match' },
  'CONFIRMED_HIT':  { bg: 'rgba(220,38,38,0.15)', color: '#ef4444', label: 'Confirmed Hit' },
  'PENDING_REVIEW': { bg: 'rgba(99,102,241,0.1)', color: '#818cf8', label: 'Under Review' },
};

export const OFACPartyTable = ({ records }: OFACPartyTableProps) => {
  if (!records.length) {
    return (
      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
        No OFAC screening records found.
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase' }}>
            <th style={{ padding: '10px 12px' }}>Party Name</th>
            <th style={{ padding: '10px 12px' }}>Role</th>
            <th style={{ padding: '10px 12px' }}>Country</th>
            <th style={{ padding: '10px 12px' }}>Match Score</th>
            <th style={{ padding: '10px 12px' }}>Result</th>
            <th style={{ padding: '10px 12px' }}>Matched Entry</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => {
            const style = matchResultStyles[r.MatchResult] || matchResultStyles['CLEAR'];
            const score = r.MatchScore || 0;
            return (
              <tr key={r.id || i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ padding: '12px', fontWeight: 600, fontSize: '0.875rem' }}>{r.PartyName}</td>
                <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{r.PartyRole}</td>
                <td style={{ padding: '12px', fontSize: '0.875rem' }}>{r.PartyCountry || '—'}</td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '60px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${score}%`, background: score >= 85 ? '#ef4444' : score >= 60 ? '#d97706' : '#22c55e', borderRadius: '3px' }} />
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: score >= 85 ? '#ef4444' : score >= 60 ? '#d97706' : '#22c55e' }}>{score}%</span>
                  </div>
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: style.bg, color: style.color }}>
                    {style.label}
                  </span>
                </td>
                <td style={{ padding: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{r.MatchedSdnEntry || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
