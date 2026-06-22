import { useAuth } from '../context/AuthContext';
import { Anchor, Ship, ShieldCheck, Globe, FileText, LogIn } from 'lucide-react';

export function LoginPage() {
  const { login, mockLogin } = useAuth();

  return (
    <div className="login-shell">
      {/* Header */}
      <header className="login-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.15)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
            <Anchor size={17} color="white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'white', letterSpacing: '0.02em' }}>
            Trade<span style={{ color: 'var(--accent-secondary)' }}>Flow</span> AI
          </span>
        </div>
        <span style={{ marginLeft: '16px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Global Import &amp; Customs Intelligence
        </span>
      </header>

      {/* Body */}
      <div className="login-body" style={{ maxWidth: '1000px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', padding: '0 20px', margin: '40px auto 60px' }}>
        {/* Feature list (visible on wide screens) */}
        <div className="login-feature-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ marginBottom: '8px' }}>
            <h2 style={{ fontSize: '1.6rem', lineHeight: 1.3, color: 'var(--accent-primary)' }}>
              UAE–USA Cross-Border<br />Trade Management
            </h2>
            <p className="text-secondary" style={{ fontSize: '0.9rem', marginTop: '10px', lineHeight: 1.6 }}>
              A Maestro-powered platform for intelligent shipment clearance, compliance screening, and customs automation.
            </p>
          </div>

          {[
            { icon: Ship, title: 'Shipment Orchestration', desc: 'End-to-end Maestro case tracking from PO intake to CBP release' },
            { icon: ShieldCheck, title: 'OFAC Compliance Screening', desc: 'Automated sanctions screening against live OFAC watch-lists' },
            { icon: FileText, title: 'ISF 10+2 Filing', desc: 'Automated Importer Security Filing for US Customs & Border Protection' },
            { icon: Globe, title: 'HTS Code Classification', desc: 'AI-powered Harmonized Tariff Schedule classification with duty calculation' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="login-feature-item" style={{ display: 'flex', gap: '14px' }}>
              <div className="login-feature-icon" style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(41,69,134,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', flexShrink: 0 }}>
                <Icon size={18} />
              </div>
              <div className="login-feature-text">
                <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h4>
                <p className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '3px', lineHeight: 1.4 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Login card */}
        <div className="login-card animate-fade-in" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: 'var(--glass-shadow)', backdropFilter: 'blur(12px)' }}>
          {/* Card header */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, background: 'var(--accent-gradient)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 20px rgba(41,69,134,0.25)' }}>
              <Anchor size={26} color="white" />
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '6px' }}>Operator Sign In</h2>
            <p className="text-secondary" style={{ fontSize: '0.875rem' }}>
              Access your trade case management portal using your UiPath identity credentials or choose an operator role.
            </p>
          </div>

          {/* Login button */}
          <button onClick={login} className="btn btn-primary" style={{ width: '100%', padding: '13px', fontSize: '0.95rem', justifyContent: 'center', gap: '10px' }}>
            <LogIn size={18} /> Login with UiPath SSO
          </button>

          {/* Developer & Operator Quick Sign In */}
          <div className="section-divider">
            <div className="section-divider-line" />
            <span className="section-divider-label">Operator Roles (Quick Access)</span>
            <div className="section-divider-line" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            {[
              { role: 'admin', label: 'System Administrator', desc: 'Full permissions & dashboard override', color: 'var(--accent-primary)' },
              { role: 'manager', label: 'Compliance & Ops Manager', desc: 'OFAC screenings, audits & escalations', color: '#c2410c' },
              { role: 'reviewer_customs', label: 'Customs Specialist (Broker)', desc: 'HTS classification & PGA agency checks', color: '#0369a1' },
              { role: 'reviewer_freight_forwarder', label: 'Freight Forwarder', desc: 'Logistics coordination & CBP exams', color: '#0d9488' },
              { role: 'reviewer_shipper', label: 'Shipper Operations', desc: 'PO validation & supplier COO auditing', color: '#4f46e5' },
            ].map(({ role, label, desc, color }) => (
              <button
                key={role}
                onClick={() => mockLogin(role as any)}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '10px 14px',
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(255,255,255,0.03)',
                  transition: 'transform 0.15s, background 0.15s',
                  textAlign: 'left'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(41,69,134,0.05)';
                  e.currentTarget.style.transform = 'translateX(2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{label}</strong>
                </div>
                <span className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '2px', paddingLeft: '14px' }}>
                  {desc}
                </span>
              </button>
            ))}
          </div>

          {/* Trust badges */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { icon: ShieldCheck, label: 'OFAC Compliant' },
              { icon: FileText, label: 'ISF Automated' },
              { icon: Globe, label: 'CBP Integrated' },
              { icon: Ship, label: 'UAE–USA Corridor' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', background: 'rgba(41,69,134,0.04)', border: '1px solid var(--glass-border)', borderRadius: 6, fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                <Icon size={13} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                {label}
              </div>
            ))}
          </div>

          <p className="text-secondary" style={{ fontSize: '0.72rem', textAlign: 'center', lineHeight: 1.5 }}>
            Secure authentication via UiPath Identity &bull; Powered by Maestro Case Engine
          </p>
        </div>
      </div>

      {/* Mini footer */}
      <div style={{ padding: '14px 32px', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', flexWrap: 'wrap', gap: '8px' }}>
        <span>&copy; {new Date().getFullYear()} <span style={{ color: 'var(--accent-secondary)' }}>TradeFlow AI</span> &mdash; All rights reserved</span>
        <span>OFAC Screening &bull; ISF Filing &bull; CBP Release &bull; HTS Classification</span>
      </div>
    </div>
  );
}

export default LoginPage;
