# BasketLeaguePro v3

A complete aggressive refactor of the app into a cleaner local-first architecture.

## What's new in v3
- Rebuilt UI with a modern dashboard layout.
- Simplified client: one API utility + declarative render pipeline.
- Unified operations for players, matches, scores, and live chat.
- Real-time-like refresh loop for shared views (5s polling).
- Hardened backend validations remain in `server.js`.

## Run
```bash
npm install
npm run start
```
Open `http://localhost:4173`.

## API endpoints
- `GET /api/state`
- `POST /api/players`
- `POST /api/matches`
- `POST /api/scores`
- `POST /api/chat`
- `DELETE /api/chat`
- `GET /api/health`
