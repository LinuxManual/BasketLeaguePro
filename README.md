# BasketLeaguePro

Professional single-page website for the basketball rivalry between **HotHeroes** and **Ιπτάμενοι**.

## Major upgrade (v5.1)
- Re-enabled **Firebase-first** data layer across the whole app (rosters, matches, scores, chat, dashboard state).
- Automatic fallback strategy:
  1. Firebase Cloud Firestore
  2. Local API (`/api/*`)
  3. Browser local storage
- Updated UI versioning to `5.1`.

## Firebase configuration
The app is prefilled with your Firebase project config:
- project: `basket-clash-7901c`
- app id: `1:307971899685:web:8143142e3fbe3526ef5acc`

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

## Run locally
```bash
node server.js
# open http://localhost:4173
```
