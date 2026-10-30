import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { ShieldAlert, Eye, EyeOff, Loader2, User, Mail, Phone, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isValidPhone } from '../utils/helpers';
import toast from '../utils/toast';

export default function Register() {
  const { register, currentUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);

  if (currentUser) return <Navigate to="/dashboard" replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function validate() {
    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Please enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address.';
    if (!isValidPhone(form.phone)) errs.phone = 'Enter a valid phone number with country code (e.g. +91 98765 43210).';
    if (form.password.length < 6) errs.password = 'Password must be at least 6 characters.';
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match.';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setBusy(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password, form.phone.replace(/[\s-()]/g, ''));
      toast.success('Account created. Welcome to safety!');
      navigate('/dashboard');
    } catch (err) {
      const msg =
        err.code === 'auth/email-already-in-use'
          ? 'This email is already registered. Try logging in.'
          : err.code === 'auth/weak-password'
            ? 'Password is too weak - use at least 6 characters.'
            : err.code === 'auth/network-request-failed'
              ? 'Network error - check your internet connection and try again.'
              : err.message || 'Registration failed. Please try again.';
      toast.error(msg);
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
          <h1 className="mt-4 text-2xl font-bold">Create your account</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Set up your emergency protection in two minutes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4" noValidate>
          <div>
            <label className="label" htmlFor="name">Full name</label>
            <div className="relative">
              <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input id="name" className="input-field pl-9" placeholder="Your name" value={form.name} onChange={set('name')} autoComplete="name" />
            </div>
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          <div>
            <label className="label" htmlFor="email">Email</label>
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input id="email" type="email" className="input-field pl-9" placeholder="you@example.com" value={form.email} onChange={set('email')} autoComplete="email" />
            </div>
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
          </div>

          <div>
            <label className="label" htmlFor="phone">Phone number</label>
            <div className="relative">
              <Phone size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input id="phone" type="tel" className="input-field pl-9" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} autoComplete="tel" />
            </div>
            {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input id="password" type={showPwd ? 'text' : 'password'} className="input-field pl-9 pr-9" placeholder="Min. 6 characters" value={form.password} onChange={set('password')} autoComplete="new-password" />
                <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" aria-label="Toggle password visibility">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>
            <div>
              <label className="label" htmlFor="confirm">Confirm password</label>
              <input id="confirm" type={showPwd ? 'text' : 'password'} className="input-field" placeholder="Repeat password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
              {errors.confirm && <p className="mt-1 text-xs text-red-500">{errors.confirm}</p>}
            </div>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            {busy ? 'Creating account…' : 'Create account'}
          </button>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary-600 hover:underline dark:text-primary-400">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
