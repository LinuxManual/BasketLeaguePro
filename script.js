// 1. Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBm5k1wF7-RaC8hEtTy2Phznxey0FnAcsU",
  authDomain: "basket-clash-7901c.firebaseapp.com",
  projectId: "basket-clash-7901c",
  storageBucket: "basket-clash-7901c.firebasestorage.app",
  messagingSenderId: "307971899685",
  appId: "1:307971899685:web:8143142e3fbe3526ef5acc",
  measurementId: "G-SDPWG5QT2N"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 2. DOM Elements
const playerForm = document.getElementById("player-form");
const matchForm = document.getElementById("match-form");
const scoreForm = document.getElementById("score-form");
const betForm = document.getElementById("bet-form");
const chatForm = document.getElementById("chat-form");

const hotHeroesList = document.getElementById("hotheroes-list");
const iptamenoiList = document.getElementById("iptamenoi-list");
const matchesBody = document.getElementById("matches-body");
const matchSelect = document.getElementById("match-select");
const betMatchSelect = document.getElementById("bet-match-select");
const betsList = document.getElementById("bets-list");
const chatMessages = document.getElementById("chat-messages");
const clearButton = document.getElementById("clear-chat");

const appState = {
  matches: [],
  bets: []
};

// 3. LIVE LISTENERS

db.collection("siteData").doc("rosters").onSnapshot((doc) => {
  const data = doc.exists ? doc.data() : {};
  renderRoster(hotHeroesList, data.HotHeroes || []);
  renderRoster(iptamenoiList, data.Ιπτάμενοι || []);
});

db.collection("matches").orderBy("date").onSnapshot((snapshot) => {
  appState.matches = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  renderMatches(appState.matches);
  renderMatchSelect(matchSelect, appState.matches);
  renderMatchSelect(betMatchSelect, appState.matches);
  renderBets(appState.bets, appState.matches);
});

db.collection("bets").orderBy("createdAt", "desc").limit(100).onSnapshot((snapshot) => {
  appState.bets = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  renderBets(appState.bets, appState.matches);
});

db.collection("messages").orderBy("createdAt", "desc").limit(50).onSnapshot((snapshot) => {
  chatMessages.innerHTML = "";

  if (snapshot.empty) {
    const emptyState = document.createElement("li");
    emptyState.className = "chat-item";
    emptyState.textContent = "Δεν υπάρχουν ακόμα μηνύματα. Γίνε ο πρώτος!";
    chatMessages.append(emptyState);
    return;
  }

  snapshot.forEach((doc) => {
    const msg = doc.data();
    const time = msg.createdAt ? msg.createdAt.toDate() : new Date();
    chatMessages.appendChild(createMessageElement(msg.user, msg.text, time));
  });
});

// 4. Render helpers

function renderRoster(listElement, players) {
  listElement.innerHTML = "";

  if (!players.length) {
    const li = document.createElement("li");
    li.textContent = "Δεν έχουν οριστεί ακόμα μέλη.";
    listElement.append(li);
    return;
  }

  players.forEach((name) => {
    const li = document.createElement("li");
    li.textContent = name;
    listElement.append(li);
  });
}

function renderMatches(matches) {
  matchesBody.innerHTML = "";

  if (!matches.length) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="6">Δεν υπάρχουν αγώνες ακόμα.</td>';
    matchesBody.append(row);
    return;
  }

  matches.forEach((match) => {
    const row = document.createElement("tr");
    const hasScore = Number.isInteger(match.hotScore) && Number.isInteger(match.flyScore);
    row.innerHTML = `
      <td>${new Date(match.date).toLocaleDateString("el-GR")}</td>
      <td>${match.time}</td>
      <td>${match.court}</td>
      <td>HotHeroes vs Ιπτάμενοι</td>
      <td>${hasScore ? `${match.hotScore} - ${match.flyScore}` : "-"}</td>
      <td><span class="status ${hasScore ? "done" : "upcoming"}">${hasScore ? "Completed" : "Upcoming"}</span></td>
    `;
    matchesBody.append(row);
  });
}

function renderMatchSelect(selectElement, matches) {
  selectElement.innerHTML = '<option value="">Επίλεξε αγώνα...</option>';
  matches.forEach((match) => {
    const option = document.createElement("option");
    option.value = match.id;
    option.textContent = `${match.date} ${match.time} • ${match.court}`;
    selectElement.append(option);
  });
}

