import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAnalytics, isSupported as analyticsSupported } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js";
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  writeBatch,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const state = {
  rosters: { HotHeroes: [], "Ιπτάμενοι": [] },
  matches: [],
  messages: []
};

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
const connectionStatus = document.getElementById("connection-status");

const CHAT_RESET_PASSWORD = window.CHAT_RESET_PASSWORD || "HotHeroes2026!";

function setStatus(text, ok = true) {
  connectionStatus.textContent = text;
  connectionStatus.classList.toggle("ok", ok);
  connectionStatus.classList.toggle("error", !ok);
}

const firebaseConfig = window.FIREBASE_CONFIG;
if (!firebaseConfig?.apiKey || !firebaseConfig?.projectId || !firebaseConfig?.appId) {
  setStatus("Λείπει το Firebase config. Συμπλήρωσε το στο index.html ❌", false);
  throw new Error("Missing FIREBASE_CONFIG");
}

const app = initializeApp(firebaseConfig);
analyticsSupported().then((ok) => {
  if (ok) getAnalytics(app);
}).catch(() => {});

const db = getFirestore(app);
const rostersRef = doc(db, "basketLeaguePro", "rosters");
const matchesRef = collection(db, "basketLeaguePro", "matches", "items");
const messagesRef = collection(db, "basketLeaguePro", "messages", "items");

function formatDate(dateValue) {
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString("el-GR");
}

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
      <td>${formatDate(match.date)}</td>
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
  matchSelect.innerHTML = "";
  if (!matches.length) {
    const option = document.createElement("option");
    option.textContent = "Πρώτα πρόσθεσε αγώνα";
    option.value = "";
    matchSelect.append(option);
    return;
  }

  matches.forEach((match) => {
    const option = document.createElement("option");
    option.value = match.id;
    option.textContent = `${formatDate(match.date)} ${match.time} • ${match.court}`;
    matchSelect.append(option);
  });
}

function createMessageElement(message) {
  const item = document.createElement("li");
  item.className = "chat-item";
  const header = document.createElement("div");
  header.className = "chat-item-header";
  const author = document.createElement("strong");
  author.textContent = message.user;
  const timestamp = document.createElement("time");
  timestamp.textContent = new Date(message.createdAt).toLocaleString("el-GR", {
    dateStyle: "short",
    timeStyle: "short"
  });
  const text = document.createElement("p");
  text.textContent = message.text;
  header.append(author, timestamp);
  item.append(header, text);
  return item;
}

function renderMessages(messages) {
  chatMessages.innerHTML = "";
  if (messages.length === 0) {
    const emptyState = document.createElement("li");
    emptyState.className = "chat-item";
    emptyState.textContent = "Δεν υπάρχουν ακόμα μηνύματα. Γίνε ο πρώτος!";
    chatMessages.append(emptyState);
    return;
  }
  messages.forEach((message) => chatMessages.append(createMessageElement(message)));
}

function renderAll() {
  const orderedMatches = [...state.matches].sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
  const orderedMessages = [...state.messages].sort((a, b) => b.createdAt - a.createdAt).slice(0, 100);
  renderRoster(hotHeroesList, state.rosters.HotHeroes);
  renderRoster(iptamenoiList, state.rosters["Ιπτάμενοι"]);
  renderMatches(orderedMatches);
  renderMatchSelect(orderedMatches);
  renderMessages(orderedMessages);
}

let listenersReady = { rosters: false, matches: false, messages: false };
function markReady(key) {
  listenersReady[key] = true;
  if (listenersReady.rosters && listenersReady.matches && listenersReady.messages) {
    setStatus("Συνδεδεμένο με Firebase ✅", true);
  }
}

onSnapshot(rostersRef, (snap) => {
  const data = snap.data() || {};
  state.rosters = {
    HotHeroes: Array.isArray(data.HotHeroes) ? data.HotHeroes : [],
    "Ιπτάμενοι": Array.isArray(data["Ιπτάμενοι"]) ? data["Ιπτάμενοι"] : []
  };
  markReady("rosters");
  renderAll();
}, (error) => setStatus(`Firebase rosters error ❌ (${error.message})`, false));

onSnapshot(matchesRef, (snap) => {
  state.matches = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  markReady("matches");
  renderAll();
}, (error) => setStatus(`Firebase matches error ❌ (${error.message})`, false));

onSnapshot(query(messagesRef, orderBy("createdAt", "desc")), (snap) => {
  state.messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  markReady("messages");
  renderAll();
}, (error) => setStatus(`Firebase chat error ❌ (${error.message})`, false));

playerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const team = document.getElementById("team-select").value;
  const input = document.getElementById("player-name");
  const name = input.value.trim();
  if (!name) return;

  await setDoc(rostersRef, { [team]: arrayUnion(name) }, { merge: true });
  input.value = "";
});

matchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const date = document.getElementById("match-date").value;
  const time = document.getElementById("match-time").value;
  const court = document.getElementById("match-court").value.trim();
  if (!date || !time || !court) return;

  await addDoc(matchesRef, { date, time, court, hotScore: null, flyScore: null, createdAt: Date.now() });
  matchForm.reset();
});

scoreForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const matchId = matchSelect.value;
  const hotScore = Number.parseInt(document.getElementById("score-hot").value, 10);
  const flyScore = Number.parseInt(document.getElementById("score-fly").value, 10);
  if (!matchId || Number.isNaN(hotScore) || Number.isNaN(flyScore)) return;

  await updateDoc(doc(matchesRef, matchId), { hotScore, flyScore });
  scoreForm.reset();
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const user = document.getElementById("username").value.trim();
  const text = document.getElementById("message").value.trim();
  if (!user || !text) return;

  await addDoc(messagesRef, { user, text, createdAt: Date.now() });
  document.getElementById("message").value = "";
});

clearButton.addEventListener("click", async () => {
  const password = window.prompt("Βάλε admin κωδικό για καθαρισμό chat:");
  if (password === null) return;

  if (password !== CHAT_RESET_PASSWORD) {
    setStatus("Λάθος κωδικός καθαρισμού chat ❌", false);
    return;
  }

  const ok = window.confirm("Είσαι σίγουρος ότι θέλεις να διαγράψεις όλα τα μηνύματα;");
  if (!ok) return;

  const snap = await getDocs(messagesRef);
  const batch = writeBatch(db);
  snap.forEach((item) => batch.delete(item.ref));
  await batch.commit();
  setStatus("Το chat καθαρίστηκε επιτυχώς ✅", true);
});
