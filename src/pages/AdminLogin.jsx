import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Loader2, Mail, ShieldAlert, ArrowLeft } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import toast from '../utils/toast';

/**
 * Separate, secure admin login.
 * Access is granted only when a admin_users/{uid} document exists - that
 * document can only be created from the Firebase console, so regular users
 * can never reach admin functionality.
 */
export default function AdminLogin() {
  const navigate = useNavigate();
  const { login, refreshRoles } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Enter the admin email and password.');
      return;
    }
    setBusy(true);
    try {
      await login(email.trim(), password);
      await refreshRoles();
      // Re-check the admin doc directly
      const snap = await getDoc(doc(db, 'admin_users', auth.currentUser.uid));
      if (!snap.exists()) {
        toast.error('This account does not have admin access.');
        setError('This account does not have admin access.');
        return;
      }
      toast.success('Admin access granted.');
      navigate('/admin/dashboard');
    } catch (err) {
      const msg =
        err.code === 'auth/invalid-credential'
          ? 'Incorrect admin email or password.'
          : err.code === 'auth/too-many-requests'
            ? 'Too many attempts - wait a moment and try again.'
            : err.message || 'Admin login failed.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-gray-200">
          <ArrowLeft size={15} /> Back to site
        </Link>
        <div className="rounded-2xl bg-gray-800 p-6 shadow-2xl ring-1 ring-gray-700">
          <div className="mb-5 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-red-600 text-white">
              <Lock size={24} />
            </span>
            <h1 className="flex items-center justify-center gap-2 text-xl font-bold text-white">
              <ShieldAlert size={19} className="text-red-400" /> Admin Login
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              Restricted area - authorized administrators only.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <p className="rounded-lg bg-red-950/70 px-3 py-2 text-sm text-red-300 ring-1 ring-red-900" role="alert">
                {error}
              </p>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300" htmlFor="a-email">Admin email</label>
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  id="a-email"
                  type="email"
                  className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3.5 py-2.5 pl-9 text-sm text-white placeholder-gray-500 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
                  placeholder="admin@yourdomain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300" htmlFor="a-pwd">Password</label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  id="a-pwd"
                  type="password"
                  className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3.5 py-2.5 pl-9 text-sm text-white placeholder-gray-500 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              disabled={busy}
            >
              {busy && <Loader2 size={15} className="animate-spin" />}
              {busy ? 'Verifying…' : 'Sign in as admin'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs leading-relaxed text-gray-500">
            Admin accounts are provisioned in the Firebase console by creating
            an <code className="text-gray-400">admin_users</code> document with the admin&apos;s uid.
            Normal user accounts cannot log in here.
          </p>
        </div>
      </div>
    </div>
  );
}
