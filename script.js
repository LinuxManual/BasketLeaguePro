// 1. Το δικό σου Firebase Configuration [Ανανεωμένο]
const firebaseConfig = {
  apiKey: "AIzaSyBm5k1wF7-RaC8hEtTy2Phznxey0FnAcsU",
  authDomain: "basket-clash-7901c.firebaseapp.com",
  projectId: "basket-clash-7901c",
  storageBucket: "basket-clash-7901c.firebasestorage.app",
  messagingSenderId: "307971899685",
  appId: "1:307971899685:web:8143142e3fbe3526ef5acc",
  measurementId: "G-SDPWG5QT2N"
};

// Αρχικοποίηση Firebase (Compat mode για ευκολία)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 2. DOM Elements
const hotHeroesList = document.getElementById("hotheroes-list");
const iptamenoiList = document.getElementById("iptamenoi-list");
const matchesBody = document.getElementById("matches-body");
const matchSelect = document.getElementById("match-select");
const chatMessages = document.getElementById("chat-messages");

// --- LIVE LISTENERS (Αυτόματη ενημέρωση από Cloud) ---

// Ρόστερ Ομάδων
db.collection("siteData").doc("rosters").onSnapshot((doc) => {
  if (doc.exists) {
    const data = doc.data();
    renderRoster(hotHeroesList, data.HotHeroes || []);
    renderRoster(iptamenoiList, data.Ιπτάμενοι || []);
  }
});

// Αγώνες
db.collection("matches").orderBy("date").onSnapshot((snapshot) => {
  const matches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderMatches(matches);
  renderMatchSelect(matches);
});

// Chat (Τελευταία 50 μηνύματα)
db.collection("messages").orderBy("createdAt", "desc").limit(50).onSnapshot((snapshot) => {
  chatMessages.innerHTML = "";
  snapshot.forEach(doc => {
    const msg = doc.data();
    const time = msg.createdAt ? msg.createdAt.toDate() : new Date();
    chatMessages.appendChild(createMessageElement(msg.user, msg.text, time));
  });
});

// --- ΣΥΝΑΡΤΗΣΕΙΣ RENDER ---

function renderRoster(el, players) {
  el.innerHTML = players.length ? "" : "<li>Κανένας παίκτης ακόμα.</li>";
  players.forEach(p => {
    const li = document.createElement("li");
    li.textContent = p;
    el.appendChild(li);
  });
}

function renderMatches(matches) {
  matchesBody.innerHTML = matches.length ? "" : '<tr><td colspan="6">Δεν βρέθηκαν αγώνες.</td></tr>';
  matches.forEach(m => {
    const hasScore = m.hotScore !== null && m.flyScore !== null;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.date}</td><td>${m.time}</td><td>${m.court}</td>
      <td>HotHeroes vs Ιπτάμενοι</td>
      <td>${hasScore ? `${m.hotScore} - ${m.flyScore}` : "-"}</td>
      <td><span class="status ${hasScore ? 'done' : 'upcoming'}">${hasScore ? 'Completed' : 'Upcoming'}</span></td>
    `;
    matchesBody.appendChild(tr);
  });
}

function renderMatchSelect(matches) {
  matchSelect.innerHTML = '<option value="">Επίλεξε αγώνα...</option>';
  matches.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = `${m.date} - ${m.court}`;
    matchSelect.appendChild(opt);
  });
}

function createMessageElement(user, text, date) {
  const li = document.createElement("li");
  li.className = "chat-item";
  li.innerHTML = `
    <div class="chat-item-header"><strong>${user}</strong> <time>${date.toLocaleTimeString('el-GR')}</time></div>
    <p>${text}</p>
  `;
  return li;
}

// --- FORMS (Αποστολή στη Database) ---

document.getElementById("player-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const team = document.getElementById("team-select").value;
  const name = document.getElementById("player-name").value.trim();
  await db.collection("siteData").doc("rosters").set({
    [team]: firebase.firestore.FieldValue.arrayUnion(name)
  }, { merge: true });
  e.target.reset();
});

document.getElementById("match-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  await db.collection("matches").add({
    date: document.getElementById("match-date").value,
    time: document.getElementById("match-time").value,
    court: document.getElementById("match-court").value,
    hotScore: null, flyScore: null
  });
  e.target.reset();
});

document.getElementById("score-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = matchSelect.value;
  if(!id) return;
  await db.collection("matches").doc(id).update({
    hotScore: Number(document.getElementById("score-hot").value),
    flyScore: Number(document.getElementById("score-fly").value)
  });
  e.target.reset();
});

document.getElementById("chat-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = document.getElementById("username").value;
  const text = document.getElementById("message").value;
  await db.collection("messages").add({
    user, text, createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  document.getElementById("message").value = "";
});
