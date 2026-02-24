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

## Deploy
Deploy `index.html`, `styles.css`, and `script.js` to GitHub Pages.
All devices opening that deployed page will see the same shared data from Firebase.
