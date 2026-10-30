import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Siren,
  BellRing,
  Phone,
  MessageSquareWarning,
  LogOut,
  Loader2,
  Search,
  RefreshCw,
  CheckCircle2,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getCountFromServer,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { formatDateTime, coordText, statusBadgeClass, truncate } from '../utils/helpers';
import { INCIDENT_TYPES } from '../utils/constants';
import toast from '../utils/toast';

const COLORS = ['#ec4899', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981'];

function StatCard({ icon: Icon, label, value, tone }) {
  const tones = {
    pink: 'bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300',
  };
  return (
    <div className="card flex items-center gap-4">
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon size={21} />
      </span>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { logout, isAdmin, currentUser } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, alerts: 0, active: 0, contacts: 0, incidents: 0 });
  const [alerts7d, setAlerts7d] = useState([]); // [{day, sos, voice}]
  const [users7d, setUsers7d] = useState([]); // [{day, users}]
  const [typeSplit, setTypeSplit] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [users, setUsers] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  async function loadAll() {
    if (!db) return;
    setRefreshing(true);
    try {
      const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

      // Counts (real aggregation queries)
      const [uSnap, aSnap, cSnap, iSnap, activeSnap] = await Promise.all([
        getCountFromServer(query(collection(db, 'users'))),
        getCountFromServer(query(collection(db, 'emergency_alerts'))),
        getCountFromServer(query(collection(db, 'emergency_contacts'))),
        getCountFromServer(query(collection(db, 'reported_incidents'))),
        getCountFromServer(query(collection(db, 'emergency_alerts'), where('status', '==', 'active'))),
      ]);
      setStats({
        users: uSnap.data().count,
        alerts: aSnap.data().count,
        contacts: cSnap.data().count,
        incidents: iSnap.data().count,
        active: activeSnap.data().count,
      });

      // Recent alerts + last-7-day alerts for charts
      const alertsQ = query(
        collection(db, 'emergency_alerts'),
        orderBy('startedAt', 'desc'),
        limit(100)
      );
      const alertsSnap = await getDocs(alertsQ);
      const allAlerts = alertsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          startedMs: data.startedAt?.toDate?.() ? data.startedAt.toDate().getTime() : 0,
        };
      });
      setRecentAlerts(allAlerts.slice(0, 10));

      // Bucket the last 7 days
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        days.push({ start: d.getTime(), end: d.getTime() + 86400000, label: d.toLocaleDateString(undefined, { weekday: 'short' }) });
      }
      const in7d = allAlerts.filter((a) => a.startedMs >= weekAgo.getTime());
      setAlerts7d(
        days.map((day) => ({
          day: day.label,
          sos: in7d.filter((a) => a.type !== 'voice' && a.startedMs >= day.start && a.startedMs < day.end).length,
          voice: in7d.filter((a) => a.type === 'voice' && a.startedMs >= day.start && a.startedMs < day.end).length,
        }))
      );
      const sosCount = in7d.filter((a) => a.type !== 'voice').length;
      const voiceCount = in7d.filter((a) => a.type === 'voice').length;
      setTypeSplit([
        { name: 'Button SOS', value: sosCount },
        { name: 'Voice SOS', value: voiceCount },
      ]);

      // Users list + growth
      const usersQ = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(50));
      const usersSnap = await getDocs(usersQ);
      const userList = usersSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdMs: data.createdAt?.toDate?.() ? data.createdAt.toDate().getTime() : 0,
        };
      });
      setUsers(userList);
      setUsers7d(
        days.map((day) => ({
          day: day.label,
          users: userList.filter((u) => u.createdMs >= day.start && u.createdMs < day.end).length,
        }))
      );

      // Incidents
      const incQ = query(collection(db, 'reported_incidents'), orderBy('createdAt', 'desc'), limit(50));
      const incSnap = await getDocs(incQ);
      setIncidents(incSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Admin dashboard load failed:', err);
      toast.error(
        err.code === 'permission-denied'
          ? 'Your account is not recognized as an admin by the security rules.'
          : err.code === 'failed-precondition'
            ? 'A Firestore index is missing - deploy firestore.indexes.json.'
            : 'Failed to load dashboard data. Check your connection.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resolveAlert(a) {
    try {
      await updateDoc(doc(db, 'emergency_alerts', a.id), {
        status: 'resolved',
        resolvedAt: serverTimestamp(),
        resolvedBy: 'admin',
      });
      setRecentAlerts((prev) => prev.map((x) => (x.id === a.id ? { ...x, status: 'resolved' } : x)));
      setStats((s) => ({ ...s, active: Math.max(0, s.active - 1) }));
      toast.success('Alert marked as resolved.');
    } catch (err) {
      console.error(err);
      toast.error('Could not resolve the alert.');
    }
  }

  async function updateIncidentStatus(inc, status) {
    try {
      await updateDoc(doc(db, 'reported_incidents', inc.id), {
        status,
        updatedAt: serverTimestamp(),
      });
      setIncidents((prev) => prev.map((x) => (x.id === inc.id ? { ...x, status } : x)));
      toast.success(`Incident marked ${status}.`);
    } catch {
      toast.error('Could not update the incident.');
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/admin/login');
  }

  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true;
    const s = userSearch.toLowerCase();
    return (u.name || '').toLowerCase().includes(s) || (u.email || '').toLowerCase().includes(s) || (u.phone || '').includes(s);
  });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={30} className="animate-spin text-primary-500" />
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'alerts', label: 'Recent Alerts' },
    { id: 'users', label: 'Users' },
    { id: 'incidents', label: 'Incidents' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Admin Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Platform-wide safety monitoring · {currentUser?.email}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs" onClick={loadAll} disabled={refreshing}>
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button className="btn-secondary text-xs" onClick={handleLogout}>
            <LogOut size={13} /> Log out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === t.id
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ---------------- Overview ---------------- */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard icon={Users} label="Registered users" value={stats.users} tone="pink" />
            <StatCard icon={Siren} label="Total SOS alerts" value={stats.alerts} tone="red" />
            <StatCard icon={BellRing} label="Active emergencies" value={stats.active} tone="amber" />
            <StatCard icon={Phone} label="Trusted contacts" value={stats.contacts} tone="blue" />
            <StatCard icon={MessageSquareWarning} label="Incident reports" value={stats.incidents} tone="purple" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card">
              <h2 className="mb-3 font-semibold">Alerts · last 7 days</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={alerts7d} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#8884" vertical={false} />
                  <XAxis dataKey="day" fontSize={12} tickLine={false} />
                  <YAxis allowDecimals={false} fontSize={12} tickLine={false} width={26} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="sos" name="Button SOS" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="voice" name="Voice SOS" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h2 className="mb-3 font-semibold">New registrations · last 7 days</h2>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={users7d}>
                  <defs>
                    <linearGradient id="uGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ec4899" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#ec4899" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#8884" vertical={false} />
                  <XAxis dataKey="day" fontSize={12} tickLine={false} />
                  <YAxis allowDecimals={false} fontSize={12} tickLine={false} width={26} />
                  <Tooltip />
                  <Area type="monotone" dataKey="users" name="New users" stroke="#ec4899" fill="url(#uGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h2 className="mb-3 font-semibold">Alert types this week</h2>
              {typeSplit.every((t) => t.value === 0) ? (
                <p className="py-16 text-center text-sm text-gray-400">No alerts in the last 7 days.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={typeSplit} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                      {typeSplit.map((entry, i) => (
                        <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <h2 className="mb-3 font-semibold">Latest alerts (all users)</h2>
              <ul className="divide-y divide-gray-100 text-sm dark:divide-gray-800">
                {recentAlerts.slice(0, 6).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{a.userName || 'Unknown'}</p>
                      <p className="text-xs text-gray-400">{formatDateTime(a.startedAt)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(a.status)}`}>
                      {a.status}
                    </span>
                  </li>
                ))}
                {recentAlerts.length === 0 && (
                  <li className="py-8 text-center text-sm text-gray-400">No alerts recorded yet.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Alerts ---------------- */}
      {tab === 'alerts' && (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-400 dark:border-gray-700">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {recentAlerts.map((a) => (
                <tr key={a.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.userName || 'Unknown'}</p>
                    <p className="text-xs text-gray-400">{a.userPhone || a.userEmail || ''}</p>
                  </td>
                  <td className="px-4 py-3">{a.type === 'voice' ? 'Voice' : 'Button'}</td>
                  <td className="px-4 py-3 text-xs">{formatDateTime(a.startedAt)}</td>
                  <td className="px-4 py-3 text-xs">
                    {a.location ? (
                      <a href={a.mapsLink || `https://www.google.com/maps?q=${a.location.lat},${a.location.lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-600 hover:underline dark:text-primary-400">
                        {coordText(a.location.lat, a.location.lng)} <ExternalLink size={11} />
                      </a>
                    ) : (
                      <span className="text-amber-500">unavailable</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(a.status)}`}>{a.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {a.status === 'active' ? (
                      <button onClick={() => resolveAlert(a)} className="btn-primary px-2.5 py-1 text-xs">
                        <CheckCircle2 size={12} /> Resolve
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {recentAlerts.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-10 text-center text-sm text-gray-400">
                    No alerts recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------------- Users ---------------- */}
      {tab === 'users' && (
        <div className="space-y-3">
          <div className="relative max-w-sm">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-9" placeholder="Search users by name, email or phone…" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
          </div>
          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-400 dark:border-gray-700">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Registered</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                    <td className="px-4 py-3 font-medium">{u.name || '—'}</td>
                    <td className="px-4 py-3 text-xs">{u.email || '—'}</td>
                    <td className="px-4 py-3 text-xs">{u.phone || '—'}</td>
                    <td className="px-4 py-3 text-xs">{formatDateTime(u.createdAt)}</td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-4 py-10 text-center text-sm text-gray-400">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------- Incidents ---------------- */}
      {tab === 'incidents' && (
        <div className="space-y-3">
          {incidents.length === 0 ? (
            <div className="card py-12 text-center">
              <MessageSquareWarning size={34} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-400">No incident reports yet.</p>
            </div>
          ) : (
            incidents.map((inc) => (
              <div key={inc.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-2 font-semibold">
                      {inc.type || 'Incident'}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(inc.status)}`}>
                        {inc.status || 'reported'}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {formatDateTime(inc.createdAt)} · {inc.userName || 'Anonymous user'}
                    </p>
                  </div>
                  <select
                    className="input-field w-auto py-1.5 text-xs"
                    value={inc.status || 'reported'}
                    onChange={(e) => updateIncidentStatus(inc, e.target.value)}
                  >
                    <option value="reported">reported</option>
                    <option value="investigating">investigating</option>
                    <option value="resolved">resolved</option>
                    <option value="dismissed">dismissed</option>
                  </select>
                </div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{truncate(inc.description, 300)}</p>
                {inc.location && (
                  <a href={inc.mapsLink || `https://www.google.com/maps?q=${inc.location.lat},${inc.location.lng}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400">
                    <MapPin size={12} /> {coordText(inc.location.lat, inc.location.lng)}
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
