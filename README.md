# BasketLeaguePro v7

BasketLeaguePro is a premium, local-first basketball league dashboard for managing rosters, fixtures, score entry, standings, and team chat, complete with a live-action match simulator.

## What's new in v6

- **Command Center Analytics**: next tip-off countdown, recent form, scoring trend, global search, notifications and export backup.\n- **Light/Dark UI**: instant theme toggle for the dashboard.\n- **Premium Glassmorphic Theme**: Rebuilt the interface with custom HSL tailored colors, dark mode, blurred backgrounds, dynamic glowing effects, and smooth micro-animations.
- **Live Match Simulator**: Added an interactive modal simulator allowing users to simulate matches period-by-period with live ticker feed commentary, automatic play-by-play events, and instant score updates.
- **Roster Attributes**: Extended the player roster system with Jersey Numbers and Positions (PG, SG, SF, PF, C).
- **Online sync on GitHub Pages**: Uses Cloud Firestore for shared, real-time state across visitors; `localStorage` remains an offline fallback.
- **Entry gate**: The dashboard displays the existing access-code prompt before opening.

## Upgrade highlights\n\nThe v6 branch keeps the existing local-first + Firestore architecture and adds a presentation/analytics layer without requiring a framework migration. The new Command Center is computed from the existing match state, so it works offline too.\n\n## Firebase configuration

Firebase's web configuration is loaded from runtime configuration instead of being embedded in tracked browser JavaScript. Create a local `.env` from `.env.example`, set the variables with the Firebase project values, and export them before starting the server. In production, set the same variables through the host's secret/environment-variable settings.

```bash
set -a
. ./.env
set +a
npm run start
```

For GitHub Pages, the included deployment workflow creates `firebase-config.js` from GitHub Actions secrets and deploys it as a Pages artifact. The generated file is never committed to the repository or a `gh-pages` branch, so Firebase synchronization works on the static site without placing the values in Git history. Add the seven names from `.env.example` as repository Actions secrets, then set **Settings → Pages → Source** to **GitHub Actions** and push to `main` (or run **Deploy GitHub Pages** manually).

On a Node deployment, the server exposes the web configuration only to the running dashboard at `GET /api/firebase-config`; this endpoint is intentionally not available unless every required variable is configured. Firebase web configuration is public client configuration, not a substitute for security: restrict the API key to the approved web origins in Google Cloud and protect shared Firestore data with Firebase Authentication and Firestore Security Rules. Do not try to bypass GitHub secret scanning; rotate any credential that has been committed or flagged.

## Run

```bash
npm run start
```

Open `http://localhost:4173` in your browser.

When Firebase is configured on the Node host, roster, match, score, and chat updates are saved to Cloud Firestore and synchronize across visitors. If cloud sync is unavailable, the dashboard safely falls back to the visitor's local browser storage.

## API Endpoints

- `GET /api/state` - Fetch current game, rosters, and chat state
- `POST /api/players` - Add a new player (name, number, position, team)
- `DELETE /api/players` - Remove a player from the roster
- `POST /api/matches` - Create a new match fixture
- `DELETE /api/matches` - Delete a scheduled match
- `POST /api/scores` - Record match scores (updates standings automatically)
- `POST /api/chat` - Post a message to team locker room chat
- `DELETE /api/chat` - Clear all chat messages
- `GET /api/health` - Diagnostics and app version health checks
- `GET /api/firebase-config` - Provides Firebase web configuration only when the server environment is fully configured

## Deployment Note

If UI updates do not appear after deploy, hard refresh the page or clear cache once. Static assets are cache-busted using version query strings in `index.html` (for `styles.css` and `script.js`).


## V7 — Basketball OS

Version 7 turns the dashboard into a lightweight basketball operations system.

### Score-only αγώνες ομάδων και ξεχωριστοί αγώνες 1v1.

- Στους κανονικούς αγώνες καταχωρείται μόνο το τελικό σκορ.
- Οι αγώνες 1v1 έχουν ξεχωριστή δημιουργία, λίστα και τελικό σκορ ανά παίκτη.


## V8 — Gemini AI Chatbot
- Public AI chatbot UI inside the dashboard.
- Server-side `/api/ai-chat` proxy using Google's Gemini Interactions API.
- The Gemini API key is never committed to the repository or sent to the browser.
- Configure `GEMINI_API_KEY` on the Node server. Optionally set `GEMINI_MODEL`; default: `gemini-flash-latest`.
- **Important:** GitHub Pages is static and cannot execute `server.js`; the AI endpoint requires a Node-capable deployment/proxy.
- 1v1 score entry is already present via **Καταχώρηση σκορ** and `POST /api/one-v-one-score`.
