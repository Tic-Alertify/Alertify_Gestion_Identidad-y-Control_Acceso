import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../components/layout/AdminLayout';
import ReportsTable from '../components/reports/ReportsTable';
import adminService from '../services/adminService';
import type { AdminReportRow } from '../types';

export default function ReportsPage() {
  const [reports, setReports] = useState<AdminReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [dataNote, setDataNote] = useState<string | null>(null);

  const loadReports = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await adminService.getReports();
      setReports(result.data);
      setDataNote(result.note || null);
    } catch (requestError) {
      setError(adminService.errorToMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReports();
  }, []);

  const handleVerify = async (reportId: number) => {
    setError(null);
    try {
      await adminService.verifyReport(reportId);
      setSuccessMessage('Reporte verificado correctamente.');
      await loadReports();
    } catch (requestError) {
      setError(adminService.errorToMessage(requestError));
    }
  };

  const handleReject = async (reportId: number) => {
    setError(null);
    try {
      await adminService.rejectReport(reportId);
      setSuccessMessage('Reporte rechazado correctamente.');
      await loadReports();
    } catch (requestError) {
      setError(adminService.errorToMessage(requestError));
    }
  };

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setSuccessMessage(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  const pendingReports = useMemo(
    () => reports.filter((report) => report.estado === 'pendiente'),
    [reports],
  );

  return (
    <AdminLayout pageTitle="Gestión de reportes">
      {error ? <div className="admin-banner admin-banner--error">{error}</div> : null}
      {successMessage ? <div className="admin-banner admin-banner--success">{successMessage}</div> : null}
      {dataNote ? <div className="admin-banner admin-banner--info">{dataNote}</div> : null}

      <section className="admin-card">
        <h2>Reportes por verificar</h2>
        <ReportsTable
          reports={pendingReports}
          loading={loading}
          error={null}
          onVerify={handleVerify}
          onReject={handleReject}
        />
      </section>
    </AdminLayout>
  );
}