function getBetStatus(match, bet) {
  const hasScore = match && Number.isInteger(match.hotScore) && Number.isInteger(match.flyScore);
  if (!hasScore) {
    return { label: "Σε αναμονή", className: "bet-pending", payout: null };
  }

  if (match.hotScore === match.flyScore) {
    return {
      label: "Επιστροφή",
      className: "bet-refund",
      payout: Number(bet.amount || 0).toFixed(2)
    };
  }

  const winner = match.hotScore > match.flyScore ? "HotHeroes" : "Ιπτάμενοι";
  const isWinner = bet.winner === winner;

  return {
    label: isWinner ? "Κέρδισε" : "Χάθηκε",
    className: isWinner ? "bet-won" : "bet-lost",
    payout: isWinner ? (Number(bet.amount || 0) * 2).toFixed(2) : "0.00"
  };
}

function renderBets(bets, matches) {
  betsList.innerHTML = "";

  if (!bets.length) {
    const item = document.createElement("li");
    item.className = "bet-item";
    item.textContent = "Δεν υπάρχουν στοιχήματα ακόμα.";
    betsList.append(item);
    return;
  }

  const matchesMap = new Map(matches.map((match) => [match.id, match]));

  bets.forEach((bet) => {
    const item = document.createElement("li");
    const relatedMatch = matchesMap.get(bet.matchId);
    const status = getBetStatus(relatedMatch, bet);
    const amount = Number(bet.amount || 0).toFixed(2);

    item.className = "bet-item";
    item.innerHTML = `
      <div class="bet-row">
        <strong>${bet.bettor}</strong>
        <span class="status ${status.className}">${status.label}</span>
      </div>
      <p>Πρόβλεψη: ${bet.winner} • Ποντάρισμα: €${amount}</p>
      <p>${status.payout === null ? "Περιμένει σκορ." : `Πληρωμή: €${status.payout}`}</p>
    `;

    betsList.append(item);
  });
}

function createMessageElement(user, text, date) {
  const item = document.createElement("li");
  item.className = "chat-item";
  item.innerHTML = `
    <div class="chat-item-header">
      <strong>${user}</strong>
      <time>${date.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}</time>
    </div>
    <p>${text}</p>
  `;
  return item;
}

// 5. Form events

playerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const team = document.getElementById("team-select").value;
  const playerNameInput = document.getElementById("player-name");
  const name = playerNameInput.value.trim();
  if (!name) return;

  await db.collection("siteData").doc("rosters").set(
    {
      [team]: firebase.firestore.FieldValue.arrayUnion(name)
    },
    { merge: true }
  );

  playerNameInput.value = "";
});

matchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const date = document.getElementById("match-date").value;
  const time = document.getElementById("match-time").value;
  const court = document.getElementById("match-court").value.trim();

  if (!date || !time || !court) return;

  await db.collection("matches").add({
    date,
    time,
    court,
    hotScore: null,
    flyScore: null
  });

  matchForm.reset();
});

scoreForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const matchId = matchSelect.value;
  const hotScore = parseInt(document.getElementById("score-hot").value, 10);
  const flyScore = parseInt(document.getElementById("score-fly").value, 10);

  if (!matchId || Number.isNaN(hotScore) || Number.isNaN(flyScore)) return;

  await db.collection("matches").doc(matchId).update({
    hotScore,
    flyScore
  });

  scoreForm.reset();
});

betForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const matchId = betMatchSelect.value;
  const bettor = document.getElementById("bettor-name").value.trim();
  const winner = document.getElementById("bet-winner").value;
  const amount = parseInt(document.getElementById("bet-amount").value, 10);

  if (!matchId || !bettor || Number.isNaN(amount) || amount < 1) return;

  await db.collection("bets").add({
    matchId,
    bettor,
    winner,
    amount,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  betForm.reset();
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const user = document.getElementById("username").value.trim();
  const text = document.getElementById("message").value.trim();

  if (!user || !text) return;

  await db.collection("messages").add({
    user,
    text,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  document.getElementById("message").value = "";
});

clearButton.addEventListener("click", async () => {
  const snapshot = await db.collection("messages").get();
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
});
