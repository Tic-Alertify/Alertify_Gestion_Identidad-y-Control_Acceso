import { useEffect, useState } from 'react';
import AdminLayout from '../components/layout/AdminLayout';
import Header from '../components/layout/Header';
import StatCard from '../components/cards/StatCard';
import UsersTable from '../components/tables/UsersTable';
import { adminService } from '../services/admin';
import { DashboardStats, UserListItem } from '../types';
import { Users, FileWarning, AlertCircle } from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Verificar conexión con backend admin
        await adminService.healthCheck();

        // Cargar estadísticas
        const statsData = await adminService.getStats();
        setStats(statsData);
        setLoadingStats(false);

        // Cargar usuarios
        const usersData = await adminService.getUsers();
        setUsers(usersData);
        setLoadingUsers(false);
      } catch (err) {
        console.error('Error al cargar dashboard:', err);
        setError('Error al cargar los datos del dashboard');
        setLoadingStats(false);
        setLoadingUsers(false);
      }
    };

    fetchData();
  }, []);

  return (
    <AdminLayout>
      <Header
        title="Panel Principal"
        subtitle="Bienvenido al panel de administración de Alertify"
      />

      <div className="dashboard-content">
        {error && (
          <div className="error-banner">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Tarjetas de estadísticas */}
        <section className="stats-section">
          <StatCard
            title="Sesiones activas"
            value={loadingStats ? '...' : (stats?.activeSessions ?? 0)}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Reportes pendientes"
            value={loadingStats ? '...' : (stats?.pendingReports ?? 0)}
            icon={FileWarning}
            color="orange"
          />
        </section>

        {/* Tabla de usuarios */}
        <section className="users-section">
          <div className="section-header">
            <h2>Directorio de usuarios</h2>
          </div>
          <UsersTable users={users} loading={loadingUsers} />
        </section>
      </div>
    </AdminLayout>
  );
}
