import { useMemo, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { EyeOff, Lock, User } from 'lucide-react';
import backgroundPanelAdmin from '../assets/backgroundPanelAdmin 1.png';

type LocationState = {
  from?: {
    pathname?: string;
  };
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message === 'ACCESS_DENIED') {
    return 'Acceso denegado. Solo administradores pueden ingresar al panel.';
  }

  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response
  ) {
    const responseData = (error.response as { data?: unknown }).data;
    if (responseData && typeof responseData === 'object' && 'message' in responseData) {
      const message = (responseData as { message?: unknown }).message;
      if (Array.isArray(message)) {
        return message.join(', ');
      }
      if (typeof message === 'string') {
        return message;
      }
    }
  }

  return 'No se pudo iniciar sesión. Verifica tus credenciales.';
};

export default function LoginPage() {
  const { isAuthenticated, isAdmin, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const redirectPath = useMemo(() => {
    const state = location.state as LocationState | null;
    return state?.from?.pathname || '/admin/dashboard';
  }, [location.state]);

  if (isAuthenticated && isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    try {
      await login(email, password);
      navigate(redirectPath, { replace: true });
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-login">
      <div className="admin-login__overlay" />
      <img
        src={backgroundPanelAdmin}
        alt=""
        aria-hidden="true"
        className="admin-login__bg-image"
      />

      <div className="admin-login__card">
        <form onSubmit={handleSubmit}>
          <div className="admin-login__field">
            <User size={22} strokeWidth={1.8} className="admin-login__field-icon" />
            <input
              id="email"
              type="text"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Username or Email"
              required
              autoComplete="email"
              disabled={submitting}
            />
          </div>

          <div className="admin-login__field">
            <Lock size={22} strokeWidth={1.8} className="admin-login__field-icon" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              required
              autoComplete="current-password"
              disabled={submitting}
            />

            <button
              type="button"
              className="admin-login__eye-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              disabled={submitting}
            >
              <EyeOff size={22} strokeWidth={1.8} />
            </button>
          </div>

          <p className="admin-login__forgot">Forgot password ?</p>

          {errorMessage ? <div className="admin-login__error">{errorMessage}</div> : null}

          <button type="submit" disabled={submitting} className="admin-login__submit">
            {submitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
