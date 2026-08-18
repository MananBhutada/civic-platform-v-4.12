import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RoleRedirect() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'citizen') return <Navigate to="/citizen" replace />;
  if (user?.role === 'officer') return <Navigate to="/officer" replace />;
  return <Navigate to="/admin" replace />;
}
