import {
  Siren,
  VolumeX,
  XCircle,
  MapPin,
  MessageSquare,
  ExternalLink,
  Clock,
  Database,
} from 'lucide-react';
import { useEmergency } from '../context/EmergencyContext';
import { formatTime, smsLink, whatsappLink, telLink, coordText, statusBadgeClass } from '../utils/helpers';

/**
 * Persistent panel shown while an emergency is active (on every page):
 * live location with Google Maps link, per-contact delivery status with
 * one-tap SMS / WhatsApp escalation, alarm stop and false-alarm cancel.
 */
export default function ActiveEmergencyPanel() {
  const {
    phase,
    activeAlert,
    cancelEmergency,
    stopAlarmSound,
    alarmPlaying,
  } = useEmergency();

  if (phase !== 'active' || !activeAlert) return null;

  const locText = activeAlert.location
    ? coordText(activeAlert.location.lat, activeAlert.location.lng)
    : 'Location unavailable';

  const locationMessage = activeAlert.location
    ? `EMERGENCY! I need help. My current location: ${activeAlert.location.lat.toFixed(6)}, ${activeAlert.location.lng.toFixed(6)} - ${activeAlert.mapsLink}`
    : 'EMERGENCY! I need help. I could not share my location - please call me.';

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] px-3 pb-3 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[380px]">
      <div className="overflow-hidden rounded-2xl border-2 border-red-500 bg-white shadow-2xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between bg-red-600 px-4 py-2.5 text-white">
          <div className="flex items-center gap-2">
            <Siren size={18} className="animate-shake" />
            <span className="text-sm font-bold tracking-wide">
              EMERGENCY ACTIVE
            </span>
          </div>
          <span className="flex items-center gap-1 text-xs">
            <Clock size={12} /> since {formatTime(activeAlert.startedAt)}
          </span>
        </div>

        <div className="max-h-[55vh] space-y-3 overflow-y-auto p-4">
          {/* Warnings */}
          {!activeAlert.dbSaved && (
            <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              <Database size={13} className="mr-1 inline" />
              Not yet confirmed in the database (offline?). It will sync
              automatically when your connection returns.
            </p>
          )}
          {!activeAlert.locationAvailable && (
            <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              <MapPin size={13} className="mr-1 inline" />
              This alert is clearly marked <b>&quot;location unavailable&quot;</b> -
              your contacts are asked to call you directly.
            </p>
          )}

          {/* Location */}
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <MapPin size={13} /> Current location
            </p>
            <p className="text-sm font-medium">{locText}</p>
            {activeAlert.location && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                accuracy ±{Math.round(activeAlert.location.accuracy)}m · updating
                live
              </p>
            )}
            {activeAlert.mapsLink && (
              <a
                href={activeAlert.mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
              >
                Open in Google Maps <ExternalLink size={12} />
              </a>
            )}
          </div>

          {/* Contacts + delivery status */}
          {activeAlert.contacts.length > 0 ? (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Trusted contacts · in-app alert status
              </p>
              <ul className="space-y-1.5">
                {activeAlert.contacts.map((c) => (
                  <li
                    key={c.contactId}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-2.5 py-2 dark:border-gray-700"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {c.phone}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(c.status)}`}
                      >
                        {c.status}
                      </span>
                      <a
                        href={smsLink(c.phone, locationMessage)}
                        className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Send SMS with location"
                      >
                        <MessageSquare size={14} />
                      </a>
                      <a
                        href={whatsappLink(c.phone, locationMessage)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30"
                        title="Send WhatsApp with location"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.4 14.1c-.2.6-1.2 1.2-1.7 1.2-.4.1-1 .1-1.6-.1a13 13 0 0 1-5.7-5c-.6-1-.9-2-.9-2.6 0-.7.3-1.3.7-1.7.2-.2.4-.3.6-.3h.5c.2 0 .4 0 .5.4l.7 1.7c.1.2 0 .4-.1.6l-.4.5c-.1.2-.3.3-.1.6a8 8 0 0 0 3.5 3c.3.1.4.1.6-.1l.7-.9c.2-.2.4-.2.6-.1l1.6.8c.2.1.4.2.4.3 0 .2 0 .8-.2 1.3z" />
                        </svg>
                      </a>
                      <a
                        href={telLink(c.phone)}
                        className="rounded p-1 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30"
                        title="Call contact"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                        </svg>
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[11px] leading-snug text-gray-400">
                Contacts marked <b>Sent</b> received the alert through the app&apos;s
                realtime emergency channel. Use SMS / WhatsApp icons to also
                send the location directly from your phone.
              </p>
            </div>
          ) : (
            <p className="rounded-lg bg-gray-50 p-2.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              No trusted contacts saved yet - add them from the Contacts page so
              future alerts reach someone.
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
            {alarmPlaying && (
              <button className="btn-secondary w-full" onClick={stopAlarmSound}>
                <VolumeX size={16} /> Stop Alarm
              </button>
            )}
            <button
              className="btn-secondary w-full font-bold text-red-600 dark:text-red-400"
              onClick={cancelEmergency}
              disabled={phase === 'cancelling'}
            >
              <XCircle size={16} />
              {phase === 'cancelling' ? 'Cancelling…' : 'Cancel - False Alarm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
