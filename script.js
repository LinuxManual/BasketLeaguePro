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

const LOCKED_USERNAME_KEY = "basketleaguepro-locked-username";

const state = {
  rosters: { HotHeroes: [], "Ιπτάμενοι": [] },
  matches: [],
  messages: [],
  moderation: { bannedUsers: [] }
};

const playerForm = document.getElementById("player-form");
const matchForm = document.getElementById("match-form");
const scoreForm = document.getElementById("score-form");
const hotHeroesList = document.getElementById("hotheroes-list");
const iptamenoiList = document.getElementById("iptamenoi-list");
const matchesBody = document.getElementById("matches-body");
const matchSelect = document.getElementById("match-select");
const chatForm = document.getElementById("chat-form");
const usernameInput = document.getElementById("username");
const messageInput = document.getElementById("message");
const chatMessages = document.getElementById("chat-messages");
const clearButton = document.getElementById("clear-chat");
const connectionStatus = document.getElementById("connection-status");
const adminLoginForm = document.getElementById("admin-login-form");
const adminCommandForm = document.getElementById("admin-command-form");
const adminStatus = document.getElementById("admin-status");

const CHAT_RESET_PASSWORD = window.CHAT_RESET_PASSWORD || "HotHeroes2026!";
const CHAT_ADMIN = window.CHAT_ADMIN || { username: "REDKNIGHT", code: "1964" };

let isAdmin = false;

function setStatus(text, ok = true) {
  connectionStatus.textContent = text;
  connectionStatus.classList.toggle("ok", ok);
  connectionStatus.classList.toggle("error", !ok);
}

function setAdminStatus(text, ok = true) {
  adminStatus.textContent = text;
  adminStatus.classList.toggle("ok", ok);
  adminStatus.classList.toggle("error", !ok);
}

function getLockedUsername() {
  return localStorage.getItem(LOCKED_USERNAME_KEY) || "";
}

function lockUsername(name) {
  localStorage.setItem(LOCKED_USERNAME_KEY, name);
  usernameInput.value = name;
  usernameInput.readOnly = true;
}

function hydrateLockedUsername() {
  const locked = getLockedUsername();
  if (!locked) return;
  usernameInput.value = locked;
  usernameInput.readOnly = true;
}

function currentUsername() {
  return usernameInput.value.trim();
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
const moderationRef = doc(db, "basketLeaguePro", "moderation");
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

let listenersReady = { rosters: false, matches: false, messages: false, moderation: false };
function markReady(key) {
  listenersReady[key] = true;
  if (Object.values(listenersReady).every(Boolean)) {
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

onSnapshot(moderationRef, (snap) => {
  const data = snap.data() || {};
  state.moderation = { bannedUsers: Array.isArray(data.bannedUsers) ? data.bannedUsers : [] };
  const me = currentUsername();
  if (me && state.moderation.bannedUsers.includes(me)) {
    setStatus("Ο λογαριασμός σου έχει γίνει ban από το chat ❌", false);
  }
  markReady("moderation");
}, (error) => setStatus(`Firebase moderation error ❌ (${error.message})`, false));

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
  let user = currentUsername();
  const text = messageInput.value.trim();
  if (!user || !text) return;

  const locked = getLockedUsername();
  if (!locked) {
    lockUsername(user);
  } else {
    user = locked;
  }

  if (state.moderation.bannedUsers.includes(user)) {
    setStatus("Είσαι ban από το chat και δεν μπορείς να στείλεις μήνυμα ❌", false);
    return;
  }

  await addDoc(messagesRef, { user, text, createdAt: Date.now() });
  messageInput.value = "";
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

adminLoginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const adminUser = document.getElementById("admin-username").value.trim();
  const adminCode = document.getElementById("admin-code").value.trim();

  if (adminUser === CHAT_ADMIN.username && adminCode === CHAT_ADMIN.code) {
    isAdmin = true;
    setAdminStatus("Admin login επιτυχές ✅", true);
    return;
  }

  isAdmin = false;
  setAdminStatus("Admin login αποτυχία ❌", false);
});

adminCommandForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isAdmin) {
    setAdminStatus("Πρώτα κάνε admin login ❌", false);
    return;
  }

  const commandInput = document.getElementById("admin-command");
  const raw = commandInput.value.trim();
  if (!raw) return;

  const [command, ...rest] = raw.split(/\s+/);
  const target = rest.join(" ").trim();
  const banned = [...state.moderation.bannedUsers];

  if (command === "/ban" && target) {
    if (!banned.includes(target)) banned.push(target);
    await setDoc(moderationRef, { bannedUsers: banned }, { merge: true });
    setAdminStatus(`User ${target} έγινε ban ✅`, true);
  } else if (command === "/unban" && target) {
    const next = banned.filter((name) => name !== target);
    await setDoc(moderationRef, { bannedUsers: next }, { merge: true });
    setAdminStatus(`User ${target} έγινε unban ✅`, true);
  } else if (command === "/clear") {
    const snap = await getDocs(messagesRef);
    const batch = writeBatch(db);
    snap.forEach((item) => batch.delete(item.ref));
    await batch.commit();
    setAdminStatus("Το chat καθαρίστηκε με admin command ✅", true);
  } else {
    setAdminStatus("Άγνωστη εντολή. Χρησιμοποίησε /ban USER, /unban USER, /clear ❌", false);
  }

  commandInput.value = "";
});

hydrateLockedUsername();
setAdminStatus("Admin commands: /ban USER, /unban USER, /clear", true);
