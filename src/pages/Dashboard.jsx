import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Siren,
  Mic,
  MicOff,
  Volume2,
  Phone,
  MapPin,
  PhoneCall,
  Building2,
  History,
  Settings,
  Lightbulb,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEmergency } from '../context/EmergencyContext';
import { useVoiceSOS } from '../hooks/useVoiceSOS';
import ReportIncidentModal from '../components/ReportIncidentModal';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from '../utils/toast';
import { VOICE_DEFAULT_PHRASE } from '../utils/constants';

export default function Dashboard() {
  const { currentUser, userProfile } = useAuth();
  const { requestSOS, phase, testAlarm } = useEmergency();
  const [contactCount, setContactCount] = useState(null);
  const [alarmTesting, setAlarmTesting] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // Load contact count for the readiness card
  useEffect(() => {
    if (!currentUser || !db) return;
    let cancelled = false;
    (async () => {
      try {
        const q = query(
          collection(db, 'emergency_contacts'),
          where('userId', '==', currentUser.uid)
        );
        const snap = await getDocs(q);
        if (!cancelled) setContactCount(snap.size);
      } catch {
        if (!cancelled) setContactCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const phrase = userProfile?.emergencyPhrase || VOICE_DEFAULT_PHRASE;

  const voice = useVoiceSOS({
    phrase,
    onPhraseDetected: () => {
      toast.warning(`Safety phrase "${phrase}" detected - please confirm the SOS activation.`);
      requestSOS('voice');
    },
  });

  async function handleTestAlarm() {
    setAlarmTesting(true);
    const ok = await testAlarm(5);
    if (!ok) {
      toast.error('The alarm could not play. Check device volume and tap the screen once, then try again.');
    } else {
      toast.success('Test alarm sounding for 5 seconds…');
      setTimeout(() => setAlarmTesting(false), 5000);
    }
  }

  const busy = phase !== 'idle';

  const quickActions = [
    { to: '/contacts', icon: Phone, label: 'Emergency Contacts', desc: 'Manage trusted people' },
    { to: '/live-location', icon: MapPin, label: 'Live Location', desc: 'See your GPS on the map' },
    { to: '/fake-call', icon: PhoneCall, label: 'Fake Call', desc: 'Escape awkward situations' },
    { to: '/nearby-help', icon: Building2, label: 'Nearby Help', desc: 'Police, hospitals, help centers' },
    { to: '/alert-history', icon: History, label: 'Alert History', desc: 'Review past alerts' },
    { to: '/profile', icon: Settings, label: 'Profile & Settings', desc: 'Phrase, alarm, account' },
  ];

  return (
    <div className="space-y-6">
      {showReport && <ReportIncidentModal onClose={() => setShowReport(false)} />}
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">
          Stay safe, {(userProfile?.name || currentUser?.displayName || 'there').split(' ')[0]} 👋
        </h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Your emergency protection dashboard.
        </p>
      </div>

      {/* Readiness warnings */}
      {(contactCount === 0 || !userProfile?.emergencyPhrase) && (
        <div className="card border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
          <p className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
            <AlertTriangle size={17} className="mt-0.5 shrink-0" />
            <span>
              {contactCount === 0 && (
                <>
                  You have no trusted contacts yet.{' '}
                  <Link to="/contacts" className="font-semibold underline">Add contacts</Link>{' '}
                  so your SOS alerts reach someone.{' '}
                </>
              )}
              {!userProfile?.emergencyPhrase && (
                <>
                  Set your <Link to="/profile" className="font-semibold underline">voice safety phrase</Link>{' '}
                  to enable hands-free activation.
                </>
              )}
            </span>
          </p>
        </div>
      )}

      {/* SOS + voice */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Big SOS button */}
        <div className="card flex flex-col items-center justify-center py-8 md:col-span-1">
          <button
            onClick={() => requestSOS('button')}
            disabled={busy}
            className="group relative flex h-40 w-40 items-center justify-center rounded-full bg-red-600 text-white shadow-xl transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-500/40 disabled:cursor-not-allowed disabled:opacity-60 sm:h-44 sm:w-44"
            aria-label="Activate SOS emergency alert"
          >
            {!busy && (
              <span className="absolute inset-0 animate-ping-slow rounded-full bg-red-600/40" />
            )}
            <span className="relative flex flex-col items-center">
              <Siren size={44} className={busy ? '' : 'group-hover:scale-110 transition-transform'} />
              <span className="mt-1.5 text-lg font-extrabold tracking-widest">SOS</span>
            </span>
          </button>
          <p className="mt-4 text-center text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            Press once and confirm. Your alarm sounds and trusted contacts get
            your live location.
          </p>
        </div>

        {/* Voice activation */}
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <Mic size={18} className="text-primary-600 dark:text-primary-400" /> Voice Activation
            </h2>
            {voice.listening && (
              <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-950 dark:text-red-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> Listening
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Say your safety phrase out loud to trigger SOS protection:
          </p>
          <p className="my-3 rounded-lg bg-primary-50 py-2.5 text-center text-base font-bold tracking-wide text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
            “{phrase}”
          </p>
          {voice.error && (
            <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/60 dark:text-red-300">
              {voice.error}
            </p>
          )}
          {voice.transcript && voice.listening && (
            <p className="mb-2 truncate text-xs italic text-gray-400">…{voice.transcript}</p>
          )}
          <div className="flex gap-2">
            {!voice.listening ? (
              <button
                className="btn-primary flex-1"
                onClick={() => {
                  const ok = voice.start();
                  if (ok) toast.info('Listening for your safety phrase…');
                }}
              >
                <Mic size={16} /> Start listening
              </button>
            ) : (
              <button className="btn-danger flex-1" onClick={voice.stop}>
                <MicOff size={16} /> Stop listening
              </button>
            )}
            <Link to="/profile" className="btn-secondary" title="Change phrase">
              <Settings size={16} />
            </Link>
          </div>
          {!voice.supported && (
            <p className="mt-2 text-xs text-gray-400">
              Voice recognition needs Chrome, Edge or Safari.
            </p>
          )}
        </div>

        {/* Alarm test */}
        <div className="card">
          <h2 className="mb-2 flex items-center gap-2 font-semibold">
            <Volume2 size={18} className="text-primary-600 dark:text-primary-400" /> Emergency Alarm
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            A loud continuous siren plays during every SOS activation. Test it
            now to check your device volume.
          </p>
          <button
            className="btn-secondary mt-4 w-full"
            onClick={handleTestAlarm}
            disabled={alarmTesting || busy}
          >
            <Volume2 size={16} />
            {alarmTesting ? 'Sounding… stops in 5s' : 'Test alarm (5 seconds)'}
          </button>
          <p className="mt-2 text-xs text-gray-400">
            Turn your volume up first. On mobile, silent-mode switches may mute
            web audio.
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Quick actions</h2>
          <button
            className="flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:underline dark:text-primary-400"
            onClick={() => setShowReport(true)}
          >
            <Lightbulb size={0} className="hidden" />
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Report an incident
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {quickActions.map(({ to, icon: Icon, label, desc }) => (
            <Link
              key={to}
              to={to}
              className="card flex items-start gap-3 transition hover:border-primary-300 hover:shadow-md dark:hover:border-primary-700"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
                <Icon size={18} />
              </span>
              <span>
                <span className="block text-sm font-semibold">{label}</span>
                <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Safety tips */}
      <div className="card">
        <h2 className="mb-2 flex items-center gap-2 font-semibold">
          <Lightbulb size={18} className="text-amber-500" /> Safety tips
        </h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-gray-600 dark:text-gray-300">
          <li>Share your live location with a trusted contact before travelling late.</li>
          <li>Keep at least two primary contacts with working phone numbers.</li>
          <li>Use the Fake Call to politely leave uncomfortable situations.</li>
          <li>If you feel unsafe, press SOS early - cancelling a false alarm is one tap.</li>
        </ul>
      </div>
    </div>
  );
}
