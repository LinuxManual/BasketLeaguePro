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
  arrayUnion,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const LOCKED_USERNAME_KEY = "basketleaguepro-locked-username";

const state = {
  rosters: { HotHeroes: [], "Ιπτάμενοι": [] },
  matches: [],
  messages: [],
  bets: [],
  playerStats: []
};

const playerForm = document.getElementById("player-form");
const matchForm = document.getElementById("match-form");
const scoreForm = document.getElementById("score-form");
const hotHeroesList = document.getElementById("hotheroes-list");
const iptamenoiList = document.getElementById("iptamenoi-list");
const matchesBody = document.getElementById("matches-body");
const matchSelect = document.getElementById("match-select");
const betForm = document.getElementById("bet-form");
const betMatchSelect = document.getElementById("bet-match-select");
const betsBody = document.getElementById("bets-body");
const playerStatsForm = document.getElementById("player-stats-form");
const statsPlayerSelect = document.getElementById("stats-player-select");
const chatForm = document.getElementById("chat-form");
const usernameInput = document.getElementById("username");
const messageInput = document.getElementById("message");
const chatSearchInput = document.getElementById("chat-search");
const chatCounter = document.getElementById("chat-counter");
const chatMessages = document.getElementById("chat-messages");
const clearButton = document.getElementById("clear-chat");
const connectionStatus = document.getElementById("connection-status");
const rankingList = document.getElementById("ranking-list");
const rankingWeightsForm = document.getElementById("ranking-weights-form");
const weightShots = document.getElementById("weight-shots");
const weightAssists = document.getElementById("weight-assists");
const weightRebounds = document.getElementById("weight-rebounds");
const weightBlocks = document.getElementById("weight-blocks");

const insTotal = document.getElementById("ins-total");
const insHotWins = document.getElementById("ins-hot-wins");
const insFlyWins = document.getElementById("ins-fly-wins");
const insAvgTotal = document.getElementById("ins-avg-total");

const CHAT_RESET_PASSWORD = window.CHAT_RESET_PASSWORD || "HotHeroes2026!";


const euroFormatter = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function setStatus(text, ok = true) {
  connectionStatus.textContent = text;
  connectionStatus.classList.toggle("ok", ok);
  connectionStatus.classList.toggle("error", !ok);
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
const betsRef = collection(db, "basketLeaguePro", "bets", "items");
const playerStatsRef = collection(db, "basketLeaguePro", "playerStats", "items");

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
  betMatchSelect.innerHTML = "";
  if (!matches.length) {
    const option = document.createElement("option");
    option.textContent = "Πρώτα πρόσθεσε αγώνα";
    option.value = "";
    matchSelect.append(option);
    betMatchSelect.append(option.cloneNode(true));
    return;
  }

  matches.forEach((match) => {
    const option = document.createElement("option");
    option.value = match.id;
    option.textContent = `${formatDate(match.date)} ${match.time} • ${match.court}`;
    matchSelect.append(option);
    betMatchSelect.append(option.cloneNode(true));
  });
}


function renderPlayerStatsSelect() {
  statsPlayerSelect.innerHTML = "";
  const allPlayers = [
    ...state.rosters.HotHeroes.map((name) => ({ name, team: "HotHeroes" })),
    ...state.rosters["Ιπτάμενοι"].map((name) => ({ name, team: "Ιπτάμενοι" }))
  ].sort((a, b) => a.name.localeCompare(b.name, "el"));

  if (!allPlayers.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Πρώτα πρόσθεσε μέλη";
    statsPlayerSelect.append(option);
    return;
  }

  allPlayers.forEach((player) => {
    const option = document.createElement("option");
    option.value = `${player.team}::${player.name}`;
    option.textContent = `${player.name} • ${player.team}`;
    statsPlayerSelect.append(option);
  });
}

