# BasketLeaguePro

Professional single-page website for the basketball rivalry between **HotHeroes** and **Ιπτάμενοι**.

## Features
- Large responsive landing page focused on the two teams.
- Team roster management: add members for each team.
- Match management: add match date/time/court and save results (scores).
- Public Fan Zone chat.
- Shared persistence on server: all users from any device see the same data.

## Run (shared across devices)
1. Start backend server on one machine:
   - `node server.js`
2. Find that machine's local IP (example `192.168.1.20`).
3. Open the site from every device using the same host:
   - `http://192.168.1.20:4173`
4. In page field **"URL server"**, set the same backend URL and press **"Σύνδεση"**.

## Important for GitHub Pages
- `https://...github.io/...` is static hosting only (no Node backend `/api`).
- If frontend is HTTPS, backend must also be HTTPS (browser blocks HTTP backend as mixed content).
- So for GitHub Pages, set an external HTTPS backend URL in the "URL server" field.

## Troubleshooting
- Hard refresh each device (`Ctrl+F5`).
- Confirm all devices use exactly the same backend URL.
- Do **not** use `localhost` on each device separately.
