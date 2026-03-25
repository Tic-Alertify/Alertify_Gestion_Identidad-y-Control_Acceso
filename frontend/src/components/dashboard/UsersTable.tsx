import type { AdminUserRow } from '../../types';

interface UsersTableProps {
  users: AdminUserRow[];
  loading?: boolean;
  error?: string | null;
}

const roleLabel = (roles: string[]): string => {
  const role = roles[0]?.toLowerCase();
  if (role === 'admin' || role === 'administrador') {
    return 'Administrador';
  }
  if (role === 'ciudadano') {
    return 'Ciudadano';
  }
  return role ?? 'Sin rol';
};

export default function UsersTable({ users, loading = false, error }: UsersTableProps) {
  if (loading) {
    return <div className="admin-table-state">Cargando directorio de usuarios...</div>;
  }

  if (error) {
    return <div className="admin-table-state admin-table-state--error">{error}</div>;
  }

  if (users.length === 0) {
    return <div className="admin-table-state">No hay usuarios para mostrar.</div>;
  }

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                <div className="table-user-block">
                  <span className="table-user-name">{user.username}</span>
                  <small>{user.email}</small>
                </div>
              </td>
              <td>{roleLabel(user.roles)}</td>
              <td>{user.estado}</td>
              <td className="table-actions">✎ ⦸</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
