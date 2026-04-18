// src/components/common/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FullPageLoader } from './KineticLoader';

/** Requires authentication. Optionally restricts to specific roles. */
export function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const roleName = user?.role_name || user?.roleName;

  if (isLoading) return <FullPageLoader />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(roleName)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

/** Redirects already-authenticated users away from login/register pages. */
export function GuestRoute({ children }) {
  const { isAuthenticated, isLoading, dashboardPath } = useAuth();

  if (isLoading) return <FullPageLoader />;
  if (isAuthenticated) return <Navigate to={dashboardPath} replace />;

  return children;
}

// Default export so appRoutes.jsx can import it either way
export default ProtectedRoute;