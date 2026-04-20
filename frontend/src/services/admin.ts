import api from './api';
import type {
  PaginatedResponse,
  PaginationMeta,
  UpdateUserRolePayload,
  UpdateUserStatusPayload,
  User,
  UserFilters,
  UserRole,
  UserStatus,
} from '../types';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null;

const parseNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const parseBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  return null;
};

const normalizeRole = (value: unknown): UserRole => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';

  if (normalized === 'admin' || normalized === 'administrador') {
    return 'admin';
  }

  return 'ciudadano';
};

const normalizeStatus = (value: unknown): UserStatus => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';

  if (normalized === 'bloqueado') {
    return 'bloqueado';
  }

  if (normalized === 'inactivo') {
    return 'inactivo';
  }

  return 'activo';
};

const normalizeRoles = (value: unknown): UserRole[] => {
  if (!Array.isArray(value)) {
    return ['ciudadano'];
  }

  const roles = value
    .flatMap((role) => {
      if (typeof role === 'string') {
        return [normalizeRole(role)];
      }

      if (!isRecord(role)) {
        return [];
      }

      if (typeof role.nombre === 'string') {
        return [normalizeRole(role.nombre)];
      }

      if (typeof role.name === 'string') {
        return [normalizeRole(role.name)];
      }

      if (isRecord(role.rol) && typeof role.rol.nombre === 'string') {
        return [normalizeRole(role.rol.nombre)];
      }

      return [];
    })
    .filter((role) => role.length > 0);

  if (roles.length === 0) {
    return ['ciudadano'];
  }

  return Array.from(new Set(roles));
};

const normalizeUser = (raw: unknown): User => {
  if (!isRecord(raw)) {
    throw new Error('Formato de usuario invalido en respuesta del backend.');
  }

  const id = parseNumber(raw.id);
  if (id === null) {
    throw new Error('Formato de usuario invalido: campo id faltante.');
  }

  const email = typeof raw.email === 'string' ? raw.email : '';
  const username = typeof raw.username === 'string' ? raw.username : '';
  const estado = normalizeStatus(raw.estado);
  const createdAt = typeof raw.created_at === 'string' ? raw.created_at : undefined;

  return {
    id,
    email,
    username,
    estado,
    roles: normalizeRoles(raw.roles ?? raw.user_roles),
    created_at: createdAt,
  };
};

const buildPaginationMeta = (
  rawMeta: unknown,
  fallbackPage: number,
  fallbackLimit: number,
  dataLength: number,
): PaginationMeta => {
  if (!isRecord(rawMeta)) {
    const total = dataLength;
    const totalPages = total === 0 ? 0 : 1;

    return {
      page: fallbackPage,
      limit: fallbackLimit,
      total,
      totalPages,
      hasNextPage: false,
      hasPreviousPage: fallbackPage > 1,
    };
  }

  const page = Math.max(parseNumber(rawMeta.page) ?? fallbackPage, 1);
  const limit = Math.min(Math.max(parseNumber(rawMeta.limit) ?? fallbackLimit, 1), MAX_LIMIT);
  const total = Math.max(parseNumber(rawMeta.total) ?? dataLength, 0);
  const totalPages = Math.max(
    parseNumber(rawMeta.totalPages) ?? (total === 0 ? 0 : Math.ceil(total / limit)),
    0,
  );

  const hasNextPage = parseBoolean(rawMeta.hasNextPage) ?? page < totalPages;
  const hasPreviousPage = parseBoolean(rawMeta.hasPreviousPage) ?? page > 1;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  };
};

const toPaginatedUsers = (
  payload: unknown,
  fallbackPage: number,
  fallbackLimit: number,
): PaginatedResponse<User> => {
  if (Array.isArray(payload)) {
    const users = payload.map((row) => normalizeUser(row));

    return {
      data: users,
      meta: buildPaginationMeta(undefined, fallbackPage, fallbackLimit, users.length),
    };
  }

  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    throw new Error('Formato de paginacion invalido en respuesta de /usuarios.');
  }

  const users = payload.data.map((row) => normalizeUser(row));

  return {
    data: users,
    meta: buildPaginationMeta(payload.meta, fallbackPage, fallbackLimit, users.length),
  };
};

const toUserMutationResponse = (payload: unknown): User => {
  if (isRecord(payload) && 'data' in payload) {
    return normalizeUser(payload.data);
  }

  return normalizeUser(payload);
};

const toErrorMessage = (error: unknown): string => {
  if (isRecord(error) && isRecord(error.response)) {
    const status = error.response.status;
    if (status === 401) {
      return 'Tu sesion expiro. Inicia sesion nuevamente.';
    }
    if (status === 403) {
      return 'No tienes permisos para realizar esta accion.';
    }

    if (isRecord(error.response.data)) {
      const message = error.response.data.message;
      if (Array.isArray(message)) {
        return message.join(', ');
      }
      if (typeof message === 'string') {
        return message;
      }
    }
  }

  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }

  return 'Error inesperado en servicio administrativo.';
};

const buildUsersQuery = (params: Partial<UserFilters>) => {
  const query = new URLSearchParams();

  const page = Math.max(params.page ?? DEFAULT_PAGE, 1);
  const limit = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

  query.set('page', String(page));
  query.set('limit', String(limit));

  const search = params.search?.trim();
  if (search) {
    query.set('search', search);
  }

  const role = params.role?.trim().toLowerCase();
  if (role) {
    query.set('rol', role === 'administrador' ? 'admin' : role);
  }

  const status = params.status?.trim().toLowerCase();
  if (status) {
    query.set('estado', status);
  }

  if (params.extra) {
    for (const [key, value] of Object.entries(params.extra)) {
      if (value !== undefined && value !== null && String(value).trim().length > 0) {
        query.set(key, String(value));
      }
    }
  }

  return {
    page,
    limit,
    queryString: query.toString(),
  };
};

const adminService = {
  async getUsers(params: Partial<UserFilters> = {}): Promise<PaginatedResponse<User>> {
    const { queryString, page, limit } = buildUsersQuery(params);
    const response = await api.get<unknown>(`/usuarios?${queryString}`);

    return toPaginatedUsers(response.data, page, limit);
  },

  async updateUserStatus(id: number, status: UpdateUserStatusPayload['estado']): Promise<User> {
    const payload: UpdateUserStatusPayload = {
      estado: status,
    };

    const response = await api.patch<unknown>(`/usuarios/${id}/estado`, payload);
    return toUserMutationResponse(response.data);
  },

  async updateUserRole(id: number, role: UpdateUserRolePayload['rol']): Promise<User> {
    const payload: UpdateUserRolePayload = {
      rol: role,
    };

    const response = await api.patch<unknown>(`/usuarios/${id}/rol`, payload);
    return toUserMutationResponse(response.data);
  },

  errorToMessage(error: unknown): string {
    return toErrorMessage(error);
  },
};

export default adminService;
