import { Activity, ShieldCheck, CheckCircle2, RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface Connector {
  name: string;
  type: string;
  status: 'healthy' | 'warning' | 'degraded';
  latency: string;
}

export default function ConnectorStatus() {
  const [refreshing, setRefreshing] = useState(false);
  const [connectors, setConnectors] = useState<Connector[]>([
    { name: 'CBP ACE Gateways', type: 'US Customs Integration', status: 'healthy', latency: '124 ms' },
    { name: 'OFAC SDN screening API', type: 'Treasury Watchlist Sync', status: 'healthy', latency: '85 ms' },
    { name: 'USITC Tariff Database', type: 'HTS lookup Engine', status: 'healthy', latency: '210 ms' },
    { name: 'ERP NetSuite API', type: 'Order & AP Posting Ledger', status: 'healthy', latency: '145 ms' }
  ]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setConnectors(prev => prev.map(c => ({
        ...c,
        latency: `${Math.floor(80 + Math.random() * 150)} ms`
      })));
      setRefreshing(false);
    }, 800);
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} style={{ color: 'var(--accent-primary)' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>API Connector Health</h3>
        </div>
        <button 
          onClick={handleRefresh}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
          title="Probe connections"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {connectors.map((c) => (
          <div 
            key={c.name}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '6px',
              background: 'rgba(255,255,255,0.01)',
              border: '1px solid var(--glass-border)'
            }}
          >
            <div style={{ minWidth: 0 }}>
              <strong style={{ fontSize: '0.8rem', display: 'block', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{c.name}</strong>
              <span className="text-secondary" style={{ fontSize: '0.7rem' }}>{c.type}</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <span className="text-secondary" style={{ fontSize: '0.72rem', fontFamily: 'monospace' }}>{c.latency}</span>
              <CheckCircle2 size={14} style={{ color: '#10b981' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
