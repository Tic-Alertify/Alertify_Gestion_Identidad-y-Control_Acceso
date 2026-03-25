import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function AdminRoute() {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="admin-state-screen">
        <div className="admin-spinner" />
        <p>Validando permisos...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isAdmin) {
    return (
      <div className="admin-state-screen">
        <h2>Acceso denegado</h2>
        <p>Esta sección está reservada para administradores.</p>
      </div>
    );
  }

  return <Outlet />;
}
