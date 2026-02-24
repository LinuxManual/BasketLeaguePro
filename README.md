# BasketLeaguePro

Professional single-page website for the basketball rivalry between **HotHeroes** and **Ιπτάμενοι**.

## Firebase Setup (configured)
The app is now prefilled with your Firebase project config:
- project: `basket-clash-7901c`
- app id: `1:307971899685:web:8143142e3fbe3526ef5acc`

The frontend uses:
- Firebase **Cloud Firestore** for shared live sync (chat, rosters, matches, scores)
- Firebase Analytics initialization (when supported by browser)

## What to enable in Firebase Console
1. Cloud Firestore must be enabled.
2. Firestore Rules must allow the app to read/write (at least for testing).

Example temporary test rules:
```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## GitHub Pages 404 fix
- Added `404.html` fallback redirect so unknown paths return to `/BasketLeaguePro/` instead of a dead 404 page.
- Assets are loaded with `./styles.css` and `./script.js` paths for safer project-page resolution.

## Deploy
Deploy `index.html`, `404.html`, `styles.css`, and `script.js` to GitHub Pages.
All devices opening that deployed page will see the same shared data from Firebase.


## Chat reset password
- Chat clear/reset is protected with admin password.
- Current password: `HotHeroes2026!`
- You can change it in `index.html` via `window.CHAT_RESET_PASSWORD`.


## Chat username lock & admin commands
- Each user can chat with one username per browser: username locks on first message and cannot be changed afterwards.
- Admin account configured:
  - username: `REDKNIGHT`
  - code: `1964`
- Admin commands in chat panel:
  - `/ban USERNAME`
  - `/unban USERNAME`
  - `/clear`
- Chat reset button still requires reset password: `HotHeroes2026!`
