import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Users } from 'lucide-react';
import AdminLayout from '../components/layout/AdminLayout';
import MetricCard from '../components/dashboard/MetricCard';
import UsersTable from '../components/dashboard/UsersTable';
import ConfirmDialog from '../components/common/ConfirmDialog';
import adminUsersService from '../services/admin';
import adminService from '../services/adminService';
import type {
  DashboardMetrics,
  EditableUserRole,
  PaginationMeta,
  User,
  UserFilters,
  UserStatus,
} from '../types';

const DEFAULT_USERS_META: PaginationMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

const DEFAULT_USERS_FILTERS: UserFilters = {
  page: 1,
  limit: 10,
  search: '',
  role: '',
  status: '',
};

const getPrimaryRole = (user: User): EditableUserRole => {
  const firstRole = user.roles[0]?.toLowerCase();
  return firstRole === 'admin' || firstRole === 'administrador' ? 'admin' : 'ciudadano';
};

type PendingConfirmation =
  | {
      type: 'status';
      user: User;
      nextStatus: 'activo' | 'inactivo';
      title: string;
      description: string;
      confirmLabel: string;
      successMessage: string;
    }
  | {
      type: 'role';
      user: User;
      nextRole: EditableUserRole;
      title: string;
      description: string;
      confirmLabel: string;
      successMessage: string;
    };

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [usersMeta, setUsersMeta] = useState<PaginationMeta>(DEFAULT_USERS_META);
  const [usersFilters, setUsersFilters] = useState<UserFilters>(DEFAULT_USERS_FILTERS);
  const [searchInput, setSearchInput] = useState('');

  const [metricsLoading, setMetricsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);

  const [globalError, setGlobalError] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [dataNote, setDataNote] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [actionState, setActionState] = useState<{
    userId: number;
    type: 'status' | 'role';
  } | null>(null);

  const loadUsers = useCallback(async (filters: UserFilters) => {
    setUsersLoading(true);
    setUsersError(null);

    try {
      const response = await adminUsersService.getUsers(filters);
      setUsers(response.data);
      setUsersMeta(response.meta);
    } catch (requestError) {
      setUsersError(adminUsersService.errorToMessage(requestError));
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadMetrics = async () => {
      setMetricsLoading(true);
      setGlobalError(null);
      setDataNote(null);

      try {
        await adminService.healthCheck();
      } catch {
        setGlobalError('No fue posible validar acceso administrativo.');
        setMetricsLoading(false);
        return;
      }

      try {
        const metricsResult = await adminService.getDashboardMetrics();
        setMetrics(metricsResult.data);
        setDataNote(metricsResult.note || null);
      } catch (requestError) {
        setGlobalError(adminService.errorToMessage(requestError));
      } finally {
        setMetricsLoading(false);
      }
    };

    void loadMetrics();
  }, []);

  useEffect(() => {
    void loadUsers(usersFilters);
  }, [usersFilters, loadUsers]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setSuccessMessage(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  const safeMetrics = useMemo(
    () =>
      metrics ?? {
        activeSessions: 0,
        pendingReports: 0,
      },
    [metrics],
  );

  const refreshUsers = async () => {
    await loadUsers(usersFilters);
  };

  const handleSearchSubmit = () => {
    setUsersFilters((prev) => ({
      ...prev,
      page: 1,
      search: searchInput.trim(),
    }));
  };

  const handleRoleFilterChange = (role: EditableUserRole | '') => {
    setUsersFilters((prev) => ({
      ...prev,
      page: 1,
      role,
    }));
  };

  const handleStatusFilterChange = (status: UserStatus | '') => {
    setUsersFilters((prev) => ({
      ...prev,
      page: 1,
      status,
    }));
  };

  const handleLimitChange = (limit: number) => {
    setUsersFilters((prev) => ({
      ...prev,
      page: 1,
      limit,
    }));
  };

  const handlePageChange = (page: number) => {
    setUsersFilters((prev) => ({
      ...prev,
      page,
    }));
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setUsersFilters(DEFAULT_USERS_FILTERS);
  };

  const handleToggleStatus = (user: User) => {
    const currentStatus = user.estado ?? 'activo';
    const nextStatus: 'activo' | 'inactivo' = currentStatus === 'activo' ? 'inactivo' : 'activo';
    const blocking = nextStatus === 'inactivo';

    setPendingConfirmation({
      type: 'status',
      user,
      nextStatus,
      title: blocking ? 'Confirmar bloqueo de usuario' : 'Confirmar desbloqueo de usuario',
      description: blocking
        ? `¿Está seguro que desea revocar el acceso a ${user.username}?`
        : `¿Está seguro que desea restablecer el acceso de ${user.username}?`,
      confirmLabel: blocking ? 'Sí, bloquear' : 'Sí, desbloquear',
      successMessage: `Estado de ${user.username} actualizado a ${nextStatus}.`,
    });
  };

  const handleChangeRole = (user: User, nextRole: EditableUserRole) => {
    const currentRole = getPrimaryRole(user);
    if (currentRole === nextRole) {
      return;
    }

    const assigningAdmin = nextRole === 'admin';

    setPendingConfirmation({
      type: 'role',
      user,
      nextRole,
      title: assigningAdmin ? 'Confirmar asignación de rol administrador' : 'Confirmar revocación de rol administrador',
      description: assigningAdmin
        ? `¿Está seguro que desea asignar rol de administrador a ${user.username}?`
        : `¿Está seguro que desea remover privilegios de administrador a ${user.username}?`,
      confirmLabel: assigningAdmin ? 'Sí, asignar admin' : 'Sí, cambiar rol',
      successMessage: `Rol de ${user.username} actualizado a ${nextRole}.`,
    });
  };

  const closeConfirmation = () => {
    if (confirmLoading) {
      return;
    }

    setPendingConfirmation(null);
  };

  const handleConfirmAction = async () => {
    if (!pendingConfirmation) {
      return;
    }

    setUsersError(null);
    setConfirmLoading(true);
    setActionState({ userId: pendingConfirmation.user.id, type: pendingConfirmation.type });

    try {
      if (pendingConfirmation.type === 'status') {
        await adminUsersService.updateUserStatus(
          pendingConfirmation.user.id,
          pendingConfirmation.nextStatus,
        );
      } else {
        await adminUsersService.updateUserRole(
          pendingConfirmation.user.id,
          pendingConfirmation.nextRole,
        );
      }

      setSuccessMessage(pendingConfirmation.successMessage);
      setPendingConfirmation(null);
      await refreshUsers();
    } catch (requestError) {
      setUsersError(adminUsersService.errorToMessage(requestError));
    } finally {
      setConfirmLoading(false);
      setActionState(null);
    }
  };

  return (
    <AdminLayout pageTitle="Panel de administrador">
      {globalError ? <div className="admin-banner admin-banner--error">{globalError}</div> : null}
      {successMessage ? <div className="admin-banner admin-banner--success">{successMessage}</div> : null}
      {dataNote ? <div className="admin-banner admin-banner--info">{dataNote}</div> : null}

      <section className="admin-metrics-grid">
        <MetricCard
          title="Sesiones activas"
          value={safeMetrics.activeSessions}
          icon={Users}
          loading={metricsLoading}
        />

        <MetricCard
          title="Reportes pendientes"
          value={safeMetrics.pendingReports}
          icon={AlertTriangle}
          loading={metricsLoading}
        />
      </section>

      <section className="admin-card">
        <h2>Directorio de usuarios</h2>
        <UsersTable
          users={users}
          filters={usersFilters}
          searchValue={searchInput}
          meta={usersMeta}
          loading={usersLoading}
          error={usersError}
          actionState={actionState}
          onSearchValueChange={setSearchInput}
          onSearchSubmit={handleSearchSubmit}
          onRoleFilterChange={handleRoleFilterChange}
          onStatusFilterChange={handleStatusFilterChange}
          onLimitChange={handleLimitChange}
          onPageChange={handlePageChange}
          onResetFilters={handleResetFilters}
          onToggleStatus={handleToggleStatus}
          onChangeRole={handleChangeRole}
        />
      </section>

      <ConfirmDialog
        open={Boolean(pendingConfirmation)}
        title={pendingConfirmation?.title ?? ''}
        description={pendingConfirmation?.description ?? ''}
        confirmLabel={pendingConfirmation?.confirmLabel ?? 'Confirmar'}
        cancelLabel="Cancelar"
        loading={confirmLoading}
        onCancel={closeConfirmation}
        onConfirm={handleConfirmAction}
      />
    </AdminLayout>
  );
}
