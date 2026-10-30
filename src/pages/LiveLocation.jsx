import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MapPin,
  Navigation,
  Play,
  Square,
  Loader2,
  ExternalLink,
  ShieldAlert,
  Info,
} from 'lucide-react';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useGeolocation } from '../hooks/useGeolocation';
import GoogleMap from '../components/GoogleMap';
import toast from '../utils/toast';
import { coordText, mapsLink, geoErrorMessage, formatTime } from '../utils/helpers';

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

/**
 * Live Location page.
 * - Shows the real device GPS position (lat/lng/accuracy) on Google Maps.
 * - One-tap "Start sharing" creates a location_shares session in Firestore
 *   that keeps updating while you move; "Stop" ends it.
 * - Handles permission denial / GPS errors with clear explanations and never
 *   shows a stale fix as current.
 */
export default function LiveLocation() {
  const { currentUser, userProfile } = useAuth();
  const geo = useGeolocation();
  const [sharing, setSharing] = useState(false);
  const [shareId, setShareId] = useState(null);
  const [shareStats, setShareStats] = useState({ count: 0, since: null });
  const lastWriteRef = useRef(0);
  const [starting, setStarting] = useState(false);

  const requestFix = useCallback(async () => {
    try {
      await geo.getPosition();
      toast.success('Fresh GPS position acquired.');
    } catch (err) {
      toast.error(geoErrorMessage(err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo]);

  async function startSharing() {
    setStarting(true);
    try {
      let pos = geo.position;
      if (!pos) {
        pos = await geo.getPosition(); // ensures a fresh fix before sharing
      }
      const initial = {
        lat: pos.lat,
        lng: pos.lng,
        accuracy: pos.accuracy,
        updatedAt: new Date().toISOString(),
      };
      const ref = await addDoc(collection(db, 'location_shares'), {
        userId: currentUser.uid,
        userName: userProfile?.name || currentUser.displayName || 'User',
        userPhone: userProfile?.phone || '',
        active: true,
        currentLocation: initial,
        updateCount: 1,
        startedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setShareId(ref.id);
      setShareStats({ count: 1, since: Date.now() });
      setSharing(true);
      geo.startWatching(async (p) => {
        const now = Date.now();
        if (now - lastWriteRef.current < 8000) return; // throttle Firestore writes
        lastWriteRef.current = now;
        try {
          await updateDoc(doc(db, 'location_shares', ref.id), {
            currentLocation: {
              lat: p.lat,
              lng: p.lng,
              accuracy: p.accuracy,
              updatedAt: new Date().toISOString(),
            },
            updateCount: increment(1),
            updatedAt: serverTimestamp(),
          });
          setShareStats((s) => ({ ...s, count: s.count + 1 }));
        } catch (err) {
          console.warn('Share update failed:', err);
        }
      });
      toast.success('Live location sharing started.');
    } catch (err) {
      toast.error(geoErrorMessage(err));
    } finally {
      setStarting(false);
    }
  }

  async function stopSharing() {
    geo.stopWatching();
    setSharing(false);
    if (shareId) {
      try {
        await updateDoc(doc(db, 'location_shares', shareId), {
          active: false,
          endedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Could not close the share session:', err);
      }
      setShareId(null);
      toast.info('Live location sharing stopped. Your position is no longer being recorded.');
    }
  }

  useEffect(() => () => geo.stopWatching(), [geo]);

  const pos = geo.position;
  const mapCenter = pos ? { lat: pos.lat, lng: pos.lng } : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Live Location</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Your real GPS position from this device - high accuracy, never cached.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Controls + data */}
        <div className="space-y-4 lg:col-span-1">
          <div className="card">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <MapPin size={17} className="text-primary-600 dark:text-primary-400" /> Current position
            </h2>
            {geo.loading ? (
              <p className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 size={15} className="animate-spin" /> Getting a fresh GPS fix…
              </p>
            ) : pos ? (
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500 dark:text-gray-400">Latitude</dt>
                  <dd className="font-mono font-semibold">{pos.lat.toFixed(6)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500 dark:text-gray-400">Longitude</dt>
                  <dd className="font-mono font-semibold">{pos.lng.toFixed(6)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500 dark:text-gray-400">Accuracy</dt>
                  <dd className="font-semibold">±{Math.round(pos.accuracy)} m</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500 dark:text-gray-400">Fix time</dt>
                  <dd className="font-semibold">{formatTime(pos.timestamp)}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No GPS fix yet. Tap the button below and allow location access.
              </p>
            )}

            {geo.error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-600 dark:bg-red-950/60 dark:text-red-300">
                {geoErrorMessage(geo.error)}
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2">
              <button className="btn-secondary" onClick={requestFix} disabled={geo.loading || sharing}>
                <Navigation size={15} /> Refresh GPS position
              </button>
              {!sharing ? (
                <button className="btn-primary" onClick={startSharing} disabled={starting}>
                  {starting ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                  {starting ? 'Starting…' : 'Start sharing location'}
                </button>
              ) : (
                <button className="btn-danger" onClick={stopSharing}>
                  <Square size={15} /> Stop sharing
                </button>
              )}
            </div>
          </div>

          {sharing && (
            <div className="card border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/40">
              <p className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                Sharing is live
              </p>
              <p className="mt-1 text-xs text-green-700/80 dark:text-green-400/80">
                {shareStats.count} location update{shareStats.count === 1 ? '' : 's'} written to your secure
                location_shares session. Updates every few seconds while you move.
              </p>
            </div>
          )}

          <div className="card">
            <p className="flex items-start gap-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              <Info size={14} className="mt-0.5 shrink-0" />
              Your coordinates are stored only in your own secure Firestore
              documents and are never shared with third parties. Sharing stops
              the moment you press Stop.
            </p>
          </div>
        </div>

        {/* Map */}
        <div className="lg:col-span-2">
          <GoogleMap
            apiKey={MAPS_KEY}
            center={mapCenter}
            zoom={16}
            markers={pos ? [{ lat: pos.lat, lng: pos.lng, label: 'You are here', color: '#ec4899' }] : []}
            accuracyCircle={pos ? { lat: pos.lat, lng: pos.lng, radius: pos.accuracy } : null}
            fallbackLink={pos ? mapsLink(pos.lat, pos.lng) : 'https://www.google.com/maps'}
            className="h-80 w-full rounded-xl lg:h-[415px]"
          />
          {pos && (
            <a
              href={mapsLink(pos.lat, pos.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
            >
              Open exact position in Google Maps <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      {/* Emergency note */}
      <div className="card flex items-start gap-3 border-primary-200 bg-primary-50 dark:border-primary-900 dark:bg-primary-950/30">
        <ShieldAlert size={18} className="mt-0.5 shrink-0 text-primary-600 dark:text-primary-400" />
        <p className="text-sm text-gray-700 dark:text-gray-200">
          During an <b>SOS emergency</b>, live location sharing starts
          automatically and keeps updating until you cancel the alert - you do
          not need to open this page.
        </p>
      </div>
    </div>
  );
}
