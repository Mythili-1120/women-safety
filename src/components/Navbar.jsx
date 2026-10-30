import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Phone,
  MapPin,
  PhoneCall,
  Building2,
  History,
  User,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const userLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/contacts', label: 'Contacts', icon: Phone },
  { to: '/live-location', label: 'Live Location', icon: MapPin },
  { to: '/fake-call', label: 'Fake Call', icon: PhoneCall },
  { to: '/nearby-help', label: 'Nearby Help', icon: Building2 },
  { to: '/alert-history', label: 'History', icon: History },
  { to: '/profile', label: 'Profile', icon: User },
];

export default function Navbar() {
  const { currentUser, userProfile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }

  const displayName = userProfile?.name || currentUser?.displayName || 'User';

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <button
          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 md:hidden"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <NavLink to="/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
            <ShieldAlert size={18} />
          </span>
          <span className="hidden font-bold tracking-tight sm:block">
            Women Safety
          </span>
        </NavLink>

        <nav className="hidden items-center gap-1 md:flex">
          {userLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Toggle dark mode"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white">
                {displayName.charAt(0).toUpperCase()}
              </span>
              <span className="hidden max-w-[100px] truncate text-sm font-medium sm:block">
                {displayName}
              </span>
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate('/profile');
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <User size={15} /> Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-800"
                >
                  <LogOut size={15} /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="border-t border-gray-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-950 md:hidden">
          {userLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                    : 'text-gray-600 dark:text-gray-300'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
