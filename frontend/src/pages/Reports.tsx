import { useEffect, useState } from 'react';
import AdminLayout from '../components/layout/AdminLayout';
import Header from '../components/layout/Header';
import ReportsTable from '../components/tables/ReportsTable';
import { adminService } from '../services/admin';
import { Report } from '../types';
import { AlertCircle, CheckCircle } from 'lucide-react';
import './Reports.css';

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      const data = await adminService.getReports();
      setReports(data);
      setLoading(false);
    } catch (err) {
      console.error('Error al cargar reportes:', err);
      setError('Error al cargar los reportes');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleVerify = async (reportId: number) => {
    try {
      await adminService.verifyReport(reportId);
      setSuccess('Reporte verificado exitosamente');
      // Actualizar la lista
      await fetchReports();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Error al verificar el reporte');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleReject = async (reportId: number) => {
    try {
      await adminService.rejectReport(reportId);
      setSuccess('Reporte rechazado');
      // Actualizar la lista
      await fetchReports();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Error al rechazar el reporte');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Filtrar reportes pendientes
  const pendingReports = reports.filter((r) => r.estado === 'pendiente');
  const otherReports = reports.filter((r) => r.estado !== 'pendiente');

  return (
    <AdminLayout>
      <Header
        title="Gestión de Reportes"
        subtitle="Administra y verifica los reportes de los ciudadanos"
      />

      <div className="reports-content">
        {error && (
          <div className="error-banner">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="success-banner">
            <CheckCircle size={20} />
            <span>{success}</span>
          </div>
        )}

        {/* Reportes pendientes */}
        <section className="reports-section">
          <div className="section-header">
            <h2>Reportes por verificar</h2>
            <span className="badge">{pendingReports.length}</span>
          </div>
          <ReportsTable
            reports={pendingReports}
            loading={loading}
            onVerify={handleVerify}
            onReject={handleReject}
          />
        </section>

        {/* Historial de reportes */}
        {otherReports.length > 0 && (
          <section className="reports-section">
            <div className="section-header">
              <h2>Historial de reportes</h2>
            </div>
            <ReportsTable reports={otherReports} loading={false} />
          </section>
        )}
      </div>
    </AdminLayout>
  );
}
