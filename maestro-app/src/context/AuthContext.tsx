import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { logout as logoutApi } from '../services/authService';
import type { UserRole } from '../types/auth';
import { sdk } from '../lib/sdk';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  activeRole: UserRole;
  userEmail: string | null;
  userName: string | null;
  login: () => void;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  setAuthenticated: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    return (localStorage.getItem('tradeflow_role') as UserRole) || 'admin';
  });
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    // Check active browser credentials or OIDC sessions synchronously/safely
    const initSdk = async () => {
      try {
        await sdk.initialize();
        const authenticated = sdk.isAuthenticated();
        setAuthenticated(authenticated);
        if (authenticated) {
          setUserEmail('operator@tradeflow.ai');
          setUserName('Operator Portal');
        }
      } catch (err) {
        console.error('UiPath SDK initialization status check failed on load:', err);
        setAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    initSdk();
  }, []);

  const login = async () => {
    try {
      setIsLoading(true);
      await sdk.initialize();
      const authenticated = sdk.isAuthenticated();
      setAuthenticated(authenticated);
      if (authenticated) {
        setUserEmail('operator@tradeflow.ai');
        setUserName('Operator Portal');
      }
    } catch (err) {
      console.error('Failed to trigger OIDC login flow via SDK:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch (err) {
      console.error('Logout API failed', err);
    } finally {
      setAuthenticated(false);
      setUserEmail(null);
      setUserName(null);
    }
  };

  const switchRole = (role: UserRole) => {
    localStorage.setItem('tradeflow_role', role);
    setActiveRole(role);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      activeRole,
      userEmail,
      userName,
      login,
      logout,
      switchRole,
      setAuthenticated
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
