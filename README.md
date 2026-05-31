# BasketLeaguePro v5

BasketLeaguePro is a premium, local-first basketball league dashboard for managing rosters, fixtures, score entry, standings, and team chat, complete with a live-action match simulator.

## What's new in v5

- **Premium Glassmorphic Theme**: Rebuilt the interface with custom HSL tailored colors, dark mode, blurred backgrounds, dynamic glowing effects, and smooth micro-animations.
- **Live Match Simulator**: Added an interactive modal simulator allowing users to simulate matches period-by-period with live ticker feed commentary, automatic play-by-play events, and instant score updates.
- **Roster Attributes**: Extended the player roster system with Jersey Numbers and Positions (PG, SG, SF, PF, C).
- **Static fallback for GitHub Pages**: Supports running completely serverless/client-side on GitHub Pages using `localStorage` for state management, while retaining the full local API features when running locally.

## Run

```bash
npm run start
```

Open `http://localhost:4173` in your browser.

When running on GitHub Pages (static host), the dashboard runs entirely client-side. Roster, match, score, and chat data is stored locally in the visitor's browser.

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

## Deployment Note

If UI updates do not appear after deploy, hard refresh the page or clear cache once. Static assets are cache-busted using version query strings in `index.html` (for `styles.css` and `script.js`).
