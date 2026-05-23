# BasketLeaguePro v4

BasketLeaguePro is a local-first basketball league dashboard for rosters, fixtures, score entry, standings, and team chat.

## What's new in v4

- Rebuilt the interface into a responsive operations dashboard.
- Fixed the Greek team name encoding and migrated legacy roster keys.
- Added standings, schedule filters, delete actions, richer empty states, and toast feedback.
- Hardened client rendering so user-entered names and messages are inserted safely.
- Added backend endpoints for player and match deletion, score bounds, and safer static path handling.
- Added a GitHub Pages/static fallback that stores data in the visitor's browser with `localStorage`.

## Run

```bash
npm install
npm run start
```

Open `http://localhost:4173`.

On GitHub Pages, the dashboard runs as a static app. Roster, match, score, and chat data is stored locally in each visitor's browser.

## API endpoints

- `GET /api/state`
- `POST /api/players`
- `DELETE /api/players`
- `POST /api/matches`
- `DELETE /api/matches`
- `POST /api/scores`
- `POST /api/chat`
- `DELETE /api/chat`
- `GET /api/health`
