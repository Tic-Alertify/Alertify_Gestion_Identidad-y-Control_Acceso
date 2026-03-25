import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  token: null,
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  loading: true,
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>(initialState);

  useEffect(() => {
    try {
      const session = authService.getStoredSession();
      if (!session) {
        setAuthState({ ...initialState, loading: false });
        return;
      }

      setAuthState({
        token: session.accessToken,
        user: session.user,
        isAuthenticated: true,
        isAdmin: authService.isAdminUser(session.user),
        loading: false,
      });
    } catch {
      authService.clearSession();
      setAuthState({ ...initialState, loading: false });
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const session = await authService.login(email, password);
    const admin = authService.isAdminUser(session.user);

    if (!admin) {
      authService.clearSession();
      throw new Error('ACCESS_DENIED');
    }

    setAuthState({
      token: session.accessToken,
      user: session.user,
      isAuthenticated: true,
      isAdmin: true,
      loading: false,
    });
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setAuthState({
      token: null,
      user: null,
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

