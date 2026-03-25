import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Users } from 'lucide-react';
import AdminLayout from '../components/layout/AdminLayout';
import MetricCard from '../components/dashboard/MetricCard';
import UsersTable from '../components/dashboard/UsersTable';
import adminService from '../services/adminService';
import type { AdminUserRow, DashboardMetrics } from '../types';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataNote, setDataNote] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError(null);
      setDataNote(null);

      try {
        await adminService.healthCheck();
      } catch {
        setError('No fue posible validar acceso administrativo.');
        setLoading(false);
        return;
      }

      try {
        const [metricsResult, usersResult] = await Promise.all([
          adminService.getDashboardMetrics(),
          adminService.getUsers(),
        ]);

        setMetrics(metricsResult.data);
        setUsers(usersResult.data);

        const notes = [metricsResult.note, usersResult.note].filter(
          (note): note is string => Boolean(note),
        );
        if (notes.length > 0) {
          setDataNote(notes.join(' '));
        }
      } catch (requestError) {
        setError(adminService.errorToMessage(requestError));
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const safeMetrics = useMemo(
    () =>
      metrics ?? {
        activeSessions: 0,
        pendingReports: 0,
      },
    [metrics],
  );

  return (
    <AdminLayout pageTitle="Panel de administrador">
      {error ? <div className="admin-banner admin-banner--error">{error}</div> : null}
      {dataNote ? <div className="admin-banner admin-banner--info">{dataNote}</div> : null}

      <section className="admin-metrics-grid">
        <MetricCard
          title="Sesiones activas"
          value={safeMetrics.activeSessions}
          icon={Users}
          loading={loading}
        />

        <MetricCard
          title="Reportes pendientes"
          value={safeMetrics.pendingReports}
          icon={AlertTriangle}
          loading={loading}
        />
      </section>

      <section className="admin-card">
        <h2>Directorio de usuarios</h2>
        <UsersTable users={users} loading={loading} error={null} />
      </section>
    </AdminLayout>
  );
}
