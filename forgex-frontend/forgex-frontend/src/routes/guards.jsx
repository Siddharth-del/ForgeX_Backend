import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from '../components/common/Spinner';

export function RequireAuth() {
  const { isAuthenticated, checking } = useAuth();
  const location = useLocation();
  if (checking) return <PageLoader />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

/** UI guard only. Every /api/admin/** call is still authorised by the backend. */
export function RequireAdmin() {
  const { isAuthenticated, isAdmin, checking } = useAuth();
  const location = useLocation();
  if (checking) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}

export function GuestOnly() {
  const { isAuthenticated, checking } = useAuth();
  const location = useLocation();
  if (checking) return <PageLoader />;
  if (isAuthenticated) return <Navigate to={location.state?.from || '/'} replace />;
  return <Outlet />;
}
