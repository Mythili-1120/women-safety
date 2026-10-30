import { GEO_ERROR_MESSAGES } from './constants';

export function formatDateTime(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatTime(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/** Small distance formatter (haversine, km). */
export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2);
}

export function geoErrorMessage(error) {
  if (!error) return 'Unknown location error.';
  return (
    GEO_ERROR_MESSAGES[error.code] ||
    error.message ||
    'Failed to get your location.'
  );
}

/** Google Maps link for a coordinate pair. */
export function mapsLink(lat, lng, accuracy) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  const base = `https://www.google.com/maps?q=${lat},${lng}`;
  return accuracy ? `${base}+(±${Math.round(accuracy)}m)` : base;
}

export function coordText(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return 'Location unavailable';
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function isValidPhone(phone) {
  // E.164-style international number: optional +, 8-15 digits total
  return /^\+?[0-9]{8,15}$/.test(phone.replace(/[\s-()]/g, ''));
}

export function normalizePhone(phone) {
  return phone.replace(/[\s-()]/g, '');
}

export function smsLink(phone, message) {
  const p = normalizePhone(phone);
  const isAndroid = /android/i.test(navigator.userAgent);
  return `sms:${p}${isAndroid ? '?' : '&'}body=${encodeURIComponent(message)}`;
}

export function whatsappLink(phone, message) {
  const p = normalizePhone(phone).replace(/^\+/, '');
  return `https://wa.me/${p}?text=${encodeURIComponent(message)}`;
}

export function telLink(phone) {
  return `tel:${normalizePhone(phone)}`;
}

/** Simple alert status badge classes. */
export function statusBadgeClass(status) {
  switch (status) {
    case 'Sent':
      return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
    case 'Failed':
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    case 'Pending':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    case 'active':
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    case 'cancelled':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
    case 'resolved':
      return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
  }
}

/** Truncate long text with ellipsis. */
export function truncate(text, max = 60) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
