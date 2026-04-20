export type UserStatus = 'activo' | 'inactivo' | 'bloqueado';
export type UserRole = 'admin' | 'ciudadano' | 'administrador';
export type EditableUserRole = 'admin' | 'ciudadano';
export type ReportStatus = 'pendiente' | 'verificado' | 'rechazado';

export interface User {
  id: number;
  email: string;
  username: string;
  roles: UserRole[];
  estado?: UserStatus;
  created_at?: string;
}

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  roles: string[];
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
}

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

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface UserFilters {
  page: number;
  limit: number;
  search?: string;
  role?: EditableUserRole | '';
  status?: UserStatus | '';
  extra?: Record<string, string | number | undefined>;
}

export interface UpdateUserStatusPayload {
  estado: 'activo' | 'inactivo';
}

export interface UpdateUserRolePayload {
  rol: EditableUserRole;
}

export interface AdminUserRow extends User {
  estado: UserStatus;
  roles: UserRole[];
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

export interface DashboardStats {
  activeSessions: number;
  pendingReports: number;
}

export type UserListItem = AdminUserRow;

export interface Report {
  id: number;
  titulo: string;
  usuario: string;
  estado: ReportStatus;
  fecha: string;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}
