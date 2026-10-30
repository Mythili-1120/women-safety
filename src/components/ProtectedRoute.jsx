import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Blocks pages for signed-out users (with an optional admin requirement). */
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { currentUser, isAdmin } = useAuth();

  if (!currentUser) {
    return <Navigate to={adminOnly ? '/admin/login' : '/login'} replace />;
  }
  if (adminOnly && !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}
