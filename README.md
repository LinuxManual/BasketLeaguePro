# BasketLeaguePro

Professional single-page website for the basketball rivalry between **HotHeroes** and **Ιπτάμενοι**.

## Features
- Large responsive landing page focused on the two teams.
- Team roster management: add members for each team.
- Match management: add match date/time/court and save results (scores).
- Public Fan Zone chat.
- Shared persistence on server: all users from any device see the same data.

## Run (shared across devices)
1. Start server on one machine:
   - `node server.js`
2. Find that machine's local IP (example `192.168.1.20`).
3. Open the site from every device using that same URL:
   - `http://192.168.1.20:4173`
4. In the page field **"URL server"**, set the same server URL and press **"Σύνδεση"**.

> Important: If each device opens a different host (e.g. `localhost` on each device), data will not be shared.
