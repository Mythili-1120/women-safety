import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Admin-only route guard.
 * Admin rights come from the admin_users/{uid} document that can only be
 * created from the Firebase console - normal users can never see admin pages.
 */
export default function AdminRoute({ children }) {
  const { currentUser, isAdmin } = useAuth();

  if (!currentUser) return <Navigate to="/admin/login" replace />;
  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  return children;
}
