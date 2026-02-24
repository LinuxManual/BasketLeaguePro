let state = {
  rosters: { HotHeroes: [], "Ιπτάμενοι": [] },
  matches: [],
  messages: []
};

const API_BASE_KEY = "basketclash-api-base";

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

const apiConfigForm = document.getElementById("api-config-form");
const apiBaseInput = document.getElementById("api-base-url");
const connectionStatus = document.getElementById("connection-status");
const activeApiBase = document.getElementById("active-api-base");

function normalizeApiBase(input) {
  const raw = (input || "").trim();
  if (!raw) return window.location.origin;
  return raw.replace(/\/$/, "");
}

let apiBase = normalizeApiBase(localStorage.getItem(API_BASE_KEY) || window.location.origin);

function setStatus(text, ok = true) {
  connectionStatus.textContent = text;
  connectionStatus.classList.toggle("ok", ok);
  connectionStatus.classList.toggle("error", !ok);
  activeApiBase.textContent = apiBase;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(errorPayload.error || "Σφάλμα server");
  }

  return response.json();
}

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
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderAll() {
  renderRoster(hotHeroesList, state.rosters.HotHeroes || []);
  renderRoster(iptamenoiList, state.rosters["Ιπτάμενοι"] || []);
  renderMatches(state.matches || []);
  renderMatchSelect(state.matches || []);
  renderMessages(state.messages || []);
}

async function refreshState() {
  state = await apiRequest("/api/state", { method: "GET" });
  renderAll();
  setStatus("Συνδεδεμένο ✅", true);
}

apiConfigForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  apiBase = normalizeApiBase(apiBaseInput.value);
  localStorage.setItem(API_BASE_KEY, apiBase);
  try {
    await refreshState();
  } catch {
    setStatus("Δεν μπορεί να γίνει σύνδεση στον server ❌", false);
  }
});

playerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const team = document.getElementById("team-select").value;
  const playerName = document.getElementById("player-name");
  const name = playerName.value.trim();
  if (!name) return;
  state = await apiRequest("/api/players", { method: "POST", body: JSON.stringify({ team, name }) });
  playerName.value = "";
  renderAll();
});

matchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const date = document.getElementById("match-date").value;
  const time = document.getElementById("match-time").value;
  const court = document.getElementById("match-court").value.trim();
  if (!date || !time || !court) return;
  state = await apiRequest("/api/matches", { method: "POST", body: JSON.stringify({ date, time, court }) });
  matchForm.reset();
  renderAll();
});

scoreForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const matchId = matchSelect.value;
  const hotScore = Number.parseInt(document.getElementById("score-hot").value, 10);
  const flyScore = Number.parseInt(document.getElementById("score-fly").value, 10);
  if (!matchId || Number.isNaN(hotScore) || Number.isNaN(flyScore)) return;
  state = await apiRequest("/api/scores", { method: "POST", body: JSON.stringify({ matchId, hotScore, flyScore }) });
  scoreForm.reset();
  renderAll();
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const usernameInput = document.getElementById("username");
  const messageInput = document.getElementById("message");
  const user = usernameInput.value.trim();
  const text = messageInput.value.trim();
  if (!user || !text) return;
  state = await apiRequest("/api/chat", { method: "POST", body: JSON.stringify({ user, text }) });
  messageInput.value = "";
  renderAll();
});

clearButton.addEventListener("click", async () => {
  state = await apiRequest("/api/chat", { method: "DELETE" });
  renderAll();
});

setInterval(() => refreshState().catch(() => setStatus("Δεν μπορεί να γίνει σύνδεση στον server ❌", false)), 1500);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") refreshState().catch(() => setStatus("Δεν μπορεί να γίνει σύνδεση στον server ❌", false));
});
window.addEventListener("focus", () => refreshState().catch(() => setStatus("Δεν μπορεί να γίνει σύνδεση στον server ❌", false)));

apiBaseInput.value = apiBase;
activeApiBase.textContent = apiBase;
refreshState().catch(() => setStatus("Δεν μπορεί να γίνει σύνδεση στον server ❌", false));
