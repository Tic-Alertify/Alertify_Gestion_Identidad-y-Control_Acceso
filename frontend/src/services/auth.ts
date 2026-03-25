import api from './api';
import type { LoginResponse, User } from '../types';

export const authService = {
  // Login de usuario
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  // Logout de usuario
  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await api.post('/auth/logout', {
          refresh_token: refreshToken,
        });
      } catch (error) {
        // Ignorar errores de logout, igual limpiaremos los tokens localmente
        console.error('Error en logout:', error);
      }
    }
    // Limpiar almacenamiento local
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },

  // Verificar si el usuario tiene rol admin
  isAdmin(user: User | null): boolean {
    if (!user || !user.roles) return false;
    return user.roles.some(
      (role) => role.toLowerCase() === 'admin' || role.toLowerCase() === 'administrador'
    );
  },

  // Obtener usuario almacenado
  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  // Verificar si hay sesión válida
  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    const user = this.getStoredUser();
    return !!token && !!user;
  },

  // Guardar datos de autenticación
  saveAuthData(data: LoginResponse): void {
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('user', JSON.stringify(data.user));
  },
};

export default authService;
