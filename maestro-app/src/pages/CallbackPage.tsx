import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { sendCallback } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { Activity } from 'lucide-react';

export function CallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      setError('No authorization code received');
      return;
    }

    sendCallback(code, state || '')
      .then((result) => {
        if (result.authenticated) {
          setAuthenticated(true);
          navigate('/', { replace: true });
        } else {
          setError('Authentication failed');
        }
      })
      .catch((err) => {
        setError(err.message || 'Token exchange failed');
      });
  }, [searchParams, navigate, setAuthenticated]);

  if (error) {
    return (
      <div style={{ display: 'flex', flex: 1, minHeight: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div className="glass-panel animate-fade-in" style={{ padding: '40px', maxWidth: '400px', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ color: 'var(--danger)' }}>Authentication Error</h2>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>{error}</p>
          <a href="/" className="btn btn-secondary" style={{ textDecoration: 'none' }}>Back to Login</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '40px', maxWidth: '400px', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
        <Activity size={36} className="text-gradient animate-pulse" style={{ animation: 'spin 2s linear infinite' }} />
        <h2>Authenticating...</h2>
        <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Exchanging authorization code for access token...</p>
      </div>
    </div>
  );
}
export default CallbackPage;
