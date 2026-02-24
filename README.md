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

## If updates/messages still do not appear
- Do a hard refresh on each device/browser tab (`Ctrl+F5` or equivalent).
- Make sure all devices use the exact same server URL/IP and port.
- Do **not** open `localhost` on each device separately.
