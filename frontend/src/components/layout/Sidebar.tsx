import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Bell, Home, FileText, LogOut } from 'lucide-react';

export default function Sidebar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__brand">
        <div>
          <Bell size={28} />
          <span>Alertify</span>
        </div>
        <p>Panel Admin</p>
      </div>

      <nav className="admin-sidebar__menu">
        <NavLink
          to="/admin/dashboard"
          className={({ isActive }) =>
            `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
          }
        >
          <Home size={20} />
          <span>Inicio</span>
        </NavLink>

        <NavLink
          to="/admin/reportes"
          className={({ isActive }) =>
            `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`
          }
        >
          <FileText size={20} />
          <span>Gestión de reportes</span>
        </NavLink>
      </nav>

      <div className="admin-sidebar__footer">
        {user && (
          <div className="admin-sidebar__user-info">
            <div className="admin-sidebar__user-avatar">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="admin-sidebar__user-details">
              <span className="admin-sidebar__user-name">{user.username}</span>
              <span className="admin-sidebar__user-role">Administrador</span>
            </div>
          </div>
        )}

        <button className="admin-sidebar__logout" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
