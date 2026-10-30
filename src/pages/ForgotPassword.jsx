import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Loader2, Mail, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from '../utils/toast';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        toast.error('No account found with this email address.');
      } else if (err.code === 'auth/network-request-failed') {
        toast.error('Network error - check your internet connection.');
      } else {
        toast.error(err.message || 'Could not send the reset email.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10 dark:bg-gray-950">
      <div className="w-full max-w-md">
        <Link to="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
          <ArrowLeft size={15} /> Back to login
        </Link>
        <div className="card">
          <div className="mb-5 text-center">
            <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white">
              <ShieldAlert size={24} />
            </span>
            <h1 className="text-xl font-bold">Reset your password</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enter your account email and we will send you a reset link.
            </p>
          </div>

          {sent ? (
            <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-950/50">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                Reset email sent to <b>{email}</b>
              </p>
              <p className="mt-1 text-xs text-green-600/80 dark:text-green-400/80">
                Check your inbox (and spam folder) for the link. The email is
                delivered by Firebase Authentication.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="label" htmlFor="email">Email</label>
                <div className="relative">
                  <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input id="email" type="email" className="input-field pl-9" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
