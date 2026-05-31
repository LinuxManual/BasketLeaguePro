# BasketLeaguePro v6

BasketLeaguePro is a premium, local-first basketball league command center for managing rosters, fixtures, score entry, standings, locker room chat, and a live-action match simulator.

## What's new in v6

- **Season Command Center**: Adds an analytics deck with a live season narrative, next tip-off card, timeline strip, and team power balance bars.
- **Smarter roster management**: Search by name, jersey number, or position and sort roster cards without losing the fast add/remove workflow.
- **Upgraded fixtures desk**: Search fixtures by court/date/score and sort by chronological order, newest first, or highest combined score.
- **Data Room tools**: Export a full JSON backup, copy a season recap, or reset local browser data from the dashboard.
- **Versioned static assets**: Bumps cache-busting to v6 and keeps GitHub Pages/local API fallback behavior.

## Run

```bash
npm run start
```

Open `http://localhost:4173` in your browser.

When running on GitHub Pages (static host), the dashboard runs entirely client-side. Roster, match, score, and chat data is stored locally in the visitor's browser.

## Checks

```bash
npm run check
```

The check script validates both the Node server and browser module JavaScript syntax.

## API Endpoints

- `GET /api/state` - Fetch current rosters, matches, and chat state
- `POST /api/players` - Add a new player (name, number, position, team)
- `DELETE /api/players` - Remove a player from the roster
- `POST /api/matches` - Create a new match fixture
- `DELETE /api/matches` - Delete a scheduled match
- `POST /api/scores` - Record match scores (updates standings automatically)
- `POST /api/chat` - Post a message to team locker room chat
- `DELETE /api/chat` - Clear all chat messages
- `GET /api/health` - Diagnostics and app version health checks

## Deployment Note

If UI updates do not appear after deploy, hard refresh the page or clear cache once. Static assets are cache-busted using version query strings in `index.html` for `styles.css` and `script.js`.
