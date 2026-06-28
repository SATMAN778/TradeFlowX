import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { sdk } from '../../lib/sdk';
import { Activity } from 'lucide-react';

export function AuthCallback() {
  const navigate = useNavigate();
  const { setAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sdk.isInOAuthCallback()) {
      sdk.completeOAuth()
        .then((success) => {
          if (success) {
            setAuthenticated(true);
            navigate('/', { replace: true });
          } else {
            setError('Authentication failed via SDK callback');
          }
        })
        .catch((err) => {
          setError(err.message || 'SDK token verification failed');
        });
    } else {
      setError('No active OAuth callback signature detected');
    }
  }, [navigate, setAuthenticated]);

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

export default AuthCallback;
