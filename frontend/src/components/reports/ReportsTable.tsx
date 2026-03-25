import type { AdminReportRow } from '../../types';

interface ReportsTableProps {
  reports: AdminReportRow[];
  loading?: boolean;
  error?: string | null;
  onVerify?: (reportId: number) => void;
  onReject?: (reportId: number) => void;
}

export default function ReportsTable({
  reports,
  loading = false,
  error,
  onVerify,
  onReject,
}: ReportsTableProps) {
  if (loading) {
    return <div className="admin-table-state">Cargando reportes pendientes...</div>;
  }

  if (error) {
    return <div className="admin-table-state admin-table-state--error">{error}</div>;
  }

  if (reports.length === 0) {
    return <div className="admin-table-state">No hay reportes pendientes.</div>;
  }

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Reporte</th>
            <th>Usuario</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {reports.map((report) => (
            <tr key={report.id}>
              <td>{report.titulo}</td>
              <td>
                <div className="table-user-block">
                  <span className="table-user-name">{report.usuario}</span>
                  <small>{report.usuarioEmail || 'Sin correo registrado'}</small>
                </div>
              </td>
              <td>{report.estado}</td>
              <td className="table-actions">
                <button type="button" onClick={() => onVerify?.(report.id)} title="Verificar">
                  ✓
                </button>
                <button type="button" onClick={() => onReject?.(report.id)} title="Rechazar">
                  ⦸
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
