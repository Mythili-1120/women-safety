import { useState } from 'react';
import {
  User,
  Phone,
  Mic,
  Volume2,
  Save,
  Loader2,
  PhoneCall,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isValidPhone, normalizePhone } from '../utils/helpers';
import { ALARM_PRESETS, VOICE_DEFAULT_PHRASE } from '../utils/constants';
import toast from '../utils/toast';
import { useEmergency } from '../context/EmergencyContext';

export default function Profile() {
  const { currentUser, userProfile, updateUserProfile } = useAuth();
  const { testAlarm } = useEmergency();
  const [form, setForm] = useState({
    name: userProfile?.name || '',
    phone: userProfile?.phone || '',
    emergencyPhrase: userProfile?.emergencyPhrase || '',
    alarmDurationSec: userProfile?.alarmDurationSec ?? 0,
    fakeCallName: userProfile?.fakeCallName || 'Mom',
    fakeCallDelaySec: userProfile?.fakeCallDelaySec ?? 5,
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [phraseError, setPhraseError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSave(e) {
    e.preventDefault();
    // Validation
    if (form.name.trim().length < 2) return toast.error('Enter your full name.');
    if (!isValidPhone(form.phone)) return toast.error('Enter a valid phone number with country code.');
    const phrase = form.emergencyPhrase.trim().toLowerCase();
    if (phrase) {
      if (phrase.length < 3) {
        setPhraseError('The phrase needs at least 3 characters.');
        return;
      }
      if (phrase.split(/\s+/).length > 5) {
        setPhraseError('Keep the phrase under 5 words for reliable detection.');
        return;
      }
    }
    setPhraseError('');
    setSaving(true);
    try {
      await updateUserProfile({
        name: form.name.trim(),
        phone: normalizePhone(form.phone),
        emergencyPhrase: phrase || VOICE_DEFAULT_PHRASE,
        alarmDurationSec: Math.max(0, Math.min(300, Number(form.alarmDurationSec) || 0)),
        fakeCallName: form.fakeCallName.trim() || 'Mom',
        fakeCallDelaySec: Math.max(0, Math.min(120, Number(form.fakeCallDelaySec) || 0)),
      });
      toast.success('Profile updated.');
    } catch (err) {
      console.error(err);
      toast.error('Could not save your profile. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestAlarm() {
    setTesting(true);
    const ok = await testAlarm(5);
    if (!ok) toast.error('Alarm could not play - check volume / browser permissions.');
    setTimeout(() => setTesting(false), 5000);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Profile &amp; Settings</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Your account, safety phrase and alarm preferences.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Account */}
        <div className="card">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <User size={17} className="text-primary-600 dark:text-primary-400" /> Account
          </h2>
          <div className="space-y-3">
            <div>
              <label className="label" htmlFor="p-name">Full name</label>
              <input id="p-name" className="input-field" value={form.name} onChange={set('name')} />
            </div>
            <div>
              <label className="label" htmlFor="p-email">Email (login)</label>
              <input id="p-email" className="input-field opacity-70" value={currentUser?.email || ''} disabled />
              <p className="mt-1 text-xs text-gray-400">Email is your login and cannot be changed here.</p>
            </div>
            <div>
              <label className="label" htmlFor="p-phone">Phone number</label>
              <div className="relative">
                <Phone size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input id="p-phone" type="tel" className="input-field pl-9" value={form.phone} onChange={set('phone')} />
              </div>
            </div>
          </div>
        </div>

        {/* Voice phrase */}
        <div className="card">
          <h2 className="mb-2 flex items-center gap-2 font-semibold">
            <Mic size={17} className="text-primary-600 dark:text-primary-400" /> Voice safety phrase
          </h2>
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            Say this phrase to trigger SOS protection from the dashboard. Choose
            something natural you can say out loud (1-5 words), e.g.
            &quot;help me now&quot;.
          </p>
          <input
            className="input-field"
            placeholder={VOICE_DEFAULT_PHRASE}
            value={form.emergencyPhrase}
            onChange={(e) => {
              setForm((f) => ({ ...f, emergencyPhrase: e.target.value }));
              setPhraseError('');
            }}
          />
          {phraseError && <p className="mt-1 text-xs text-red-500">{phraseError}</p>}
          {form.emergencyPhrase.trim() && (
            <p className="mt-2 rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
              Active phrase: <b>“{form.emergencyPhrase.trim().toLowerCase()}”</b>
            </p>
          )}
        </div>

        {/* Alarm */}
        <div className="card">
          <h2 className="mb-2 flex items-center gap-2 font-semibold">
            <Volume2 size={17} className="text-primary-600 dark:text-primary-400" /> Emergency alarm
          </h2>
          <label className="label" htmlFor="p-alarm">Siren duration on SOS</label>
          <select
            id="p-alarm"
            className="input-field"
            value={form.alarmDurationSec}
            onChange={set('alarmDurationSec')}
          >
            <option value={0}>Until I stop it (recommended)</option>
            <option value={30}>30 seconds</option>
            <option value={60}>1 minute</option>
            <option value={120}>2 minutes</option>
            <option value={300}>5 minutes</option>
          </select>
          <button type="button" onClick={handleTestAlarm} className="btn-secondary mt-3" disabled={testing}>
            <Volume2 size={15} /> {testing ? 'Sounding…' : 'Test alarm (5s)'}
          </button>
        </div>

        {/* Fake call */}
        <div className="card">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <PhoneCall size={17} className="text-primary-600 dark:text-primary-400" /> Fake call defaults
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="p-fc-name">Caller name</label>
              <input id="p-fc-name" className="input-field" value={form.fakeCallName} onChange={set('fakeCallName')} />
            </div>
            <div>
              <label className="label" htmlFor="p-fc-delay">Ring delay (seconds)</label>
              <input id="p-fc-delay" type="number" min="0" max="120" className="input-field" value={form.fakeCallDelaySec} onChange={set('fakeCallDelaySec')} />
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={saving}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Saving…' : 'Save all changes'}
        </button>
      </form>

      <div className="card flex items-start gap-3 border-primary-200 bg-primary-50 dark:border-primary-900 dark:bg-primary-950/30">
        <ShieldAlert size={18} className="mt-0.5 shrink-0 text-primary-600 dark:text-primary-400" />
        <p className="text-sm text-gray-700 dark:text-gray-200">
          Your data is protected by Firestore security rules: only you (and
          authorized admins during an emergency response) can read your alerts
          and location.
        </p>
      </div>
    </div>
  );
}
