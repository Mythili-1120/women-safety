import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Siren,
  MapPin,
  Phone,
  Mic,
  PhoneCall,
  Building2,
  History,
  Moon,
  Sun,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const features = [
  {
    icon: Siren,
    title: 'One-Tap SOS',
    desc: 'Confirm, and your alarm sounds while trusted contacts receive your exact GPS location instantly.',
  },
  {
    icon: MapPin,
    title: 'Live Location Sharing',
    desc: 'Your position keeps updating during an emergency, with a direct Google Maps link for responders.',
  },
  {
    icon: Phone,
    title: 'Trusted Contacts',
    desc: 'Save the people who matter with primary-contact priority and validated phone numbers.',
  },
  {
    icon: Mic,
    title: 'Voice Activation',
    desc: 'Set your own safety phrase - say it out loud to open SOS protection, hands-free.',
  },
  {
    icon: PhoneCall,
    title: 'Fake Call',
    desc: 'Trigger a realistic incoming call from a name you choose to exit unsafe situations.',
  },
  {
    icon: Building2,
    title: 'Nearby Help Centers',
    desc: 'Find police stations, hospitals and help centers around you with one-tap directions.',
  },
];

export default function Landing() {
  const { theme, toggleTheme } = useTheme();
  const { currentUser, isAdmin } = useAuth();

  if (currentUser) {
    return <Navigate to={isAdmin ? '/admin/dashboard' : '/dashboard'} replace />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white">
            <ShieldAlert size={20} />
          </span>
          <span className="text-lg font-bold tracking-tight">Women Safety</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link to="/admin/login" className="btn-secondary hidden items-center gap-1.5 text-xs sm:inline-flex">
            <Lock size={13} /> Admin
          </Link>
          <Link to="/login" className="btn-secondary text-sm">Log in</Link>
          <Link to="/register" className="btn-primary text-sm">Get started</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 text-center sm:px-6 sm:pt-16">
        <span className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 dark:bg-red-950/60 dark:text-red-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
          </span>
          Emergency protection in one tap
        </span>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Help is one tap away —{' '}
          <span className="text-primary-600 dark:text-primary-400">whenever you need it</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-gray-300 sm:text-lg">
          Alert your trusted contacts with your live location, sound a loud
          emergency alarm and find nearby help — all from one app, designed to
          work when it matters most.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/register" className="btn-primary px-6 py-3 text-base">
            Create free account <ArrowRight size={18} />
          </Link>
          <Link to="/login" className="btn-secondary px-6 py-3 text-base">
            I already have an account
          </Link>
        </div>

        {/* Feature grid */}
        <div className="mt-16 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card transition hover:shadow-md">
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
                <Icon size={20} />
              </span>
              <h3 className="mb-1 font-semibold">{title}</h3>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {desc}
              </p>
            </div>
          ))}
        </div>

        {/* Trust strip */}
        <div className="mt-14 grid gap-4 rounded-2xl bg-gray-50 p-6 text-left dark:bg-gray-900 sm:grid-cols-3">
          {[
            { t: 'Real GPS only', d: 'Your location comes from your device GPS with high accuracy — never fake or approximate.' },
            { t: 'Private by design', d: 'Location is shared only during an active emergency and only with your contacts.' },
            { t: 'Honest status', d: 'Every alert shows its true delivery state: Pending, Sent or Failed.' },
          ].map((x) => (
            <div key={x.t} className="flex items-start gap-3">
              <History size={0} className="hidden" />
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-500" />
              <div>
                <p className="text-sm font-semibold">{x.t}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{x.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-400 dark:border-gray-800">
        Women Safety Alert System · In an immediate crisis always call your local
        emergency number.
      </footer>
    </div>
  );
}
