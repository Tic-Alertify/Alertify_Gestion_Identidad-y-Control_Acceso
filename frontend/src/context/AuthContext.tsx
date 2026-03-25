import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { AuthState } from '../types';
import type { User } from '../types';
import authService from '../services/auth';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isAdmin: false,
    loading: true,
  });

  // Inicializar estado desde localStorage al montar
  useEffect(() => {
    const initAuth = () => {
      const user = authService.getStoredUser();
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');

      if (user && accessToken) {
        setState({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isAdmin: authService.isAdmin(user),
          loading: false,
        });
      } else {
        setState((prev) => ({ ...prev, loading: false }));
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);

    // Verificar que el usuario tenga rol admin
    if (!authService.isAdmin(response.user)) {
      throw new Error('ACCESS_DENIED');
    }

    // Guardar tokens y usuario
    authService.saveAuthData(response);

    setState({
      user: response.user,
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      isAuthenticated: true,
      isAdmin: true,
      loading: false,
    });
  };

  const logout = async () => {
    await authService.logout();
    setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isAdmin: false,
      loading: false,
    });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