function renderBets(matches, bets) {
  betsBody.innerHTML = "";
  if (!bets.length) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="5">Δεν υπάρχουν στοιχήματα ακόμα.</td>';
    betsBody.append(row);
    return;
  }

  const matchesById = new Map(matches.map((m) => [m.id, m]));
  const ordered = [...bets].sort((a, b) => b.createdAt - a.createdAt).slice(0, 150);
  ordered.forEach((bet) => {
    const match = matchesById.get(bet.matchId);
    const row = document.createElement("tr");
    const matchLabel = match
      ? `${formatDate(match.date)} ${match.time} • ${match.court}`
      : "Αγώνας που αφαιρέθηκε";

    let resultLabel = "Pending";
    let resultClass = "upcoming";
    if (match && Number.isInteger(match.hotScore) && Number.isInteger(match.flyScore)) {
      const correct = match.hotScore === bet.predHot && match.flyScore === bet.predFly;
      resultLabel = correct ? "Won" : "Lost";
      resultClass = correct ? "done" : "lost";
    }

    row.innerHTML = `
      <td>${matchLabel}</td>
      <td>${bet.user}</td>
      <td>${bet.predHot} - ${bet.predFly}</td>
      <td>${euroFormatter.format(Number(bet.stake) || 0)}</td>
      <td><span class="status ${resultClass}">${resultLabel}</span></td>
    `;
    betsBody.append(row);
  });
}

function renderInsights(matches) {
  insTotal.textContent = String(matches.length);
  let hotWins = 0;
  let flyWins = 0;
  let totalPoints = 0;
  let completed = 0;

  matches.forEach((m) => {
    const done = Number.isInteger(m.hotScore) && Number.isInteger(m.flyScore);
    if (!done) return;
    completed += 1;
    totalPoints += m.hotScore + m.flyScore;
    if (m.hotScore > m.flyScore) hotWins += 1;
    if (m.flyScore > m.hotScore) flyWins += 1;
  });

  insHotWins.textContent = String(hotWins);
  insFlyWins.textContent = String(flyWins);
  insAvgTotal.textContent = completed ? (totalPoints / completed).toFixed(1) : "0";
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


function calculatePlayerRankings() {
  const completedMatches = state.matches.filter((m) => Number.isInteger(m.hotScore) && Number.isInteger(m.flyScore));
  const hotWins = completedMatches.filter((m) => m.hotScore > m.flyScore).length;
  const flyWins = completedMatches.filter((m) => m.flyScore > m.hotScore).length;

  const weights = {
    shots: Math.max(0, Number.parseInt(weightShots.value, 10) || 0),
    assists: Math.max(0, Number.parseInt(weightAssists.value, 10) || 0),
    rebounds: Math.max(0, Number.parseInt(weightRebounds.value, 10) || 0),
    blocks: Math.max(0, Number.parseInt(weightBlocks.value, 10) || 0)
  };

  const statsByPlayer = new Map(state.playerStats.map((p) => [`${p.team}::${p.name}`, p]));
  const allPlayers = [
    ...state.rosters.HotHeroes.map((name) => ({ name, team: "HotHeroes" })),
    ...state.rosters["Ιπτάμενοι"].map((name) => ({ name, team: "Ιπτάμενοι" }))
  ];

  return allPlayers
    .map((player) => {
      const playerStats = statsByPlayer.get(`${player.team}::${player.name}`) || { shots: 0, assists: 0, rebounds: 0, blocks: 0 };
      const teamWins = player.team === "HotHeroes" ? hotWins : flyWins;
      const baseScore = 30 + teamWins * 3;
      const statsScore =
        playerStats.shots * weights.shots +
        playerStats.assists * weights.assists +
        playerStats.rebounds * weights.rebounds +
        playerStats.blocks * weights.blocks;
      const totalScore = baseScore + statsScore;
      return { ...player, score: totalScore, stats: playerStats };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "el"));
}

function renderRankings() {
  rankingList.innerHTML = "";
  const ranking = calculatePlayerRankings();

  if (!ranking.length) {
    const empty = document.createElement("li");
    empty.className = "ranking-item";
    empty.innerHTML = '<span class="rank-player"><strong>Δεν υπάρχουν παίκτες ακόμα</strong><span>Πρόσθεσε μέλη από το panel διαχείρισης για να εμφανιστεί η κατάταξη.</span></span>';
    rankingList.append(empty);
    return;
  }

  ranking.slice(0, 8).forEach((player, index) => {
    const item = document.createElement("li");
    item.className = `ranking-item ${index < 3 ? "top" : ""}`;
    item.innerHTML = `
      <span class="rank-number">${index + 1}</span>
      <span class="rank-player">
        <strong>${player.name}</strong>
        <span>${player.team} • S:${player.stats.shots} A:${player.stats.assists} R:${player.stats.rebounds} B:${player.stats.blocks}</span>
      </span>
      <span class="rank-score">${player.score} pts</span>
    `;
    rankingList.append(item);
  });
}

function renderMessages(messages) {
  const term = chatSearchInput.value.trim().toLowerCase();
  const filtered = term
    ? messages.filter((m) => m.user.toLowerCase().includes(term) || m.text.toLowerCase().includes(term))
    : messages;

  chatCounter.textContent = `${filtered.length} μηνύματα`;
  chatMessages.innerHTML = "";

  if (filtered.length === 0) {
    const emptyState = document.createElement("li");
    emptyState.className = "chat-item";
    emptyState.textContent = term ? "Δεν βρέθηκαν μηνύματα για αυτή την αναζήτηση." : "Δεν υπάρχουν ακόμα μηνύματα. Γίνε ο πρώτος!";
    chatMessages.append(emptyState);
    return;
  }

  filtered.forEach((message) => chatMessages.append(createMessageElement(message)));
}

function renderAll() {
  const orderedMatches = [...state.matches].sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
  const orderedMessages = [...state.messages].sort((a, b) => b.createdAt - a.createdAt).slice(0, 100);
  renderRoster(hotHeroesList, state.rosters.HotHeroes);
  renderRoster(iptamenoiList, state.rosters["Ιπτάμενοι"]);
  renderMatches(orderedMatches);
  renderMatchSelect(orderedMatches);
  renderPlayerStatsSelect();
  renderBets(orderedMatches, state.bets);
  renderInsights(orderedMatches);
  renderMessages(orderedMessages);
  renderRankings();
}

let listenersReady = { rosters: false, matches: false, messages: false, bets: false, playerStats: false };
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

onSnapshot(query(betsRef, orderBy("createdAt", "desc")), (snap) => {
  state.bets = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  markReady("bets");
  renderAll();
}, (error) => setStatus(`Firebase betting error ❌ (${error.message})`, false));

onSnapshot(playerStatsRef, (snap) => {
  state.playerStats = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  markReady("playerStats");
  renderAll();
}, (error) => setStatus(`Firebase player stats error ❌ (${error.message})`, false));

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

betForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const matchId = betMatchSelect.value;
  const user = document.getElementById("bet-user").value.trim();
  const predHot = Number.parseInt(document.getElementById("bet-hot").value, 10);
  const predFly = Number.parseInt(document.getElementById("bet-fly").value, 10);
  const stake = Number.parseFloat(document.getElementById("bet-stake").value);
  const normalizedStake = Number(stake.toFixed(2));

  if (!matchId || !user || Number.isNaN(predHot) || Number.isNaN(predFly) || Number.isNaN(stake) || normalizedStake <= 0) {
    return;
  }

  await addDoc(betsRef, { matchId, user, predHot, predFly, stake: normalizedStake, createdAt: Date.now() });
  betForm.reset();
});


playerStatsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const key = statsPlayerSelect.value;
  const shots = Number.parseInt(document.getElementById("stats-shots").value, 10) || 0;
  const assists = Number.parseInt(document.getElementById("stats-assists").value, 10) || 0;
  const rebounds = Number.parseInt(document.getElementById("stats-rebounds").value, 10) || 0;
  const blocks = Number.parseInt(document.getElementById("stats-blocks").value, 10) || 0;
  if (!key) return;

  const [team, name] = key.split("::");
  const existing = state.playerStats.find((item) => item.team === team && item.name === name);
  if (existing) {
    await updateDoc(doc(playerStatsRef, existing.id), {
      shots: increment(shots),
      assists: increment(assists),
      rebounds: increment(rebounds),
      blocks: increment(blocks)
    });
  } else {
    await addDoc(playerStatsRef, { team, name, shots, assists, rebounds, blocks, createdAt: Date.now() });
  }

  playerStatsForm.reset();
  ["stats-shots", "stats-assists", "stats-rebounds", "stats-blocks"].forEach((id) => {
    document.getElementById(id).value = 0;
  });
});

rankingWeightsForm.addEventListener("input", () => renderRankings());

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  let user = usernameInput.value.trim();
  const text = messageInput.value.trim();
  if (!user || !text) return;

  const locked = getLockedUsername();
  if (!locked) {
    lockUsername(user);
  } else {
    user = locked;
  }

  await addDoc(messagesRef, { user, text, createdAt: Date.now() });
  messageInput.value = "";
});

clearButton.addEventListener("click", async () => {
  const password = window.prompt("Βάλε κωδικό για καθαρισμό chat:");
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

chatSearchInput.addEventListener("input", () => renderAll());
hydrateLockedUsername();
