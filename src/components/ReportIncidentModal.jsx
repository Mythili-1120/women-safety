import { useState } from 'react';
import { MessageSquareWarning, X, Loader2, MapPin, LoaderCircle } from 'lucide-react';
import {
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { INCIDENT_TYPES } from '../utils/constants';
import { mapsLink, coordText, geoErrorMessage } from '../utils/helpers';
import toast from '../utils/toast';

/** Report a non-emergency safety incident (harassment, unsafe area, …). */
export default function ReportIncidentModal({ onClose }) {
  const { currentUser, userProfile } = useAuth();
  const geo = useGeolocation();
  const [type, setType] = useState(INCIDENT_TYPES[0]);
  const [description, setDescription] = useState('');
  const [withLocation, setWithLocation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  async function handleLocationToggle(e) {
    const want = e.target.checked;
    setWithLocation(want);
    if (want && !geo.position) {
      setLocating(true);
      try {
        await geo.getPosition();
      } catch (err) {
        toast.error(geoErrorMessage(err));
        setWithLocation(false);
      } finally {
        setLocating(false);
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (description.trim().length < 10) {
      toast.error('Please describe the incident in at least 10 characters.');
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'reported_incidents'), {
        userId: currentUser.uid,
        userName: userProfile?.name || currentUser.displayName || 'Anonymous',
        type,
        description: description.trim().slice(0, 1000),
        location: geo.position
          ? { lat: geo.position.lat, lng: geo.position.lng, accuracy: geo.position.accuracy }
          : null,
        mapsLink: geo.position ? mapsLink(geo.position.lat, geo.position.lng) : null,
        status: 'reported',
        createdAt: serverTimestamp(),
      });
      toast.success('Incident reported. Admins can now review it.');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Could not submit the report. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <form onSubmit={handleSubmit} className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-gray-900 sm:rounded-2xl" noValidate>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <MessageSquareWarning size={19} className="text-primary-600 dark:text-primary-400" />
              Report an incident
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Non-emergency reports are reviewed by admins.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="i-type">Incident type</label>
            <select id="i-type" className="input-field" value={type} onChange={(e) => setType(e.target.value)}>
              {INCIDENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="i-desc">What happened?</label>
            <textarea
              id="i-desc"
              className="input-field min-h-[110px] resize-y"
              placeholder="Describe the incident: when, where, what happened…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
            />
            <p className="mt-1 text-right text-xs text-gray-400">{description.length}/1000</p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={withLocation} onChange={handleLocationToggle} disabled={locating} />
            <span className="flex items-center gap-1.5 text-sm">
              <MapPin size={14} />
              {locating ? (
                <>Getting your location… <Loader2 size={13} className="animate-spin" /></>
              ) : withLocation && geo.position ? (
                <>Attach position: <b className="font-mono text-xs">{coordText(geo.position.lat, geo.position.lng)}</b></>
              ) : (
                'Attach my current location'
              )}
            </span>
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving || locating}>
            {saving ? <LoaderCircle size={15} className="animate-spin" /> : null}
            {saving ? 'Submitting…' : 'Submit report'}
          </button>
        </div>
      </form>
    </div>
  );
}
