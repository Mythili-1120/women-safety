export const ALERT_STATUS = {
  PENDING: 'Pending',
  SENT: 'Sent',
  FAILED: 'Failed',
};

export const GEO_ERROR_MESSAGES = {
  1: 'Location permission was denied. Enable location access for this site in your browser settings to share your position with emergency contacts.',
  2: 'Your position is currently unavailable (GPS/network error). Move to an open area and try again.',
  3: 'Getting your location timed out. Check that GPS is enabled and try again.',
};

export const ALARM_PRESETS = [
  { id: 'siren', label: 'Emergency Siren' },
  { id: 'alarm', label: 'Loud Alarm' },
];

export const VOICE_DEFAULT_PHRASE = 'help me';

export const CONTACT_RELATIONS = [
  'Parent',
  'Spouse / Partner',
  'Sibling',
  'Friend',
  'Relative',
  'Colleague',
  'Other',
];

export const INCIDENT_TYPES = [
  'Harassment',
  'Stalking',
  'Unsafe area',
  'Suspicious person',
  'Chain snatching',
  'Eve teasing',
  'Domestic violence',
  'Other',
];
