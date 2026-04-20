import api from './api';
import type {
  AdminReportRow,
  AdminUserRow,
  DashboardMetrics,
  ReportStatus,
  ServiceResult,
  UserRole,
  UserStatus,
} from '../types';

const mockUsers: AdminUserRow[] = [
  {
    id: 1,
    username: 'johan.bano',
    email: 'johanbano@gmail.com',
    estado: 'activo',
    roles: ['admin'],
  },
  {
    id: 2,
    username: 'erick.ballas',
    email: 'erickballas@gmail.com',
    estado: 'inactivo',
    roles: ['ciudadano'],
  },
];

const mockReports: AdminReportRow[] = [
  {
    id: 101,
    titulo: 'Robo',
    usuario: 'Johan Bano',
    usuarioEmail: 'johanbano@gmail.com',
    estado: 'pendiente',
    fecha: new Date().toISOString(),
  },
  {
    id: 102,
    titulo: 'Secuestro',
    usuario: 'Erick Ballas',
    usuarioEmail: 'erickballas@gmail.com',
    estado: 'pendiente',
    fecha: new Date(Date.now() - 86_400_000).toISOString(),
  },
];

const ADMIN_USERS_ENDPOINTS = ['/admin/usuarios', '/admin/users'];
const ADMIN_REPORTS_ENDPOINTS = ['/admin/reportes', '/admin/reports'];

const REPORT_VERIFY_CANDIDATES = [
  { method: 'post', path: (reportId: number) => `/admin/reportes/${reportId}/verificar` },
  { method: 'post', path: (reportId: number) => `/admin/reports/${reportId}/verify` },
  {
    method: 'patch',
    path: (reportId: number) => `/admin/reportes/${reportId}`,
    data: { estado: 'verificado' },
  },
] as const;

const REPORT_REJECT_CANDIDATES = [
  { method: 'post', path: (reportId: number) => `/admin/reportes/${reportId}/rechazar` },
  { method: 'post', path: (reportId: number) => `/admin/reports/${reportId}/reject` },
  {
    method: 'patch',
    path: (reportId: number) => `/admin/reportes/${reportId}`,
    data: { estado: 'rechazado' },
  },
] as const;

