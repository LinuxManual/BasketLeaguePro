# BasketLeaguePro v5

BasketLeaguePro is a premium, local-first basketball league dashboard for managing rosters, fixtures, score entry, standings, and team chat, complete with a live-action match simulator.

## What's new in v5

- **Premium Glassmorphic Theme**: Rebuilt the interface with custom HSL tailored colors, dark mode, blurred backgrounds, dynamic glowing effects, and smooth micro-animations.
- **Live Match Simulator**: Added an interactive modal simulator allowing users to simulate matches period-by-period with live ticker feed commentary, automatic play-by-play events, and instant score updates.
- **Roster Attributes**: Extended the player roster system with Jersey Numbers and Positions (PG, SG, SF, PF, C).
- **Online sync on GitHub Pages**: Uses Cloud Firestore for shared, real-time state across visitors; `localStorage` remains an offline fallback.
- **Entry gate**: The dashboard displays the existing access-code prompt before opening.

## Run

```bash
npm run start
```

Open `http://localhost:4173` in your browser.

When running on GitHub Pages (static host), roster, match, score, and chat updates are saved to Cloud Firestore and synchronize across visitors. If the cloud service is unavailable, the dashboard safely falls back to the visitor's local browser storage.

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


## GitHub Pages publishing (important)

If `https://linuxmanual.github.io/BasketLeaguePro/` shows an older app (e.g., "Basket Clash" / Firebase UI), the Pages source is likely pointing to another branch/repo build, not this code.

This repository now includes `.github/workflows/deploy-pages.yml` to publish the current repo files as a static site.

Recommended settings in GitHub:
1. **Settings → Pages → Build and deployment → Source: GitHub Actions**
2. Ensure default branch is `main` and push this workflow to GitHub.
3. Re-run the "Deploy static site to GitHub Pages" workflow.

After deploy, hard refresh once to bypass browser cache.


### Removing old public files

The deploy workflow now publishes from a clean `_site/` folder that contains only current app files (`index.html`, `404.html`, `styles.css`, `script.js`, `data/store.json`). This removes old leftover public files from previous site versions on each deploy.


### If Pages is configured to branch mode

If repository settings use **Deploy from a branch** (instead of GitHub Actions), the new workflow `deploy-gh-pages-branch.yml` force-publishes a clean `gh-pages` branch (`force_orphan: true`).
This deletes old legacy files from previous deployments and keeps only the current app files in the public site branch.


### Fallback for branch/docs Pages setups

Some repositories publish from `main` + `/docs`. To avoid serving legacy app files, this repo now also mirrors the current app into `docs/` (`docs/index.html`, `docs/styles.css`, `docs/script.js`, `docs/404.html`, `docs/data/store.json`).
If your Pages source is set to **Deploy from branch → main /docs**, the new UI will publish from these files.


### Static sync command

Run `npm run sync:static` to regenerate both `_site/` (for workflow deploy artifact) and `docs/` (for branch/docs Pages mode) from the same source files.

Run `npm run check` before pushing; it now verifies server syntax **and** fails if deployable static files are out of sync between source and `docs/`.
