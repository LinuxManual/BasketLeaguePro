# BasketLeaguePro

Professional single-page website for the basketball rivalry between **HotHeroes** and **Ιπτάμενοι**.

## Major upgrade
- Upgraded chat UX with immutable username lock per browser, live search, and message counter.
- Added live **Game Insights** dashboard (total matches, wins per team, average total points).
- Removed admin login and admin commands from the interface.
- Kept protected chat reset with password.

## Firebase Setup (configured)
The app is prefilled with your Firebase project config:
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

## Chat reset password
- Current password: `HotHeroes2026!`
- You can change it in `index.html` via `window.CHAT_RESET_PASSWORD`.

## GitHub Pages
- Include: `index.html`, `404.html`, `styles.css`, `script.js`
- Open: `https://linuxmanual.github.io/BasketLeaguePro/`
