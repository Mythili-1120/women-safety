import { useState } from 'react';
import { ShieldAlert, MapPin, Bell, Volume2, Database, CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { useEmergency } from '../context/EmergencyContext';

/**
 * "Emergency Protection" confirmation popup + live 7-step activation progress.
 *
 * EXACT copy required by the product spec:
 *   Title:   "Emergency Protection"
 *   Message: "Are you in an emergency? Activating SOS will share your current
 *             location with your trusted emergency contacts and activate the
 *             emergency alarm."
 *   Buttons: CANCEL / ACTIVATE SOS
 */
export default function EmergencyProtectionModal() {
  const {
    phase,
    steps,
    activateSOS,
    cancelConfirmation,
    retryActivation,
    continueWithoutLocation,
    unlockAlarm,
  } = useEmergency();
  const [activating, setActivating] = useState(false);

  if (phase === 'idle' || phase === 'active' || phase === 'cancelling') return null;

  const stepIcon = (status) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 size={18} className="text-green-500" />;
      case 'warning':
        return <AlertTriangle size={18} className="text-amber-500" />;
      case 'failed':
        return <XCircle size={18} className="text-red-500" />;
      case 'running':
        return <Loader2 size={18} className="animate-spin text-primary-500" />;
      default:
        return <span className="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />;
    }
  };

  const handleActivate = () => {
    setActivating(true);
    // Unlock audio synchronously inside this click gesture - the actual
    // alarm starts later, after the async GPS step (mobile autoplay rules).
    unlockAlarm && unlockAlarm();
    activateSOS();
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Emergency Protection"
    >
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl dark:bg-gray-900 sm:rounded-2xl">
        {/* ---------------- Confirmation ---------------- */}
        {phase === 'confirming' && (
          <>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300">
                <ShieldAlert size={24} />
              </span>
              <h2 className="text-lg font-bold">Emergency Protection</h2>
            </div>
            <p className="mb-5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              Are you in an emergency? Activating SOS will share your current
              location with your trusted emergency contacts and activate the
              emergency alarm.
            </p>
            <div className="mb-5 flex justify-end gap-3">
              <button
                className="btn-secondary min-w-[110px]"
                onClick={cancelConfirmation}
                autoFocus
              >
                CANCEL
              </button>
              <button
                className="btn-danger min-w-[150px] animate-pulse"
                onClick={handleActivate}
              >
                ACTIVATE SOS
              </button>
            </div>
          </>
        )}

        {/* ---------------- Running: 7-step progress ---------------- */}
        {phase === 'running' && (
          <>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 animate-pulse items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300">
                <ShieldAlert size={24} />
              </span>
              <div>
                <h2 className="text-lg font-bold">Emergency Protection</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Activating your SOS protection…
                </p>
              </div>
            </div>
            <ul className="mb-4 space-y-2.5">
              {steps.map((s) => (
                <li key={s.id} className="flex items-start gap-2.5">
                  <span className="mt-0.5 shrink-0">{stepIcon(s.status)}</span>
                  <span>
                    <span
                      className={`block text-sm font-medium ${
                        s.status === 'pending'
                          ? 'text-gray-400 dark:text-gray-500'
                          : 'text-gray-800 dark:text-gray-100'
                      }`}
                    >
                      {s.label}
                    </span>
                    {s.detail && (
                      <span
                        className={`block text-xs ${
                          s.status === 'warning' || s.status === 'failed'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {s.detail}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-center text-xs text-gray-400">
              Please keep this screen open while activation completes.
            </p>
          </>
        )}

        {/* ---------------- Permission denied choice ---------------- */}
        {phase === 'permission_denied' && (
          <>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300">
                <MapPin size={24} />
              </span>
              <h2 className="text-lg font-bold">Location permission needed</h2>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              Your browser has denied location access, so your exact position
              cannot be shared with your emergency contacts.
            </p>
            <p className="mb-5 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              You can allow location for this site in your browser settings and
              retry, or continue to send an SOS alert that will be clearly
              marked as <b>&quot;location unavailable&quot;</b> to your contacts.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button className="btn-secondary" onClick={retryActivation}>
                Retry location access
              </button>
              <button className="btn-danger" onClick={continueWithoutLocation}>
                Continue without location
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
