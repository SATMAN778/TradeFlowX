import { useAuth } from '../context/AuthContext';
import { Anchor, Ship, ShieldCheck, Globe, FileText, LogIn } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="login-shell">
      {/* Decorative background glows */}
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(41, 69, 134, 0.15) 0%, transparent 70%)',
        top: '-10%',
        left: '-10%',
        zIndex: 0,
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(204, 177, 108, 0.08) 0%, transparent 70%)',
        bottom: '-10%',
        right: '-10%',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      {/* Header */}
      <header className="login-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.15)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
            <Anchor size={17} color="white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'white', letterSpacing: '0.02em' }}>
            Trade<span style={{ color: 'var(--accent-secondary)' }}>Flow</span> Portal
          </span>
        </div>
        <span style={{ marginLeft: '16px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Global Import &amp; Customs Intelligence
        </span>
      </header>

      {/* Body container */}
      <div className="login-body">
        <div className="login-container">
          
          {/* Left panel: Background Image and Text overlay */}
          <div className="login-hero-panel">
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.65) 50%, rgba(15, 23, 42, 0.85) 100%)',
              zIndex: 1
            }} />

            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '20px', fontSize: '0.72rem', color: 'var(--accent-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px' }}>
                <Ship size={12} /> UAE–USA Shipping Corridor
              </div>
              <h2 style={{ fontSize: '1.9rem', fontWeight: 800, lineHeight: 1.25, color: '#FFFFFF', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                Cross-Border Trade<br />Orchestration Platform
              </h2>
              <p style={{ fontSize: '0.92rem', color: 'rgba(255, 255, 255, 0.85)', marginTop: '12px', lineHeight: 1.6, maxWidth: '420px' }}>
                A Maestro-governed system coordinating intelligent AI agents, automated regulatory filings, and human-in-the-loop approvals.
              </p>
            </div>

            <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '40px' }}>
              {[
                { icon: Ship, title: 'Case Orchestration', desc: 'Real-time tracking from PO intake to CBP release.' },
                { icon: ShieldCheck, title: 'Compliance Screening', desc: 'OFAC & Denied-Party list verification.' },
                { icon: FileText, title: 'Automated ISF Filing', desc: 'Time-critical 10+2 documentation to CBP ACE.' },
                { icon: Globe, title: 'AI HTS Classification', desc: 'Customs tariff classification via CROSS Rulings RAG.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'rgba(15, 23, 42, 0.45)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '12px 16px', borderRadius: '12px', backdropFilter: 'blur(4px)' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(204, 177, 108, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-secondary)', flexShrink: 0 }}>
                    <Icon size={15} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.82rem', fontWeight: 600, color: '#FFFFFF' }}>{title}</h4>
                    <p style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.7)', marginTop: '2px', lineHeight: 1.3 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: Login button and trust badges */}
          <div className="login-card-container">
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ width: 56, height: 56, background: 'var(--accent-gradient)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(41,69,134,0.2)' }}>
                <Anchor size={26} color="white" />
              </div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Operator Sign In</h2>
              <p className="text-secondary" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Access the TradeFlow portal using your official corporate credentials.
              </p>
            </div>

            <button onClick={login} className="btn btn-primary" style={{
              width: '100%',
              padding: '14px',
              fontSize: '0.95rem',
              fontWeight: 600,
              justifyContent: 'center',
              gap: '10px',
              borderRadius: '10px',
              background: 'var(--accent-gradient)',
              border: 'none',
              boxShadow: '0 4px 15px rgba(41,69,134,0.35)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: '#FFFFFF',
              transition: 'all 0.2s ease',
              marginBottom: '24px'
            }}>
              <LogIn size={18} /> Login with UiPath SSO
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '28px' }}>
              {[
                { icon: ShieldCheck, label: 'OFAC Compliant' },
                { icon: FileText, label: 'ISF Automated' },
                { icon: Globe, label: 'CBP Integrated' },
                { icon: Ship, label: 'JAFZA–USA Corridor' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'rgba(41, 69, 134, 0.04)', border: '1px solid var(--glass-border)', borderRadius: 8, fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  <Icon size={13} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                  {label}
                </div>
              ))}
            </div>

            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: 0.8, textAlign: 'center', lineHeight: 1.5 }}>
              Secured by Enterprise OAuth 2.0 &bull; Governed via UiPath Maestro Engine
            </p>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer style={{
        padding: '16px 32px',
        background: 'var(--accent-primary)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.72rem',
        color: 'rgba(255,255,255,0.7)',
        flexWrap: 'wrap',
        gap: '8px',
        zIndex: 10
      }}>
        <span>&copy; {new Date().getFullYear()} <span style={{ color: 'var(--accent-secondary)' }}>TradeFlow Portal</span> &mdash; UAE-USA Compliance Control Room</span>
        <span>OFAC Screening &bull; ISF Filing &bull; CBP Release &bull; HTS Classification</span>
      </footer>
    </div>
  );
}

export default LoginPage;