const getMockMetrics = (reports: AdminReportRow[]): DashboardMetrics => ({
  activeSessions: 99_999,
  pendingReports: reports.filter((report) => report.estado === 'pendiente').length,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toArrayPayload = (payload: unknown): Record<string, unknown>[] => {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (isRecord(payload) && Array.isArray(payload.data)) {
    return payload.data.filter(isRecord);
  }

  return [];
};

const normalizeUserStatus = (status: unknown): UserStatus => {
  const value = typeof status === 'string' ? status.trim().toLowerCase() : '';
  if (value === 'bloqueado') {
    return 'bloqueado';
  }
  if (value === 'inactivo') {
    return 'inactivo';
  }
  return 'activo';
};

const normalizeReportStatus = (status: unknown): ReportStatus => {
  const value = typeof status === 'string' ? status.trim().toLowerCase() : '';
  if (value.includes('verif') || value.includes('aproba')) {
    return 'verificado';
  }
  if (value.includes('rechaz') || value.includes('deneg')) {
    return 'rechazado';
  }
  return 'pendiente';
};

const normalizeRole = (role: string): UserRole => {
  const normalized = role.trim().toLowerCase();
  if (normalized === 'admin' || normalized === 'administrador') {
    return 'admin';
  }

  return 'ciudadano';
};

const normalizeRoles = (roles: unknown): UserRole[] => {
  if (!Array.isArray(roles)) {
    return [];
  }

  return roles
    .flatMap((role) => {
      if (typeof role === 'string') {
        return [role];
      }

      if (!isRecord(role)) {
        return [];
      }

      if (typeof role.nombre === 'string') {
        return [role.nombre];
      }

      if (typeof role.name === 'string') {
        return [role.name];
      }

      if (isRecord(role.rol) && typeof role.rol.nombre === 'string') {
        return [role.rol.nombre];
      }

      return [];
    })
    .map((role) => role.trim())
    .filter((role) => role.length > 0)
    .map((role) => normalizeRole(role));
};

const getNumberFromRecord = (record: Record<string, unknown>, keys: string[]): number | null => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
};

const mapDashboardMetrics = (payload: unknown): DashboardMetrics => {
  const fallback = getMockMetrics(mockReports);
  if (!isRecord(payload)) {
    return fallback;
  }

  const metricsSource = isRecord(payload.data) ? payload.data : payload;

  const activeSessions = getNumberFromRecord(metricsSource, [
    'activeSessions',
    'sesionesActivas',
    'active_sessions',
    'active_users',
  ]);

  const pendingReports = getNumberFromRecord(metricsSource, [
    'pendingReports',
    'reportesPendientes',
    'pending_reports',
    'reports_pending',
  ]);

  return {
    activeSessions: activeSessions ?? fallback.activeSessions,
    pendingReports: pendingReports ?? fallback.pendingReports,
  };
};

const mapUsers = (payload: unknown): AdminUserRow[] => {
  const rows = toArrayPayload(payload);

  return rows.map((row, index) => {
    const email = typeof row.email === 'string' ? row.email : `usuario${index + 1}@alertify.local`;
    const username =
      typeof row.username === 'string'
        ? row.username
        : typeof row.nombre === 'string'
          ? row.nombre
          : email.split('@')[0] || `usuario-${index + 1}`;

    const roles = normalizeRoles(row.roles ?? row.user_roles);

    return {
      id: typeof row.id === 'number' ? row.id : index + 1,
      username,
      email,
      estado: normalizeUserStatus(row.estado),
      roles: roles.length > 0 ? roles : ['ciudadano'],
    };
  });
};

const mapReports = (payload: unknown): AdminReportRow[] => {
  const rows = toArrayPayload(payload);

  return rows.map((row, index) => {
    const usuarioNombre =
      typeof row.usuario === 'string'
        ? row.usuario
        : typeof row.username === 'string'
          ? row.username
          : `Usuario ${index + 1}`;

    return {
      id: typeof row.id === 'number' ? row.id : index + 1,
      titulo:
        typeof row.titulo === 'string'
          ? row.titulo
          : typeof row.reporte === 'string'
            ? row.reporte
            : `Reporte ${index + 1}`,
      usuario: usuarioNombre,
      usuarioEmail:
        typeof row.usuarioEmail === 'string'
          ? row.usuarioEmail
          : typeof row.email === 'string'
            ? row.email
            : undefined,
      estado: normalizeReportStatus(row.estado),
      fecha:
        typeof row.fecha === 'string'
          ? row.fecha
          : typeof row.created_at === 'string'
            ? row.created_at
            : new Date().toISOString(),
    };
  });
};

const getErrorStatus = (error: unknown): number | null => {
  if (!isRecord(error) || !isRecord(error.response)) {
    return null;
  }

  const status = error.response.status;
  return typeof status === 'number' ? status : null;
};

const shouldUseMockFallback = (error: unknown): boolean => {
  const status = getErrorStatus(error);
  return status === 404 || status === 405 || status === 501;
};

const tryReportAction = async (
  reportId: number,
  candidates: ReadonlyArray<{
    method: 'post' | 'patch';
    path: (reportId: number) => string;
    data?: Record<string, unknown>;
  }>,
): Promise<boolean> => {
  for (const candidate of candidates) {
    try {
      await api.request({
        method: candidate.method,
        url: candidate.path(reportId),
        data: candidate.data,
      });
      return true;
    } catch (error) {
      if (shouldUseMockFallback(error)) {
        continue;
      }
      throw error;
    }
  }

  return false;
};

const toErrorMessage = (error: unknown): string => {
  const status = getErrorStatus(error);
  if (status === 401) {
    return 'Tu sesión expiró. Inicia sesión nuevamente.';
  }
  if (status === 403) {
    return 'No tienes permisos para realizar esta acción.';
  }

  if (error && typeof error === 'object') {
    if ('response' in error) {
      const response = (error as { response?: unknown }).response;
      if (response && typeof response === 'object' && 'data' in response) {
        const data = (response as { data?: unknown }).data;
        if (data && typeof data === 'object' && 'message' in data) {
          const message = (data as { message?: unknown }).message;
          if (Array.isArray(message)) {
            return message.join(', ');
          }
          if (typeof message === 'string') {
            return message;
          }
        }
      }
    }

    if ('message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string') {
        return message;
      }
    }
  }
  return 'Error inesperado en servicio administrativo';
};

