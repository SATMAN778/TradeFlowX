import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getAuthStatus, getLoginUrl, logout as logoutApi } from '../services/authService';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  setAuthenticated: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAuthStatus()
      .then((status) => setAuthenticated(status.authenticated))
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

  const logout = async () => {
    try {
      await logoutApi();
    } catch (err) {
      console.error('Logout API failed', err);
    } finally {
      setAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout, setAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
