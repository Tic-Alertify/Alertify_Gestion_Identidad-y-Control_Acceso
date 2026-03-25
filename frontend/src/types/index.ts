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

export type AuthUser = User;

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface LoginApiResponse {
  access_token: string;
  refresh_token: string;
  user?: Partial<AuthUser>;
}

export type UserStatus = 'activo' | 'inactivo' | 'bloqueado';
export type ReportStatus = 'pendiente' | 'verificado' | 'rechazado';

export interface AdminUserRow {
  id: number;
  username: string;
  email: string;
  estado: UserStatus;
  roles: string[];
}

export interface AdminReportRow {
  id: number;
  titulo: string;
  usuario: string;
  usuarioEmail?: string;
  estado: ReportStatus;
  fecha: string;
}

export interface DashboardMetrics {
  activeSessions: number;
  pendingReports: number;
}

export interface ServiceResult<T> {
  data: T;
  source: 'api' | 'mock';
  note?: string;
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
  estado: ReportStatus;
  fecha: string;
}

// API Response types
export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}
