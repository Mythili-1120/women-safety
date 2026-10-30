import { useEffect, useRef, useState } from 'react';

/**
 * Minimal, dependency-free Google Maps JS API loader + map component.
 * The API key comes from VITE_GOOGLE_MAPS_API_KEY. Without a key the
 * component renders an honest fallback (no fake map) with a working
 * external Google Maps link supplied by the parent via `fallbackLink`.
 */

let loadPromise = null;

export function loadGoogleMaps(apiKey) {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const cbName = '__wsaMapsReady';
    window[cbName] = () => resolve(window.google.maps);
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&loading=async&callback=${cbName}`;
    s.async = true;
    s.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load the Google Maps script.'));
    };
    document.head.appendChild(s);
    setTimeout(() => {
      if (!window.google?.maps) {
        loadPromise = null;
        reject(new Error('Google Maps did not load in time.'));
      }
    }, 15000);
  });
  return loadPromise;
}

export default function GoogleMap({
  apiKey,
  center,
  zoom = 15,
  markers = [], // [{lat,lng,label,color}]
  accuracyCircle = null, // {lat,lng,radius}
  fallbackLink,
  className = 'h-72 w-full',
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const circleRef = useRef(null);
  const [error, setError] = useState(
    !apiKey ? 'missing-key' : null
  );
  const [loading, setLoading] = useState(Boolean(apiKey));

  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    loadGoogleMaps(apiKey)
      .then((maps) => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new maps.Map(containerRef.current, {
          center: center ? { lat: center.lat, lng: center.lng } : { lat: 20.5937, lng: 78.9629 },
          zoom,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
        });
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err);
          setError(err.message || 'Failed to load Google Maps.');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  // Sync markers
  useEffect(() => {
    const maps = window.google?.maps;
    const map = mapRef.current;
    if (!maps || !map) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = markers
      .filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng))
      .map((m) => {
        const marker = new maps.Marker({
          position: { lat: m.lat, lng: m.lng },
          map,
          title: m.label || '',
        });
        return marker;
      });
    if (markers.length > 1) {
      const bounds = new maps.LatLngBounds();
      markers.forEach((m) =>
        bounds.extend({ lat: m.lat, lng: m.lng })
      );
      map.fitBounds(bounds, 60);
    } else if (markers.length === 1) {
      map.setCenter({ lat: markers[0].lat, lng: markers[0].lng });
    }
  }, [markers]);

  // Sync accuracy circle
  useEffect(() => {
    const maps = window.google?.maps;
    const map = mapRef.current;
    if (!maps || !map) return;
    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }
    if (accuracyCircle && Number.isFinite(accuracyCircle.radius)) {
      circleRef.current = new maps.Circle({
        map,
        center: { lat: accuracyCircle.lat, lng: accuracyCircle.lng },
        radius: accuracyCircle.radius,
        fillColor: '#ec4899',
        fillOpacity: 0.15,
        strokeColor: '#ec4899',
        strokeOpacity: 0.6,
        strokeWeight: 1,
      });
    }
  }, [accuracyCircle]);

  // Recenter when center prop changes
  useEffect(() => {
    const map = mapRef.current;
    if (map && center) {
      map.setCenter({ lat: center.lat, lng: center.lng });
    }
  }, [center]);

  if (error || loading) {
    return (
      <div
        className={`${className} flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center dark:border-gray-700 dark:bg-gray-900`}
      >
        {loading ? (
          <>
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            <p className="mt-2 text-xs text-gray-500">Loading map…</p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {error === 'missing-key'
                ? 'Interactive map requires a Google Maps API key'
                : 'Map could not be loaded'}
            </p>
            <p className="mt-1 max-w-xs text-xs text-gray-500 dark:text-gray-400">
              {error === 'missing-key'
                ? 'Add VITE_GOOGLE_MAPS_API_KEY to your .env file. All location features still work.'
                : 'Check your internet connection or API key restrictions.'}
            </p>
            {fallbackLink && (
              <a
                href={fallbackLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary mt-3 text-xs"
              >
                Open in Google Maps
              </a>
            )}
          </>
        )}
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
}