const adminService = {
  async healthCheck(): Promise<void> {
    await api.get('/admin/health');
  },

  async getDashboardMetrics(): Promise<ServiceResult<DashboardMetrics>> {
    try {
      const response = await api.get<{ message?: string; timestamp?: string } & Record<string, unknown>>(
        '/admin/dashboard',
      );

      const timestamp = response.data.timestamp
        ? new Date(response.data.timestamp).toLocaleString('es-EC')
        : 'N/D';

      const data = mapDashboardMetrics(response.data);
      const isFallbackFromDashboardPayload =
        data.activeSessions === getMockMetrics(mockReports).activeSessions &&
        data.pendingReports === getMockMetrics(mockReports).pendingReports;

      return {
        data,
        source: 'api',
        note: isFallbackFromDashboardPayload
          ? `Conexión a /admin/dashboard activa (${timestamp}), pero faltan campos numéricos; usando fallback temporal.`
          : `Métricas conectadas a /admin/dashboard (${timestamp}).`,
      };
    } catch {
      return {
        data: getMockMetrics(mockReports),
        source: 'mock',
        note:
          'No existe endpoint de métricas detalladas aún. Usando mock temporal.',
      };
    }
  },

  async getUsers(): Promise<ServiceResult<AdminUserRow[]>> {
    for (const endpoint of ADMIN_USERS_ENDPOINTS) {
      try {
        const response = await api.get(endpoint);
        return {
          data: mapUsers(response.data),
          source: 'api',
          note: `Directorio conectado a ${endpoint}.`,
        };
      } catch (error) {
        if (shouldUseMockFallback(error)) {
          continue;
        }
        throw error;
      }
    }

    return {
      data: mockUsers,
      source: 'mock',
      note: 'No existe endpoint GET /admin/usuarios aún. Usando mock temporal.',
    };
  },

  async getReports(): Promise<ServiceResult<AdminReportRow[]>> {
    for (const endpoint of ADMIN_REPORTS_ENDPOINTS) {
      try {
        const response = await api.get(endpoint);
        return {
          data: mapReports(response.data),
          source: 'api',
          note: `Reportes conectados a ${endpoint}.`,
        };
      } catch (error) {
        if (shouldUseMockFallback(error)) {
          continue;
        }
        throw error;
      }
    }

    return {
      data: mockReports,
      source: 'mock',
      note: 'No existe endpoint GET /admin/reportes aún. Usando mock temporal.',
    };
  },

  async verifyReport(reportId: number): Promise<void> {
    const usedApi = await tryReportAction(reportId, REPORT_VERIFY_CANDIDATES);
    if (usedApi) {
      return;
    }

    const report = mockReports.find((item) => item.id === reportId);
    if (!report) {
      throw new Error('No se encontró el reporte a verificar');
    }

    report.estado = 'verificado';
  },

  async rejectReport(reportId: number): Promise<void> {
    const usedApi = await tryReportAction(reportId, REPORT_REJECT_CANDIDATES);
    if (usedApi) {
      return;
    }

    const report = mockReports.find((item) => item.id === reportId);
    if (!report) {
      throw new Error('No se encontró el reporte a rechazar');
    }

    report.estado = 'rechazado';
  },

  errorToMessage(error: unknown): string {
    return toErrorMessage(error);
  },
};

export default adminService;
