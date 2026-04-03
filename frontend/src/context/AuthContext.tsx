import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserNode } from '../types/graph';
import { GetAuthStatus } from '../../wailsjs/go/main/App';

interface AuthState {
  isAuthenticated: boolean;
  user: UserNode | null;
  isChecking: boolean;
}

interface AuthContextValue extends AuthState {
  checkAuth: () => Promise<void>;
  setAuthenticated: (user: UserNode) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isChecking: true,
  });

  const checkAuth = async () => {
    try {
      const status = await GetAuthStatus();
      console.log('[AuthContext] GetAuthStatus result:', status);
      setState({
        isAuthenticated: status.isAuthenticated,
        user: status.user || null,
        isChecking: false,
      });
    } catch (err) {
      console.error('[AuthContext] GetAuthStatus error:', err);
      setState({ isAuthenticated: false, user: null, isChecking: false });
    }
  };

  const setAuthenticated = (user: UserNode) => {
    setState({ isAuthenticated: true, user, isChecking: false });
  };

  const clearAuth = () => {
    setState({ isAuthenticated: false, user: null, isChecking: false });
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, checkAuth, setAuthenticated, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
