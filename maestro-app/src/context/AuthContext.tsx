import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getAuthStatus, getLoginUrl, logout as logoutApi } from '../services/authService';
import type { UserRole } from '../types/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  activeRole: UserRole;
  userEmail: string | null;
  userName: string | null;
  login: () => void;
  logout: () => Promise<void>;
  mockLogin: (role: UserRole) => void;
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
    // If we have a mocked session in localStorage, use it
    const isMock = localStorage.getItem('tradeflow_mock_auth') === 'true';
    if (isMock) {
      setAuthenticated(true);
      setIsLoading(false);
      setUserEmail(localStorage.getItem('tradeflow_mock_email'));
      setUserName(localStorage.getItem('tradeflow_mock_name'));
      return;
    }

    getAuthStatus()
      .then((status) => {
        setAuthenticated(status.authenticated);
        if (status.authenticated) {
          setUserEmail(status.userEmail || 'operator@tradeflow.ai');
          setUserName(status.userName || 'Trade Operator');
        }
      })
      .catch(() => setAuthenticated(false))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async () => {
    try {
      const { url } = await getLoginUrl();
      window.location.href = url;
    } catch (err) {
      console.error('Failed to get login URL', err);
    }
  };

  const mockLogin = (role: UserRole) => {
    localStorage.setItem('tradeflow_mock_auth', 'true');
    localStorage.setItem('tradeflow_role', role);
    
    // Map emails/names based on role
    const roleEmails: Record<UserRole, string> = {
      admin: 'admin@tradeflow.ai',
      manager: 'compliance.mgr@tradeflow.ai',
      reviewer_customs: 'customs.broker@tradeflow.ai',
      reviewer_freight_forwarder: 'logistics.ff@tradeflow.ai',
      reviewer_shipper: 'shipper.ops@tradeflow.ai'
    };
    const roleNames: Record<UserRole, string> = {
      admin: 'Admin (System)',
      manager: 'Sarah Jenkins (Compliance Mgr)',
      reviewer_customs: 'Satish Prasad (Customs Broker)',
      reviewer_freight_forwarder: 'Mark Vance (Freight Forwarder)',
      reviewer_shipper: 'Amna Al-Mansoori (Shipper Ops)'
    };
    
    localStorage.setItem('tradeflow_mock_email', roleEmails[role]);
    localStorage.setItem('tradeflow_mock_name', roleNames[role]);
    
    setActiveRole(role);
    setUserEmail(roleEmails[role]);
    setUserName(roleNames[role]);
    setAuthenticated(true);
  };

  const logout = async () => {
    try {
      const isMock = localStorage.getItem('tradeflow_mock_auth') === 'true';
      if (!isMock) {
        await logoutApi();
      }
    } catch (err) {
      console.error('Logout API failed', err);
    } finally {
      localStorage.removeItem('tradeflow_mock_auth');
      localStorage.removeItem('tradeflow_mock_email');
      localStorage.removeItem('tradeflow_mock_name');
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
      mockLogin,
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
