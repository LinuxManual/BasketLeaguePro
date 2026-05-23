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


## Deployment note

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
