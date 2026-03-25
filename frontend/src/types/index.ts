// Tipos de usuario y autenticación
export interface User {
  id: number;
  email: string;
  username: string;
  roles: string[];
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
}

// Tipos para el dashboard
export interface DashboardStats {
  activeSessions: number;
  pendingReports: number;
}

export interface UserListItem {
  id: number;
  username: string;
  email: string;
  estado: string;
  roles: string[];
  created_at: string;
}

export interface Report {
  id: number;
  titulo: string;
  usuario: string;
  estado: 'pendiente' | 'verificado' | 'rechazado';
  fecha: string;
}

// API Response types
export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}
