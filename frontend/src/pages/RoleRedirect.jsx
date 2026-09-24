import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RoleRedirect() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'citizen') return <Navigate to="/citizen" replace />;
  // 'officer' role dashboard removed — any legacy officer accounts
  // now fall through to /admin like department staff.
  return <Navigate to="/admin" replace />;
}
