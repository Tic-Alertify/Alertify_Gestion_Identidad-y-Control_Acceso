import api from './api';
import type { DashboardStats, UserListItem, Report } from '../types';

// Datos mock para usuarios (mientras no exista el endpoint)
const mockUsers: UserListItem[] = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@alertify.com',
    estado: 'activo',
    roles: ['admin'],
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 2,
    username: 'maria_garcia',
    email: 'maria@email.com',
    estado: 'activo',
    roles: ['ciudadano'],
    created_at: '2024-02-20T14:30:00Z',
  },
  {
    id: 3,
    username: 'juan_perez',
    email: 'juan@email.com',
    estado: 'activo',
    roles: ['ciudadano'],
    created_at: '2024-03-10T09:15:00Z',
  },
  {
    id: 4,
    username: 'carlos_lopez',
    email: 'carlos@email.com',
    estado: 'bloqueado',
    roles: ['ciudadano'],
    created_at: '2024-03-12T16:45:00Z',
  },
  {
    id: 5,
    username: 'ana_martinez',
    email: 'ana@email.com',
    estado: 'inactivo',
    roles: ['ciudadano'],
    created_at: '2024-03-18T11:20:00Z',
  },
];

// Datos mock para reportes (mientras no exista el endpoint)
const mockReports: Report[] = [
  {
    id: 1,
    titulo: 'Bache en Av. Principal',
    usuario: 'maria_garcia',
    estado: 'pendiente',
    fecha: '2024-03-20T08:30:00Z',
  },
  {
    id: 2,
    titulo: 'Semáforo dañado',
    usuario: 'juan_perez',
    estado: 'pendiente',
    fecha: '2024-03-19T15:45:00Z',
  },
  {
    id: 3,
    titulo: 'Fuga de agua',
    usuario: 'ana_martinez',
    estado: 'verificado',
    fecha: '2024-03-18T10:20:00Z',
  },
  {
    id: 4,
    titulo: 'Alumbrado público',
    usuario: 'carlos_lopez',
    estado: 'pendiente',
    fecha: '2024-03-17T19:00:00Z',
  },
  {
    id: 5,
    titulo: 'Basura acumulada',
    usuario: 'maria_garcia',
    estado: 'rechazado',
    fecha: '2024-03-16T07:15:00Z',
  },
];

export const adminService = {
  // Health check del panel admin
  async healthCheck(): Promise<{ message: string; status: string }> {
    const response = await api.get('/admin/health');
    return response.data;
  },

  // Obtener info del dashboard
  async getDashboard(): Promise<{ message: string; timestamp: string }> {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  // Obtener estadísticas del dashboard
  // TODO: Reemplazar con endpoint real cuando esté disponible
  async getStats(): Promise<DashboardStats> {
    // Simular delay de red
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mock: calcular stats basados en datos mock
    const pendingReports = mockReports.filter((r) => r.estado === 'pendiente').length;

    return {
      activeSessions: 12, // Mock: sesiones activas
      pendingReports,
    };
  },

  // Obtener lista de usuarios
  // TODO: Reemplazar con endpoint real cuando esté disponible
  async getUsers(): Promise<UserListItem[]> {
    // Simular delay de red
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockUsers;
  },

  // Obtener reportes pendientes
  // TODO: Reemplazar con endpoint real cuando esté disponible
  async getReports(): Promise<Report[]> {
    // Simular delay de red
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockReports;
  },

  // Aprobar/verificar un reporte
  // TODO: Reemplazar con endpoint real cuando esté disponible
  async verifyReport(reportId: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const report = mockReports.find((r) => r.id === reportId);
    if (report) {
      report.estado = 'verificado';
    }
  },

  // Rechazar un reporte
  // TODO: Reemplazar con endpoint real cuando esté disponible
  async rejectReport(reportId: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const report = mockReports.find((r) => r.id === reportId);
    if (report) {
      report.estado = 'rechazado';
    }
  },

  // Cambiar estado de usuario
  // TODO: Reemplazar con endpoint real cuando esté disponible
  async toggleUserStatus(userId: number, newStatus: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const user = mockUsers.find((u) => u.id === userId);
    if (user) {
      user.estado = newStatus;
    }
  },
};

export default adminService;
