import { useCallback, useEffect, useState } from 'react';
import {
  MapPin,
  Building2,
  Shield,
  Hospital,
  Loader2,
  Navigation,
  RefreshCw,
  Crosshair,
} from 'lucide-react';
import { useGeolocation } from '../hooks/useGeolocation';
import GoogleMap from '../components/GoogleMap';
import toast from '../utils/toast';
import { mapsLink, distanceKm, geoErrorMessage } from '../utils/helpers';

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const CATEGORIES = [
  { id: 'police', label: 'Police Stations', icon: Shield, mapQuery: 'police stations near me', type: 'police' },
  { id: 'hospital', label: 'Hospitals', icon: Hospital, mapQuery: 'hospitals near me', type: 'hospital' },
  { id: 'help', label: 'Help Centers', icon: Building2, mapQuery: 'women help center near me', type: null },
];

/**
 * Nearby Help Centers.
 * With a Google Maps key it performs a real Places nearby search around the
 * device GPS position. Without a key it still gives one-tap access to real
 * Google Maps searches (never fake results).
 */
export default function NearbyHelp() {
  const geo = useGeolocation();
  const [category, setCategory] = useState('police');
  const [places, setPlaces] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const requestFix = useCallback(async () => {
    try {
      await geo.getPosition();
    } catch (err) {
      toast.error(geoErrorMessage(err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo]);

  useEffect(() => {
    requestFix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchPlaces = useCallback(
    async (catId) => {
      const cat = CATEGORIES.find((c) => c.id === catId);
      setPlaces([]);
      setSearchError(null);
      if (!geo.position) {
        setSearchError('Get your GPS position first (tap "Locate me").');
        return;
      }
      if (!MAPS_KEY || !window.google?.maps) {
        setSearchError(
          'Interactive nearby search needs a Google Maps API key (VITE_GOOGLE_MAPS_API_KEY). Use the "Search on Google Maps" buttons below - they open real results for your area.'
        );
        return;
      }
      setSearching(true);
      try {
        const { PlacesService } = window.google.maps.places;
        const service = new PlacesService(
          new window.google.maps.Map(document.createElement('div'))
        );
        const req = {
          location: { lat: geo.position.lat, lng: geo.position.lng },
          radius: 3000,
        };
        if (cat.type) {
          req.type = cat.type; // 'police' | 'hospital' - real Places types
        } else {
          req.keyword = 'women help center';
        }
        service.nearbySearch(req, (results, status) => {
          setSearching(false);
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results?.length) {
            setPlaces(
              results.slice(0, 12).map((r) => ({
                id: r.place_id,
                name: r.name,
                address: r.vicinity || '',
                lat: r.geometry.location.lat(),
                lng: r.geometry.location.lng(),
                openNow: r.opening_hours?.openNow ?? null,
                rating: r.rating || null,
              }))
            );
          } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            setSearchError('No places of this type found within 3 km of you.');
          } else if (status === window.google.maps.places.PlacesServiceStatus.REQUEST_DENIED) {
            setSearchError(
              'Places search was denied by Google (check that "Places API" is enabled for your key). Use the Google Maps buttons below instead.'
            );
          } else {
            setSearchError(`Places search failed (${status}). Try the Google Maps buttons below.`);
          }
        });
      } catch (err) {
        console.error(err);
        setSearching(false);
        setSearchError('Could not run the nearby search. Use the Google Maps buttons below.');
      }
    },
    [geo.position]
  );

  useEffect(() => {
    searchPlaces(category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const cat = CATEGORIES.find((c) => c.id === category);
  const CatIcon = cat.icon;

  const markers = places.length
    ? places.map((p) => ({ lat: p.lat, lng: p.lng, label: p.name, color: '#2563eb' }))
    : geo.position
      ? [{ lat: geo.position.lat, lng: geo.position.lng, label: 'You are here', color: '#ec4899' }]
      : [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Nearby Help Centers</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Police stations, hospitals and help centers around your current position.
        </p>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                category === c.id
                  ? 'bg-primary-600 text-white shadow'
                  : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700'
              }`}
            >
              <Icon size={15} /> {c.label}
            </button>
          );
        })}
        <button
          onClick={requestFix}
          className="btn-secondary ml-auto flex items-center gap-1.5 px-3 py-2 text-xs"
          disabled={geo.loading}
        >
          {geo.loading ? <Loader2 size={13} className="animate-spin" /> : <Crosshair size={13} />}
          Locate me
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* List */}
        <div className="lg:col-span-1">
          {!geo.position && !geo.error && (
            <div className="card flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={15} className="animate-spin" /> Getting your position…
            </div>
          )}
          {geo.error && (
            <div className="card border-red-200 bg-red-50 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
              {geoErrorMessage(geo.error)}
            </div>
          )}
          {searchError && (
            <div className="card text-xs leading-relaxed text-amber-700 dark:text-amber-300">
              {searchError}
            </div>
          )}
          {searching && (
            <div className="card flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={15} className="animate-spin" /> Searching nearby…
            </div>
          )}
          {places.map((p) => (
            <div key={p.id} className="card mb-3">
              <p className="font-semibold">{p.name}</p>
              <p className="mt-0.5 flex items-start gap-1 text-xs text-gray-500 dark:text-gray-400">
                <MapPin size={12} className="mt-0.5 shrink-0" /> {p.address}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {geo.position && `≈ ${distanceKm(geo.position.lat, geo.position.lng, p.lat, p.lng)} km away`}
                {p.openNow !== null && (p.openNow ? ' · Open now' : ' · Closed')}
                {p.rating && ` · ★ ${p.rating}`}
              </p>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&destination_place_id=${p.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary mt-2 w-full py-1.5 text-xs"
              >
                <Navigation size={12} /> Get directions
              </a>
            </div>
          ))}

          {/* Always-available real Google Maps searches */}
          <div className="card">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Direct Google Maps search
            </p>
            {CATEGORIES.map((c) => (
              <a
                key={c.id}
                href={`https://www.google.com/maps/search/${encodeURIComponent(c.mapQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary mb-2 w-full py-1.5 text-xs"
              >
                {c.label} on Google Maps
              </a>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="lg:col-span-2">
          <GoogleMap
            apiKey={MAPS_KEY}
            center={geo.position ? { lat: geo.position.lat, lng: geo.position.lng } : null}
            zoom={14}
            markers={
              geo.position
                ? [
                    { lat: geo.position.lat, lng: geo.position.lng, label: 'You', color: '#ec4899' },
                    ...markers,
                  ]
                : []
            }
            fallbackLink={`https://www.google.com/maps/search/${encodeURIComponent(cat.mapQuery)}`}
            className="h-80 w-full rounded-xl lg:h-[415px]"
          />
          <button
            onClick={() => searchPlaces(category)}
            className="btn-secondary mt-2 text-xs"
            disabled={searching}
          >
            <RefreshCw size={12} /> Re-run search
          </button>
        </div>
      </div>
    </div>
  );
}
