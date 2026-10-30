import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EmergencyProvider } from './context/EmergencyContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Navbar from './components/Navbar';
import EmergencyProtectionModal from './components/EmergencyProtectionModal';
import ActiveEmergencyPanel from './components/ActiveEmergencyPanel';
import ToastHost from './components/ToastHost';
import FirebaseNotConfigured from './components/FirebaseNotConfigured';
import { isFirebaseConfigured } from './firebase/config';

import Landing from './pages/Landing';
import Register from './pages/Register';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import EmergencyContacts from './pages/EmergencyContacts';
import LiveLocation from './pages/LiveLocation';
import FakeCall from './pages/FakeCall';
import NearbyHelp from './pages/NearbyHelp';
import AlertHistory from './pages/AlertHistory';
import Profile from './pages/Profile';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-4 sm:px-6 md:pb-10">
        <Outlet />
      </main>
      {/* Active emergency panel floats above every page */}
      <ActiveEmergencyPanel />
    </div>
  );
}

function AppRoutes() {
  const { loading } = useAuth();

  if (!isFirebaseConfigured) return <FirebaseNotConfigured />;
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading Women Safety Alert System…
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* User (protected) */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/contacts" element={<EmergencyContacts />} />
          <Route path="/live-location" element={<LiveLocation />} />
          <Route path="/fake-call" element={<FakeCall />} />
          <Route path="/nearby-help" element={<NearbyHelp />} />
          <Route path="/alert-history" element={<AlertHistory />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Admin (protected + role check) */}
        <Route
          element={
            <AdminRoute>
              <AppLayout />
            </AdminRoute>
          }
        >
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* SOS confirmation popup + live progress - global, exact wording */}
      <EmergencyProtectionModal />
      <ToastHost />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <EmergencyProvider>
          <AppRoutes />
        </EmergencyProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
