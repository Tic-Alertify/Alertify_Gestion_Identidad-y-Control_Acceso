import { FormEvent, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

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

      <div className="admin-login__card">
        <h1>Panel de administración</h1>
        <p>Ingresa con tu cuenta administrativa de Alertify</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Usuario o email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@alertify.com"
            required
            autoComplete="email"
            disabled={submitting}
          />

          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="********"
            required
            autoComplete="current-password"
            disabled={submitting}
          />

          {errorMessage ? <div className="admin-login__error">{errorMessage}</div> : null}

          <button type="submit" disabled={submitting}>
            {submitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
