import { useEffect, useRef, useState } from 'react';
import {
  PhoneCall,
  PhoneOff,
  Settings,
  Timer,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { useAlarm } from '../hooks/useAlarm';
import { useAuth } from '../context/AuthContext';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from '../utils/toast';

/**
 * Fake Call - a realistic incoming-call screen with a customizable caller
 * name and ring delay. Genuine utility for leaving unsafe situations.
 */
export default function FakeCall() {
  const { userProfile, updateUserProfile } = useAuth();
  const alarm = useAlarm();
  const [callerName, setCallerName] = useState(userProfile?.fakeCallName || 'Mom');
  const [delaySec, setDelaySec] = useState(userProfile?.fakeCallDelaySec ?? 5);
  const [stage, setStage] = useState('setup'); // setup | ringing | incall | ended
  const [elapsed, setElapsed] = useState(0);
  const ringTimerRef = useRef(null);
  const tickRef = useRef(null);
  const savedRef = useRef({ name: '', delay: null });

  useEffect(() => {
    savedRef.current = {
      name: userProfile?.fakeCallName || 'Mom',
      delay: userProfile?.fakeCallDelaySec ?? 5,
    };
  }, [userProfile]);

  // Keep a live preview in the form while not in a call
  useEffect(() => {
    if (stage === 'setup' && savedRef.current.name !== callerName) {
      savedRef.current.name = callerName;
    }
  }, [callerName, stage]);

  useEffect(() => {
    return () => {
      if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
      alarm.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveSettings() {
    const d = Math.max(0, Math.min(120, Number(delaySec) || 0));
    try {
      await updateUserProfile({ fakeCallName: callerName.trim() || 'Mom', fakeCallDelaySec: d });
      setDelaySec(d);
      toast.success('Fake call settings saved.');
    } catch {
      toast.error('Could not save settings. Check your connection.');
    }
  }

  async function triggerCall() {
    const d = Math.max(0, Math.min(120, Number(delaySec) || 0));
    if (d > 0) {
      toast.info(`Fake call will ring in ${d} seconds. Keep this screen open.`);
      setStage('waiting');
      const waitStart = Date.now();
      const countdown = setInterval(() => {
        const left = d - Math.floor((Date.now() - waitStart) / 1000);
        if (left <= 0) clearInterval(countdown);
      }, 500);
      ringTimerRef.current = setTimeout(async () => {
        clearInterval(countdown);
        const ok = await alarm.startRingtone();
        setStage('ringing');
        if (!ok) {
          // still show the incoming screen - visual alone has value, but be honest
          toast.error('Ringtone could not play - check your device volume.');
        }
      }, d * 1000);
    } else {
      const ok = await alarm.startRingtone();
      setStage('ringing');
      if (!ok) toast.error('Ringtone could not play - check your device volume.');
    }
  }

  function answer() {
    if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
    alarm.stop();
    setStage('incall');
    setElapsed(0);
    tickRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  }

  function decline() {
    if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
    alarm.stop();
    setStage('ended');
    setTimeout(() => setStage('setup'), 1800);
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  // ---------------- Fullscreen incoming call ----------------
  if (stage === 'waiting' || stage === 'ringing' || stage === 'incall' || stage === 'ended') {
    return (
      <div className="fixed inset-0 z-[95] flex flex-col items-center justify-between bg-gradient-to-b from-gray-900 via-gray-950 to-black px-6 py-16 text-white">
        <div className="flex flex-col items-center">
          <p className="text-sm uppercase tracking-widest text-gray-400">
            {stage === 'waiting'
              ? `Calling you in ${Math.max(0, delaySec)}s…`
              : stage === 'ringing'
                ? 'Incoming call'
                : stage === 'incall'
                  ? 'Connected'
                  : 'Call ended'}
          </p>
          <span className="my-8 flex h-28 w-28 items-center justify-center rounded-full bg-gray-800 text-4xl font-bold text-gray-300 ring-4 ring-gray-700">
            {(callerName || 'M').charAt(0).toUpperCase()}
          </span>
          <h1 className="text-3xl font-semibold">{callerName || 'Mom'}</h1>
          <p className="mt-2 text-sm text-gray-400">
            {stage === 'incall'
              ? `${mm}:${ss}`
              : stage === 'ended'
                ? 'Tap anywhere to return'
                : 'Mobile · India'}
          </p>
        </div>

        <div className="flex w-full max-w-xs items-center justify-around pb-6">
          {stage === 'ringing' ? (
            <>
              <button
                onClick={decline}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-lg transition hover:bg-red-500"
                aria-label="Decline call"
              >
                <PhoneOff size={26} />
              </button>
              <button
                onClick={answer}
                className="flex h-16 w-16 animate-pulse-slow items-center justify-center rounded-full bg-green-600 shadow-lg transition hover:bg-green-500"
                aria-label="Answer call"
              >
                <PhoneCall size={26} />
              </button>
            </>
          ) : stage === 'incall' ? (
            <button
              onClick={decline}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-lg transition hover:bg-red-500"
              aria-label="End call"
            >
              <PhoneOff size={26} />
            </button>
          ) : (
            <button
              onClick={decline}
              className="h-14 w-14 rounded-full bg-gray-800 text-gray-300"
              aria-label="Dismiss"
            >
              <ArrowLeft size={20} className="mx-auto" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ---------------- Setup screen ----------------
  return (
    <div className="mx-auto max-w-md space-y-5">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Fake Call</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Get a realistic incoming call to exit unsafe or uncomfortable situations.
        </p>
      </div>

      <div className="card space-y-4">
        <div>
          <label className="label" htmlFor="caller">Caller name</label>
          <div className="relative">
            <PhoneCall size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="caller"
              className="input-field pl-9"
              placeholder="e.g. Mom, Priya, Office"
              value={callerName}
              onChange={(e) => setCallerName(e.target.value)}
              maxLength={30}
            />
          </div>
        </div>
        <div>
          <label className="label flex items-center gap-1.5" htmlFor="delay">
            <Timer size={13} /> Ring after (seconds)
          </label>
          <input
            id="delay"
            type="number"
            min="0"
            max="120"
            className="input-field"
            value={delaySec}
            onChange={(e) => setDelaySec(e.target.value)}
          />
          <p className="mt-1 text-xs text-gray-400">0 = rings immediately. Max 120 seconds.</p>
        </div>
        <button className="btn-secondary w-full" onClick={saveSettings}>
          <Settings size={15} /> Save settings
        </button>
      </div>

      <div className="card flex flex-col items-center py-8">
        {/* Phone preview */}
        <div className="mb-5 w-44 rounded-[2rem] border-4 border-gray-800 bg-gray-900 p-4 text-center text-white shadow-xl">
          <p className="text-[10px] uppercase tracking-widest text-gray-400">Incoming call</p>
          <span className="mx-auto my-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-700 text-xl font-bold">
            {(callerName || 'M').charAt(0).toUpperCase()}
          </span>
          <p className="text-sm font-semibold">{callerName || 'Mom'}</p>
          {alarm.isPlaying && <p className="mt-1 text-[10px] text-green-400">♪ ringtone playing</p>}
        </div>
        <button className="btn-primary w-full py-3 text-base" onClick={triggerCall}>
          <PhoneCall size={18} />
          Trigger fake call {Number(delaySec) > 0 ? `in ${delaySec}s` : 'now'}
        </button>
        {alarm.error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/60 dark:text-red-300">
            {alarm.error}
          </p>
        )}
        <p className="mt-3 text-center text-xs text-gray-400">
          The screen locks into a full incoming-call view - decline or end it any
          time to come back here.
        </p>
      </div>
    </div>
  );
}
