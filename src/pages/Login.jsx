import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { ShieldAlert, Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from '../utils/toast';

export default function Login() {
  const { login, currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (currentUser) return <Navigate to={isAdmin ? '/admin/dashboard' : '/dashboard'} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }
    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      toast.success(`Welcome back${user.displayName ? ', ' + user.displayName : ''}!`);
      navigate('/dashboard');
    } catch (err) {
      const msg =
        err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found'
          ? 'Incorrect email or password.'
          : err.code === 'auth/too-many-requests'
            ? 'Too many attempts. Please wait a moment and try again.'
            : err.code === 'auth/network-request-failed'
              ? 'Network error - check your internet connection.'
              : err.message || 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 dark:bg-gray-950">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white">
              <ShieldAlert size={22} />
            </span>
            <span className="text-xl font-bold">Women Safety</span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Log in to your safety dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4" noValidate>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/60 dark:text-red-300" role="alert">
              {error}
            </p>
          )}
          <div>
            <label className="label" htmlFor="email">Email</label>
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input id="email" type="email" className="input-field pl-9" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input id="password" type={showPwd ? 'text' : 'password'} className="input-field pl-9 pr-9" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" aria-label="Toggle password visibility">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="text-right">
            <Link to="/forgot-password" className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400">
              Forgot password?
            </Link>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            {busy ? 'Logging in…' : 'Log in'}
          </button>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            New here?{' '}
            <Link to="/register" className="font-semibold text-primary-600 hover:underline dark:text-primary-400">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
