# women-safety

A complete **Women Safety Alert System** — a mobile-first React web app that
sends SOS alerts with live GPS location to trusted contacts, sounds an
emergency alarm, supports voice activation, fake calls, nearby help centers
and a secure admin dashboard.

Built with **React 18 + Vite + Tailwind CSS + Firebase (Auth & Firestore) +
Google Maps + Recharts**.

---

## Features

| # | Feature | What it really does |
|---|---------|--------------------|
| 1 | **SOS Emergency Button** | Confirmation popup ("Emergency Protection") → checks location permission → gets a fresh high-accuracy GPS fix → sounds the alarm → alerts trusted contacts → starts live location sharing → saves the alert to Firestore → shows real delivery status. Duplicate clicks are locked out. |
| 2 | **Accurate Live Location** | Real browser Geolocation API only (`enableHighAccuracy: true`, `maximumAge: 0`) — never fake/hardcoded coordinates. Shows latitude, longitude, accuracy, fix time, map and a Google Maps link. Live updates every few seconds during an emergency. Handles `PERMISSION_DENIED` / `POSITION_UNAVAILABLE` / `TIMEOUT` with clear messages. |
| 3 | **Emergency Alarm** | Loud two-oscillator siren (Web Audio API) with looping WAV fallback. AudioContext is unlocked inside the button gesture (mobile autoplay-safe). Test mode, user-controlled duration, honest error if playback is blocked, Stop Alarm button. |
| 4 | **Emergency Contacts** | Full CRUD with phone-number validation, relationship, primary-contact flag (single primary enforced). |
| 5 | **Voice Activation** | Web Speech API with a custom safety phrase (set in Profile). Phrase detection opens the same confirm-safe SOS popup (no accidental triggers). |
| 6 | **Fake Call** | Customizable caller name + ring delay, generated ringtone, full-screen realistic incoming-call UI with answer/decline/in-call timer. |
| 7 | **Nearby Help Centers** | Google Places nearby search (police / hospitals / help centers) around your GPS position with distance and directions. Without an API key it falls back to real one-tap Google Maps searches — never fake results. |
| 8 | **Alert History** | Searchable, filterable list of every alert with location, accuracy, contact delivery status and cancel-false-alarm action. |
| 9 | **Admin Dashboard** | Separate secure admin login (`admin_users` collection), platform stats via Firestore count aggregations, Recharts analytics (alerts/day, registrations/day, alert-type split), user & incident management, alert resolution. |

Plus: email/password auth with verification, forgot-password flow, profile
settings, dark/light mode, incident reporting, responsive mobile-first UI,
loading/error states everywhere, and hardened Firestore security rules.

---

## Project structure

```
women-safety/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── firestore.rules          # Security rules (deploy these!)
├── firestore.indexes.json   # Composite indexes for history/admin queries
├── firebase.json
├── .env.example             # Copy to .env and fill in your keys
└── src/
    ├── firebase/config.js   # Firebase init (env-based, no secrets committed)
    ├── context/
    │   ├── AuthContext.jsx        # Auth state + user profile + admin role
    │   ├── ThemeContext.jsx       # Dark/light mode
    │   └── EmergencyContext.jsx   # SOS state machine (7-step activation)
    ├── hooks/
    │   ├── useGeolocation.js# Real GPS with high accuracy + error mapping
    │   ├── useAlarm.js      # Web Audio siren + WAV fallback + unlock
    │   └── useVoiceSOS.js   # Web Speech API phrase detection
    ├── components/          # SOS popup, active-emergency panel, map, navbar…
    └── pages/               # 13 screens (landing → admin dashboard)
```

## Database (Firestore collections)

- **users** — profile (name, email, phone, safety phrase, alarm/fake-call prefs)
- **emergency_contacts** — trusted contacts (userId, name, phone, relation, isPrimary)
- **emergency_alerts** — SOS records with location, delivery status per contact
- **location_shares** — live location sessions with throttled position updates
- **reported_incidents** — community safety reports reviewed by admins
- **admin_users** — admin role documents (created ONLY in the Firebase console)

## Setup

### 1. Firebase (required, ~5 minutes)

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. **Project settings → General → Your apps → Web app** → copy the config values.
3. **Authentication → Sign-in method → enable Email/Password.**
4. **Firestore Database → Create database** (production mode).
5. Paste the contents of [`firestore.rules`](./firestore.rules) into
   **Firestore → Rules** and publish (or run `firebase deploy --only firestore`).
6. Create an admin (optional, for `/admin/login`): in **Firestore → admin_users**,
   add a document whose **ID is the admin user's Auth UID** with field
   `role: "admin"`. There is no other way in — clients cannot write this collection.

### 2. Environment variables

```bash
cp .env.example .env
# edit .env with your Firebase web config + (optional) Google Maps key
```

`VITE_GOOGLE_MAPS_API_KEY` (optional) — enable **Maps JavaScript API** and
**Places API** in Google Cloud, create a browser key. The app works without
it and shows real Google Maps search links instead.

### 3. Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

## Security design

- Location data lives only in the user's own Firestore documents; rules allow
  `userId == request.auth.uid` reads/writes (admins get read access for
  emergency response).
- Admin role = existence of `admin_users/{uid}`, writable by nobody from the
  client — the console is the only provisioning path.
- Alerts can only be *cancelled* by their owner (field-level update guard),
  never silently edited.
- No API keys, tokens or secrets are committed: everything is env-based and
  `.env` is git-ignored.

## Honest status reporting

Contact delivery status is **real**: `Pending` until Firestore confirms the
write, `Sent` once the alert record is durably stored in the realtime
emergency channel, `Failed` if the write fails. The app never claims SMS/email
delivery that a provider did not confirm — instead it offers one-tap SMS and
WhatsApp deep links so the user can send the location directly from their
phone.

## Important

This app is a safety aid, not a replacement for local emergency services.
In an immediate crisis always call your local emergency number.
