import { useEffect, useState } from 'react';
import {
  Search,
  History as HistoryIcon,
  Loader2,
  MapPin,
  ExternalLink,
  X,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { formatDateTime, statusBadgeClass, coordText, truncate } from '../utils/helpers';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'sos', label: 'Button SOS' },
  { id: 'voice', label: 'Voice SOS' },
];

export default function AlertHistory() {
  const { currentUser } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  async function loadAlerts() {
    if (!currentUser || !db) return;
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, 'emergency_alerts'),
        where('userId', '==', currentUser.uid),
        orderBy('startedAt', 'desc')
      );
      const snap = await getDocs(q);
      setAlerts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Failed to load alert history:', err);
      setError(
        err.code === 'failed-precondition'
          ? 'This query needs a Firestore index. Deploy firestore.indexes.json or create the index (userId + startedAt).'
          : 'Could not load your alert history. Check your internet connection.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  async function cancelAlert(a) {
    setCancelling(true);
    try {
      await updateDoc(doc(db, 'emergency_alerts', a.id), {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
      });
      setSelected((s) => (s && s.id === a.id ? { ...s, status: 'cancelled' } : s));
      setAlerts((prev) => prev.map((x) => (x.id === a.id ? { ...x, status: 'cancelled' } : x)));
      toast.success('Alert marked as cancelled (false alarm).');
    } catch {
      toast.error('Could not update the alert. Try again.');
    } finally {
      setCancelling(false);
    }
  }

  const filtered = alerts.filter((a) => {
    if (filter === 'active' || filter === 'cancelled') return a.status === filter;
    if (filter === 'sos' || filter === 'voice') return a.type === filter;
    return true;
  }).filter((a) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (a.userName || '').toLowerCase().includes(s) ||
      (a.location?.lat && String(a.location.lat).includes(s)) ||
      (a.location?.lng && String(a.location.lng).includes(s)) ||
      (a.contactsNotified || []).some((c) => (c.name || '').toLowerCase().includes(s) || (c.phone || '').includes(s))
    );
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Alert History</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Every SOS alert you have triggered, with delivery details.
        </p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input-field pl-9"
            placeholder="Search by contact name, phone or coordinates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                filter === f.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={26} className="animate-spin text-primary-500" />
        </div>
      ) : error ? (
        <div className="card border-red-200 bg-red-50 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-12 text-center">
          <HistoryIcon size={36} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="font-medium">
            {alerts.length === 0 ? 'No alerts yet' : 'No alerts match your search'}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {alerts.length === 0
              ? 'That is good news! Triggered SOS alerts will appear here.'
              : 'Try a different filter or search term.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((a) => (
            <li key={a.id}>
              <button
                onClick={() => setSelected(a)}
                className="card flex w-full items-center justify-between gap-3 text-left transition hover:border-primary-300 dark:hover:border-primary-700"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      a.type === 'voice'
                        ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300'
                        : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'
                    }`}
                  >
                    {a.type === 'voice' ? <MessageSquare size={17} /> : <HistoryIcon size={17} />}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">
                      {a.type === 'voice' ? 'Voice-activated SOS' : 'Button SOS'}{' '}
                      <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(a.status)}`}>
                        {a.status}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {formatDateTime(a.startedAt)} · {a.location ? coordText(a.location.lat, a.location.lng) : 'location unavailable'}
                    </p>
                  </div>
                </div>
                <ChevronRight size={17} className="shrink-0 text-gray-400" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-gray-900 sm:rounded-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold">
                  {selected.type === 'voice' ? 'Voice-activated SOS' : 'Button SOS'} alert
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  {formatDateTime(selected.startedAt)}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={18} />
              </button>
            </div>

            <dl className="space-y-2 rounded-xl bg-gray-50 p-4 text-sm dark:bg-gray-800">
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Status</dt>
                <dd><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(selected.status)}`}>{selected.status}</span></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Location</dt>
                <dd className="text-right font-medium">
                  {selected.location ? (
                    <a href={selected.mapsLink || `https://www.google.com/maps?q=${selected.location.lat},${selected.location.lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-600 hover:underline dark:text-primary-400">
                      {coordText(selected.location.lat, selected.location.lng)} <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">Unavailable</span>
                  )}
                </dd>
              </div>
              {selected.location && (
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Accuracy</dt>
                  <dd>±{Math.round(selected.location.accuracy)} m</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Live sharing</dt>
                <dd>{selected.shareId ? 'Was active' : 'Not started'}</dd>
              </div>
              {selected.cancelledAt && (
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Cancelled at</dt>
                  <dd>{formatDateTime(selected.cancelledAt)}</dd>
                </div>
              )}
            </dl>

            {/* Contacts delivery */}
            <h3 className="mb-2 mt-4 text-sm font-semibold">Contact delivery status</h3>
            {(selected.contactsNotified || []).length === 0 ? (
              <p className="text-sm text-gray-500">No contacts were registered at the time of this alert.</p>
            ) : (
              <ul className="space-y-1.5">
                {selected.contactsNotified.map((c, i) => (
                  <li key={c.contactId || i} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">
                    <span>
                      <b>{c.name}</b> <span className="text-xs text-gray-400">{c.phone}</span>
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(c.status)}`}>
                      {c.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {selected.status === 'active' && (
              <button className="btn-danger mt-4 w-full" onClick={() => cancelAlert(selected)} disabled={cancelling}>
                {cancelling ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
                {cancelling ? 'Cancelling…' : 'Mark as cancelled (false alarm)'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
