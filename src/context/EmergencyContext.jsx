import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
  increment,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { useAlarm } from '../hooks/useAlarm';
import { mapsLink } from '../utils/helpers';

const EmergencyContext = createContext(null);

const STEP_DEFS = [
  { id: 'permission', label: 'Checking location permission' },
  { id: 'location', label: 'Getting your accurate GPS location' },
  { id: 'alarm', label: 'Activating the emergency alarm' },
  { id: 'notify', label: 'Sending SOS alert to trusted contacts' },
  { id: 'share', label: 'Starting live location sharing' },
  { id: 'save', label: 'Saving the emergency alert in the database' },
  { id: 'status', label: 'Confirming alert delivery status' },
];

const freshSteps = () => STEP_DEFS.map((s) => ({ ...s, status: 'pending', detail: '' }));

/** Reject with a clear error if a Firestore write does not confirm in time. */
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out - you may be offline`)),
        ms
      )
    ),
  ]);
}

export function EmergencyProvider({ children }) {
  const { currentUser, userProfile } = useAuth();
  const geo = useGeolocation();
  const alarm = useAlarm();

  const [phase, setPhase] = useState('idle'); // idle|confirming|running|permission_denied|location_failed|active|cancelling
  const [steps, setSteps] = useState(freshSteps);
  const [activeAlert, setActiveAlert] = useState(null);
  const [source, setSource] = useState('button'); // button|voice
  const skipPermissionGateRef = useRef(false); // user chose to continue without location

  // Refs mirrored for stable callbacks / duplicate-click protection
  const phaseRef = useRef('idle');
  const activatingRef = useRef(false);
  const shareIdRef = useRef(null);
  const alertIdRef = useRef(null);
  const lastLocUpdateRef = useRef(0);
  const watchCbRef = useRef(null);

  const setPhaseBoth = useCallback((p) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const updateStep = useCallback((id, status, detail = '') => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status, detail } : s))
    );
  }, []);

  // ------------------------------------------------------------------
  // Live location updates: throttled Firestore writes during an active
  // emergency (never more often than every 8 seconds).
  // ------------------------------------------------------------------
  watchCbRef.current = async (pos) => {
    const now = Date.now();
    if (now - lastLocUpdateRef.current < 8000) return;
    lastLocUpdateRef.current = now;
    const location = {
      lat: pos.lat,
      lng: pos.lng,
      accuracy: pos.accuracy,
      updatedAt: new Date().toISOString(),
    };
    setActiveAlert((prev) => (prev ? { ...prev, location } : prev));
    try {
      if (shareIdRef.current && db) {
        await updateDoc(doc(db, 'location_shares', shareIdRef.current), {
          currentLocation: location,
          updateCount: increment(1),
          updatedAt: serverTimestamp(),
        });
      }
      if (alertIdRef.current && db) {
        await updateDoc(doc(db, 'emergency_alerts', alertIdRef.current), {
          location,
          lastLocationUpdate: serverTimestamp(),
        });
      }
    } catch (err) {
      console.warn('Live location update failed (will retry on next fix):', err);
    }
  };

  const startSharing = useCallback(
    (shareId) => {
      geo.startWatching((pos) => watchCbRef.current && watchCbRef.current(pos));
      shareIdRef.current = shareId;
    },
    [geo]
  );

  // ------------------------------------------------------------------
  // Restore an alert that is still active (e.g. page reloaded)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!currentUser || !db) return;
    let cancelled = false;
    (async () => {
      try {
        const q = query(
          collection(db, 'emergency_alerts'),
          where('userId', '==', currentUser.uid),
          where('status', '==', 'active'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (cancelled || snap.empty) return;
        const d = snap.docs[0];
        alertIdRef.current = d.id;
        setActiveAlert({
          alertId: d.id,
          contacts: d.data().contactsNotified || [],
          location: d.data().location || null,
          locationAvailable: Boolean(d.data().locationAvailable),
          mapsLink: d.data().mapsLink || null,
          shareId: d.data().shareId || null,
          alarmPlaying: false,
          dbSaved: true,
          startedAt: new Date(),
          type: d.data().type || 'sos',
          restored: true,
        });
        setPhaseBoth('active');
        if (d.data().shareId) {
          startSharing(d.data().shareId);
        }
      } catch (err) {
        console.warn('Could not check for an active emergency:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // ------------------------------------------------------------------
  // Step 1-7 execution
  // ------------------------------------------------------------------
  const runActivation = useCallback(async () => {
    if (activatingRef.current) return; // duplicate-click protection
    activatingRef.current = true;
    setSteps(freshSteps());
    setPhaseBoth('running');

    const result = {
      location: null,
      locationAvailable: false,
      alarmPlaying: false,
      contacts: [],
      alertId: null,
      shareId: null,
      dbSaved: false,
      warnings: [],
    };

    try {
      // ---- Step 1: check location permission -----------------------
      updateStep('permission', 'running');
      const perm = await geo.getPermissionState();
      if (perm === 'denied' && !skipPermissionGateRef.current) {
        updateStep(
          'permission',
          'warning',
          'Location permission is denied. You can retry, or continue with a clearly marked location-unavailable alert.'
        );
        result.warnings.push('location-permission');
        setPhaseBoth('permission_denied');
        activatingRef.current = false;
        return; // modal shows the denied screen with Retry / Continue
      }
      if (perm === 'denied' && skipPermissionGateRef.current) {
        updateStep(
          'permission',
          'warning',
          'Continued without location permission - the alert will be clearly marked "location unavailable".'
        );
        result.warnings.push('location-permission');
      } else {
        updateStep('permission', 'done', `Permission: ${perm}`);
      }

      // ---- Step 2: get the latest accurate GPS location ------------
      updateStep('location', 'running');
      try {
        const pos = await geo.getPosition();
        result.location = pos;
        result.locationAvailable = true;
        updateStep(
          'location',
          'done',
          `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)} (±${Math.round(pos.accuracy)}m)`
        );
      } catch (geoErr) {
        updateStep(
          'location',
          'warning',
          'Could not get a fresh GPS fix. The alert will be sent with "location unavailable" clearly marked.'
        );
        result.warnings.push('location-fix');
        // continue with a clearly marked location-unavailable alert
      }

      // ---- Step 3: activate the emergency alarm --------------------
      updateStep('alarm', 'running');
      const duration = userProfile?.alarmDurationSec ?? 0;
      const alarmOk = await alarm.start(duration); // user gesture already given
      if (alarmOk) {
        result.alarmPlaying = true;
        updateStep(
          'alarm',
          'done',
          duration > 0 ? `Sounding for ${duration}s` : 'Sounding until stopped'
        );
      } else {
        result.warnings.push('alarm');
        updateStep('alarm', 'warning', alarm.error || 'Alarm sound could not start.');
      }

      // ---- Step 4: send SOS alert to trusted contacts --------------
      updateStep('notify', 'running');
      let contacts = [];
      try {
        const cq = query(
          collection(db, 'emergency_contacts'),
          where('userId', '==', currentUser.uid)
        );
        const snap = await getDocs(cq);
        contacts = snap.docs.map((d) => ({
          contactId: d.id,
          ...d.data(),
          status: 'Pending',
        }));
      } catch (err) {
        updateStep(
          'notify',
          'warning',
          'Could not load your emergency contacts (network error). The alert will still be recorded.'
        );
        result.warnings.push('contacts-load');
      }
      if (contacts.length === 0 && !result.warnings.includes('contacts-load')) {
        updateStep(
          'notify',
          'warning',
          'You have no trusted contacts saved. Add contacts so they can receive your alerts.'
        );
        result.warnings.push('no-contacts');
      }
      result.contacts = contacts;

      // ---- Step 5: start live location sharing ---------------------
      updateStep('share', 'running');
      try {
        const shareRef = await withTimeout(
          addDoc(collection(db, 'location_shares'), {
            userId: currentUser.uid,
            userName: userProfile?.name || currentUser.displayName || 'User',
            userPhone: userProfile?.phone || '',
            active: true,
            currentLocation: result.location
              ? {
                  lat: result.location.lat,
                  lng: result.location.lng,
                  accuracy: result.location.accuracy,
                  updatedAt: new Date().toISOString(),
                }
              : null,
            updateCount: result.location ? 1 : 0,
            startedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }),
          10000,
          'Starting location sharing'
        );
        result.shareId = shareRef.id;
        shareIdRef.current = shareRef.id;
        updateStep('share', 'done', 'Live location sharing is active');
        if (result.location) {
          geo.startWatching(
            (pos) => watchCbRef.current && watchCbRef.current(pos)
          );
          lastLocUpdateRef.current = Date.now();
        }
      } catch (err) {
        result.warnings.push('share');
        updateStep(
          'share',
          'warning',
          `${err.message}. Live sharing could not start - check your internet connection.`
        );
      }

      // ---- Step 6: save the emergency alert in the database --------
      updateStep('save', 'running');
      try {
        const link = result.location
          ? mapsLink(result.location.lat, result.location.lng)
          : null;
        const alertRef = await withTimeout(
          addDoc(collection(db, 'emergency_alerts'), {
            userId: currentUser.uid,
            userName: userProfile?.name || currentUser.displayName || 'User',
            userEmail: currentUser.email || '',
            userPhone: userProfile?.phone || '',
            type: source === 'voice' ? 'voice' : 'sos',
            status: 'active',
            contactsNotified: contacts.map((c) => ({
              contactId: c.contactId,
              name: c.name,
              phone: c.phone,
              relation: c.relation || '',
              status: 'Pending',
            })),
            location: result.location
              ? {
                  lat: result.location.lat,
                  lng: result.location.lng,
                  accuracy: result.location.accuracy,
                }
              : null,
            locationAvailable: result.locationAvailable,
            mapsLink: link,
            shareId: result.shareId || null,
            startedAt: serverTimestamp(),
            lastLocationUpdate: result.location ? serverTimestamp() : null,
          }),
          10000,
          'Saving the alert'
        );
        result.alertId = alertRef.id;
        alertIdRef.current = alertRef.id;
        result.dbSaved = true;

        // Firestore confirmed the write -> in-app/dashboard delivery is real
        await withTimeout(
          updateDoc(doc(db, 'emergency_alerts', alertRef.id), {
            contactsNotified: contacts.map((c) => ({
              ...c,
              status: 'Sent',
            })),
          }),
          10000,
          'Confirming contact delivery'
        );
        result.contacts = result.contacts.map((c) => ({ ...c, status: 'Sent' }));
        updateStep(
          'save',
          'done',
          `Alert record confirmed (ID ${alertRef.id.slice(0, 8)}…)`
        );
      } catch (err) {
        result.warnings.push('db');
        updateStep(
          'save',
          'warning',
          `${err.message}. The alert will sync to the database automatically once you are back online; its status stays "Pending" until confirmed.`
        );
      }

      // ---- Step 7: show alert delivery status ----------------------
      updateStep('status', 'running');
      const sentCount = result.contacts.filter((c) => c.status === 'Sent').length;
      updateStep(
        'status',
        'done',
        result.contacts.length === 0
          ? 'No contacts registered - add trusted contacts in the app'
          : `${sentCount}/${result.contacts.length} contacts confirmed via in-app alert`
      );

      setActiveAlert({
        alertId: result.alertId,
        contacts: result.contacts,
        location: result.location
          ? {
              lat: result.location.lat,
              lng: result.location.lng,
              accuracy: result.location.accuracy,
              updatedAt: new Date().toISOString(),
            }
          : null,
        locationAvailable: result.locationAvailable,
        mapsLink: result.location
          ? mapsLink(result.location.lat, result.location.lng)
          : null,
        shareId: result.shareId,
        alarmPlaying: result.alarmPlaying,
        dbSaved: result.dbSaved,
        startedAt: new Date(),
        type: source,
        warnings: result.warnings,
      });
      setPhaseBoth('active');
    } finally {
      activatingRef.current = false;
    }
  }, [currentUser, userProfile, geo, alarm, source, setPhaseBoth, updateStep]);

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  /** Open the "Emergency Protection" confirmation popup. */
  const requestSOS = useCallback(
    (src = 'button') => {
      if (phaseRef.current !== 'idle') return false; // duplicate prevention
      setSource(src);
      setSteps(freshSteps());
      setPhaseBoth('confirming');
      return true;
    },
    [setPhaseBoth]
  );

  /** CANCEL button in the popup - nothing has been sent yet. */
  const cancelConfirmation = useCallback(() => {
    if (phaseRef.current === 'confirming') setPhaseBoth('idle');
  }, [setPhaseBoth]);

  /** ACTIVATE SOS button in the popup - runs the 7-step sequence. */
  const activateSOS = useCallback(() => {
    if (phaseRef.current !== 'confirming' && phaseRef.current !== 'running')
      return;
    runActivation();
  }, [runActivation]);

  /** Retry after permission/location failure. */
  const retryActivation = useCallback(() => {
    runActivation();
  }, [runActivation]);

  /** Continue with a clearly marked location-unavailable alert. */
  const continueWithoutLocation = useCallback(() => {
    skipPermissionGateRef.current = true;
    runActivation();
  }, [runActivation]);

  /** Cancel a false alarm. */
  const cancelEmergency = useCallback(async () => {
    if (phaseRef.current !== 'active') return;
    setPhaseBoth('cancelling');
    try {
      alarm.stop();
      geo.stopWatching();
      if (alertIdRef.current && db) {
        await updateDoc(doc(db, 'emergency_alerts', alertIdRef.current), {
          status: 'cancelled',
          cancelledAt: serverTimestamp(),
        }).catch(() => {});
      }
      if (shareIdRef.current && db) {
        await updateDoc(doc(db, 'location_shares', shareIdRef.current), {
          active: false,
          endedAt: serverTimestamp(),
        }).catch(() => {});
      }
    } finally {
      alertIdRef.current = null;
      shareIdRef.current = null;
      setActiveAlert(null);
      setSteps(freshSteps());
      setPhaseBoth('idle');
    }
  }, [alarm, geo, setPhaseBoth]);

  /** Stop only the alarm sound (emergency stays active). */
  const stopAlarmSound = useCallback(() => {
    alarm.stop();
    setActiveAlert((prev) => (prev ? { ...prev, alarmPlaying: false } : prev));
  }, [alarm]);

  /** Test the alarm for a few seconds (safe mode). */
  const testAlarm = useCallback(
    async (seconds = 5) => {
      return alarm.start(seconds);
    },
    [alarm]
  );

  return (
    <EmergencyContext.Provider
      value={{
        phase,
        steps,
        activeAlert,
        source,
        geoError: geo.error,
        geoLoading: geo.loading,
        alarmError: alarm.error,
        alarmPlaying: alarm.isPlaying,
        requestSOS,
        cancelConfirmation,
        activateSOS,
        retryActivation,
        continueWithoutLocation,
        cancelEmergency,
        stopAlarmSound,
        testAlarm,
        unlockAlarm: alarm.unlock,
      }}
    >
      {children}
    </EmergencyContext.Provider>
  );
}

export function useEmergency() {
  const ctx = useContext(EmergencyContext);
  if (!ctx) throw new Error('useEmergency must be used inside EmergencyProvider');
  return ctx;
}
