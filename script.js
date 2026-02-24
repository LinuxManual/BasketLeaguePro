// 1. Firebase Configuration (Χρησιμοποιώ τα στοιχεία που μου έδωσες)
const firebaseConfig = {
  apiKey: "AIzaSyBm5k1wF7-RaC8hEtTy2Phznxey0FnAcsU",
  authDomain: "basket-clash-7901c.firebaseapp.com",
  projectId: "basket-clash-7901c",
  storageBucket: "basket-clash-7901c.firebasestorage.app",
  messagingSenderId: "307971899685",
  appId: "1:307971899685:web:8143142e3fbe3526ef5acc",
  measurementId: "G-SDPWG5QT2N"
};

// Αρχικοποίηση Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 2. DOM Elements
const playerForm = document.getElementById("player-form");
const matchForm = document.getElementById("match-form");
const scoreForm = document.getElementById("score-form");
const hotHeroesList = document.getElementById("hotheroes-list");
const iptamenoiList = document.getElementById("iptamenoi-list");
const matchesBody = document.getElementById("matches-body");
const matchSelect = document.getElementById("match-select");
const chatForm = document.getElementById("chat-form");
const chatMessages = document.getElementById("chat-messages");
const clearButton = document.getElementById("clear-chat");

// --- 3. LIVE LISTENERS (Αυτόματη ενημέρωση από το Cloud) ---

// Παρακολούθηση Ρόστερ (Ομάδες)
db.collection("siteData").doc("rosters").onSnapshot((doc) => {
  if (doc.exists) {
    const data = doc.data();
    renderRoster(hotHeroesList, data.HotHeroes || []);
    renderRoster(iptamenoiList, data.Ιπτάμενοι || []);
  } else {
    renderRoster(hotHeroesList, []);
    renderRoster(iptamenoiList, []);
  }
});

// Παρακολούθηση Αγώνων
db.collection("matches").orderBy("date").onSnapshot((snapshot) => {
  const matches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderMatches(matches);
  renderMatchSelect(matches);
});

// Παρακολούθηση Chat (Real-time)
db.collection("messages").orderBy("createdAt", "desc").limit(50).onSnapshot((snapshot) => {
  chatMessages.innerHTML = "";
  if (snapshot.empty) {
    const emptyState = document.createElement("li");
    emptyState.className = "chat-item";
    emptyState.textContent = "Δεν υπάρχουν ακόμα μηνύματα. Γίνε ο πρώτος!";
    chatMessages.append(emptyState);
    return;
  }
  snapshot.forEach(doc => {
    const msg = doc.data();
    const time = msg.createdAt ? msg.createdAt.toDate() : new Date();
    chatMessages.appendChild(createMessageElement(msg.user, msg.text, time));
  });
});

// --- 4. ΣΥΝΑΡΤΗΣΕΙΣ RENDER (Οπτικοποίηση) ---

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
    const hasScore = match.hotScore !== null && match.flyScore !== null;
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

function renderMatchSelect(matches) {
  matchSelect.innerHTML = '<option value="">Επίλεξε αγώνα...</option>';
  matches.forEach((match) => {
    const option = document.createElement("option");
    option.value = match.id;
    option.textContent = `${match.date} ${match.time} • ${match.court}`;
    matchSelect.append(option);
  });
}

function createMessageElement(user, text, date) {
  const item = document.createElement("li");
  item.className = "chat-item";
  item.innerHTML = `
    <div class="chat-item-header">
      <strong>${user}</strong>
      <time>${date.toLocaleTimeString("el-GR", { hour: '2-digit', minute: '2-digit' })}</time>
    </div>
    <p>${text}</p>
  `;
  return item;
}

// --- 5. EVENT LISTENERS (Αποστολή Δεδομένων στη Database) ---

// Προσθήκη Παίκτη
playerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const team = document.getElementById("team-select").value;
  const playerNameInput = document.getElementById("player-name");
  const name = playerNameInput.value.trim();
  if (!name) return;

  await db.collection("siteData").doc("rosters").set({
    [team]: firebase.firestore.FieldValue.arrayUnion(name)
  }, { merge: true });

  playerNameInput.value = "";
});

// Δημιουργία Αγώνα
matchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const date = document.getElementById("match-date").value;
  const time = document.getElementById("match-time").value;
  const court = document.getElementById("match-court").value.trim();

  await db.collection("matches").add({
    date,
    time,
    court,
    hotScore: null,
    flyScore: null
  });

  matchForm.reset();
});

// Καταχώρηση Σκορ
scoreForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const matchId = matchSelect.value;
  const hotScore = parseInt(document.getElementById("score-hot").value);
  const flyScore = parseInt(document.getElementById("score-fly").value);

  if (!matchId) return;

  await db.collection("matches").doc(matchId).update({
    hotScore: hotScore,
    flyScore: flyScore
  });

  scoreForm.reset();
});

// Αποστολή Μηνύματος στο Chat
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

// Καθαρισμός Chat (Προσοχή: Διαγράφει τα μηνύματα από τη βάση!)
clearButton.addEventListener("click", async () => {
  const snapshot = await db.collection("messages").get();
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
});
