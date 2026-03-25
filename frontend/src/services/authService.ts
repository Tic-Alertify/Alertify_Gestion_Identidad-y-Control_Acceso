import api from './api';
import type { AuthSession, AuthUser, LoginApiResponse } from '../types';

export const AUTH_STORAGE_KEYS = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
  user: 'user',
} as const;

const ADMIN_ROLE_NAMES = new Set(['admin', 'administrador']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeRoles = (roles: unknown): string[] => {
  if (!Array.isArray(roles)) {
    return [];
  }
  return roles
    .filter((role): role is string => typeof role === 'string')
    .map((role) => role.trim())
    .filter((role) => role.length > 0);
};

const decodeJwtPayload = (token: string): Record<string, unknown> => {
  const parts = token.split('.');
  if (parts.length < 2) {
    throw new Error('Token JWT inválido');
  }

  const base64Url = parts[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const paddedBase64 = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`;
  const decoded = atob(paddedBase64);
  const utf8 = decodeURIComponent(
    Array.from(decoded)
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join(''),
  );

  const payload: unknown = JSON.parse(utf8);
  if (!isRecord(payload)) {
    throw new Error('Payload JWT inválido');
  }

  return payload;
};

const fallbackUsername = (email: string): string => {
  const username = email.split('@')[0]?.trim();
  return username && username.length > 0 ? username : 'usuario';
};

const buildUser = (
  accessToken: string,
  userFromApi?: Partial<AuthUser>,
): AuthUser => {
  const payload = decodeJwtPayload(accessToken);

  const payloadId = typeof payload.sub === 'number' ? payload.sub : -1;
  const payloadEmail = typeof payload.email === 'string' ? payload.email : '';
  const payloadUsername =
    typeof payload.username === 'string'
      ? payload.username
      : fallbackUsername(payloadEmail);
  const payloadRoles = normalizeRoles(payload.roles);

  const userId = typeof userFromApi?.id === 'number' ? userFromApi.id : payloadId;
  const userEmail =
    typeof userFromApi?.email === 'string' ? userFromApi.email : payloadEmail;
  const userUsername =
    typeof userFromApi?.username === 'string'
      ? userFromApi.username
      : fallbackUsername(payloadUsername || userEmail);
  const apiRoles = normalizeRoles(userFromApi?.roles);
  const userRoles = apiRoles.length ? apiRoles : payloadRoles;

  return {
    id: userId,
    email: userEmail,
    username: userUsername,
    roles: userRoles,
  };
};

export const isAdminUser = (user: AuthUser | null): boolean => {
  if (!user) {
    return false;
  }
  return user.roles.some((role) => ADMIN_ROLE_NAMES.has(role.toLowerCase()));
};

export const saveSession = (session: AuthSession): void => {
  localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, session.accessToken);
  localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, session.refreshToken);
  localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(session.user));
};

export const clearSession = (): void => {
  localStorage.removeItem(AUTH_STORAGE_KEYS.accessToken);
  localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
  localStorage.removeItem(AUTH_STORAGE_KEYS.user);
};

export const getStoredSession = (): AuthSession | null => {
  const accessToken = localStorage.getItem(AUTH_STORAGE_KEYS.accessToken);
  const refreshToken = localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken);
  const userRaw = localStorage.getItem(AUTH_STORAGE_KEYS.user);

  if (!accessToken || !refreshToken || !userRaw) {
    return null;
  }

  const parsedUser: unknown = JSON.parse(userRaw);
  if (!isRecord(parsedUser)) {
    throw new Error('Usuario almacenado inválido');
  }

  const user: AuthUser = {
    id: typeof parsedUser.id === 'number' ? parsedUser.id : -1,
    email: typeof parsedUser.email === 'string' ? parsedUser.email : '',
    username:
      typeof parsedUser.username === 'string'
        ? parsedUser.username
        : fallbackUsername(typeof parsedUser.email === 'string' ? parsedUser.email : ''),
    roles: normalizeRoles(parsedUser.roles),
  };

  return {
    accessToken,
    refreshToken,
    user,
  };
};

const authService = {
  async login(email: string, password: string): Promise<AuthSession> {
    const response = await api.post<LoginApiResponse>('/auth/login', {
      email,
      password,
    });

    const accessToken = response.data.access_token;
    const refreshToken = response.data.refresh_token;

    if (!accessToken || !refreshToken) {
      throw new Error('Respuesta de autenticación inválida');
    }

    const user = buildUser(accessToken, response.data.user);
    const session: AuthSession = {
      accessToken,
      refreshToken,
      user,
    };

    saveSession(session);
    return session;
  },

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken);

    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      } catch (error) {
        console.warn('No se pudo cerrar sesión en servidor, limpiando sesión local.', error);
      }
    }

    clearSession();
  },

  getToken(): string | null {
    return localStorage.getItem(AUTH_STORAGE_KEYS.accessToken);
  },

  isAdminUser,
  getStoredSession,
  clearSession,
};

export default authService;
