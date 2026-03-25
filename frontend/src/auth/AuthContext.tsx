/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthState } from '../types';
import authService from '../services/authService';

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isAdmin: false,
  loading: true,
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>(() => {
    try {
      const session = authService.getStoredSession();
      if (!session) {
        return { ...initialState, loading: false };
      }

      return {
        user: session.user,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        isAuthenticated: true,
        isAdmin: authService.isAdminUser(session.user),
        loading: false,
      };
    } catch {
      authService.clearSession();
      return { ...initialState, loading: false };
    }
  });

  const login = useCallback(async (email: string, password: string) => {
    const session = await authService.login(email, password);
    const admin = authService.isAdminUser(session.user);

    if (!admin) {
      authService.clearSession();
      throw new Error('ACCESS_DENIED');
    }

    setAuthState({
      user: session.user,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      isAuthenticated: true,
      isAdmin: true,
      loading: false,
    });
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setAuthState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isAdmin: false,
      loading: false,
    });

    if (window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...authState,
      login,
      logout,
    }),
    [authState, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

