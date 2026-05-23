# BasketLeaguePro v4.0 (Mega Upgrade)

## Τι άλλαξε
- Πλήρες UI redesign με μεγαλύτερο dashboard και καλύτερη οργάνωση.
- Νέο module στοιχημάτων με endpoint `POST /api/bets`.
- Νέα metrics: wins, completed matches, won bets.
- Search filter στο πρόγραμμα αγώνων.
- Export current state σε JSON από το UI.
- Local-first αρχιτεκτονική με periodic refresh 5s.

## Run
```bash
npm install
npm run start
```

## API
- `GET /api/state`
- `POST /api/players`
- `POST /api/matches`
- `POST /api/scores`
- `POST /api/bets`
- `POST /api/chat`
- `DELETE /api/chat`
- `GET /api/health`
