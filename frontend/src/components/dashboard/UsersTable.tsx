import type {
  EditableUserRole,
  PaginationMeta,
  User,
  UserFilters,
  UserStatus,
} from '../../types';

interface RowActionState {
  userId: number;
  type: 'status' | 'role';
}

interface UsersTableProps {
  users: User[];
  filters: UserFilters;
  searchValue: string;
  meta: PaginationMeta;
  loading?: boolean;
  error?: string | null;
  actionState?: RowActionState | null;
  onSearchValueChange: (value: string) => void;
  onSearchSubmit: () => void;
  onRoleFilterChange: (role: EditableUserRole | '') => void;
  onStatusFilterChange: (status: UserStatus | '') => void;
  onLimitChange: (limit: number) => void;
  onPageChange: (page: number) => void;
  onResetFilters: () => void;
  onToggleStatus: (user: User) => void;
  onChangeRole: (user: User, role: EditableUserRole) => void;
}

const resolvePrimaryRole = (roles: User['roles']): EditableUserRole => {
  const role = roles[0]?.toLowerCase();
  return role === 'admin' || role === 'administrador' ? 'admin' : 'ciudadano';
};

const roleLabel = (role: EditableUserRole): string =>
  role === 'admin' ? 'Administrador' : 'Ciudadano';

const statusLabel = (status: UserStatus): string => {
  if (status === 'activo') {
    return 'Activo';
  }
  if (status === 'inactivo') {
    return 'Inactivo';
  }
  return 'Bloqueado';
};

const nextStatus = (status: UserStatus): 'activo' | 'inactivo' =>
  status === 'activo' ? 'inactivo' : 'activo';

const statusActionLabel = (status: UserStatus): string =>
  nextStatus(status) === 'inactivo' ? 'Bloquear' : 'Desbloquear';

const totalPagesToDisplay = (meta: PaginationMeta): number =>
  meta.totalPages > 0 ? meta.totalPages : 1;

export default function UsersTable({
  users,
  filters,
  searchValue,
  meta,
  loading = false,
  error,
  actionState = null,
  onSearchValueChange,
  onSearchSubmit,
  onRoleFilterChange,
  onStatusFilterChange,
  onLimitChange,
  onPageChange,
  onResetFilters,
  onToggleStatus,
  onChangeRole,
}: UsersTableProps) {
  const hasUsers = users.length > 0;

  return (
    <div className="admin-users-panel">
      <div className="admin-users-toolbar">
        <form
          className="admin-users-search"
          onSubmit={(event) => {
            event.preventDefault();
            onSearchSubmit();
          }}
        >
          <input
            type="search"
            value={searchValue}
            onChange={(event) => onSearchValueChange(event.target.value)}
            placeholder="Buscar por nombre o correo"
            aria-label="Buscar usuarios"
          />
          <button type="submit">Buscar</button>
        </form>

        <div className="admin-users-filters">
          <label>
            Rol
            <select
              value={filters.role ?? ''}
              onChange={(event) =>
                onRoleFilterChange((event.target.value || '') as EditableUserRole | '')
              }
            >
              <option value="">Todos</option>
              <option value="admin">Administrador</option>
              <option value="ciudadano">Ciudadano</option>
            </select>
          </label>

          <label>
            Estado
            <select
              value={filters.status ?? ''}
              onChange={(event) =>
                onStatusFilterChange((event.target.value || '') as UserStatus | '')
              }
            >
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="bloqueado">Bloqueado</option>
            </select>
          </label>

          <label>
            Filas
            <select
              value={filters.limit}
              onChange={(event) => onLimitChange(Number(event.target.value))}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>

          <button type="button" className="admin-btn admin-btn--ghost" onClick={onResetFilters}>
            Limpiar
          </button>
        </div>
      </div>

      {error ? <div className="admin-table-state admin-table-state--error">{error}</div> : null}
      {loading ? <div className="admin-table-state">Cargando usuarios...</div> : null}
      {!loading && !error && !hasUsers ? (
        <div className="admin-table-state">No se encontraron usuarios con los filtros actuales.</div>
      ) : null}

      {!loading && !error && hasUsers ? (
        <>
          <div className="admin-table-wrapper">
            <table className="admin-table admin-users-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => {
                  const role = resolvePrimaryRole(user.roles);
                  const status = user.estado ?? 'activo';
                  const pending = actionState?.userId === user.id;

                  return (
                    <tr key={user.id}>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>{roleLabel(role)}</td>
                      <td>
                        <span
                          className={`admin-status-pill admin-status-pill--${status === 'activo' ? 'success' : status === 'inactivo' ? 'neutral' : 'warning'}`}
                        >
                          {statusLabel(status)}
                        </span>
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          <select
                            value={role}
                            disabled={pending || loading}
                            onChange={(event) =>
                              onChangeRole(user, event.target.value as EditableUserRole)
                            }
                            aria-label={`Cambiar rol de ${user.username}`}
                          >
                            <option value="admin">Administrador</option>
                            <option value="ciudadano">Ciudadano</option>
                          </select>

                          <button
                            type="button"
                            className="admin-btn admin-btn--small"
                            disabled={pending || loading}
                            onClick={() => onToggleStatus(user)}
                          >
                            {statusActionLabel(status)}
                          </button>

                          {pending ? (
                            <span className="admin-row-actions__busy">
                              {actionState?.type === 'role' ? 'Actualizando rol...' : 'Actualizando estado...'}
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="admin-pagination">
            <span>
              Mostrando {users.length} de {meta.total} usuarios
            </span>

            <div className="admin-pagination__controls">
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                disabled={!meta.hasPreviousPage || loading}
                onClick={() => onPageChange(meta.page - 1)}
              >
                Anterior
              </button>

              <span>
                Pagina {meta.page} de {totalPagesToDisplay(meta)}
              </span>

              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                disabled={!meta.hasNextPage || loading}
                onClick={() => onPageChange(meta.page + 1)}
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
