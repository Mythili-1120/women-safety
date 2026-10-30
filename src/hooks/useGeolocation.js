import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Browser Geolocation API wrapper.
 *
 * - Always uses the real device GPS via getCurrentPosition / watchPosition.
 * - Hardcoded or random coordinates are never produced: if the browser
 *   cannot provide a position the hook reports an error instead.
 * - maximumAge: 0 guarantees the position shown is a fresh fix, never a
 *   cached/old one presented as current.
 */

const OPTIONS = {
  enableHighAccuracy: true, // use GPS, not coarse network location
  timeout: 20000, // ms before POSITION/TIMEOUT error
  maximumAge: 0, // never return a cached position
};

export function useGeolocation() {
  const [position, setPosition] = useState(null); // {lat,lng,accuracy,timestamp}
  const [error, setError] = useState(null); // GeolocationPositionError-like
  const [loading, setLoading] = useState(false);
  const watchIdRef = useRef(null);

  const clearError = useCallback(() => setError(null), []);

  /** One-shot high-accuracy fix. Returns the position or throws. */
  const getPosition = useCallback(
    () =>
      new Promise((resolve, reject) => {
        if (!('geolocation' in navigator)) {
          const err = { code: 0, message: 'Geolocation is not supported by this browser.' };
          setError(err);
          return reject(err);
        }
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const p = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
              timestamp: pos.timestamp,
            };
            setPosition(p);
            setError(null);
            setLoading(false);
            resolve(p);
          },
          (err) => {
            setError({ code: err.code, message: err.message });
            setLoading(false);
            reject(err);
          },
          OPTIONS
        );
      }),
    []
  );

  /** Continuous updates while an emergency is active. */
  const startWatching = useCallback(
    (onUpdate) => {
      if (!('geolocation' in navigator)) {
        setError({ code: 0, message: 'Geolocation is not supported by this browser.' });
        return null;
      }
      if (watchIdRef.current !== null) return watchIdRef.current; // already watching
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const p = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          };
          setPosition(p);
          setError(null);
          onUpdate && onUpdate(p);
        },
        (err) => {
          setError({ code: err.code, message: err.message });
        },
        OPTIONS
      );
      return watchIdRef.current;
    },
    []
  );

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  /** Current permission state ('granted' | 'denied' | 'prompt' | 'unsupported'). */
  const getPermissionState = useCallback(async () => {
    try {
      if (!navigator.permissions) return 'unsupported';
      const st = await navigator.permissions.query({ name: 'geolocation' });
      return st.state; // 'granted' | 'denied' | 'prompt'
    } catch {
      return 'unsupported';
    }
  }, []);

  useEffect(() => stopWatching, [stopWatching]);

  return {
    position,
    error,
    loading,
    getPosition,
    startWatching,
    stopWatching,
    getPermissionState,
    clearError,
  };
}
