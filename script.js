const CHAT_KEY = "basketclash-chat-messages";
const DATA_KEY = "basketclash-site-data";

const DEFAULT_DATA = {
  rosters: {
    HotHeroes: [],
    "Ιπτάμενοι": []
  },
  matches: []
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

function loadSiteData() {
  const saved = localStorage.getItem(DATA_KEY);
  if (!saved) return structuredClone(DEFAULT_DATA);

  try {
    const parsed = JSON.parse(saved);
    return {
      rosters: {
        HotHeroes: Array.isArray(parsed?.rosters?.HotHeroes) ? parsed.rosters.HotHeroes : [],
        "Ιπτάμενοι": Array.isArray(parsed?.rosters?.["Ιπτάμενοι"]) ? parsed.rosters["Ιπτάμενοι"] : []
      },
      matches: Array.isArray(parsed?.matches) ? parsed.matches : []
    };
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

function saveSiteData(data) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
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

function formatDate(dateValue) {
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString("el-GR");
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

function renderSiteData() {
  const data = loadSiteData();
  renderRoster(hotHeroesList, data.rosters.HotHeroes);
  renderRoster(iptamenoiList, data.rosters["Ιπτάμενοι"]);
  renderMatches(data.matches);
  renderMatchSelect(data.matches);
}

playerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const team = document.getElementById("team-select").value;
  const playerName = document.getElementById("player-name");
  const name = playerName.value.trim();
  if (!name) return;

  const data = loadSiteData();
  data.rosters[team].push(name);
  saveSiteData(data);
  playerName.value = "";
  renderSiteData();
});

matchForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const date = document.getElementById("match-date").value;
  const time = document.getElementById("match-time").value;
  const courtInput = document.getElementById("match-court");
  const court = courtInput.value.trim();

  if (!date || !time || !court) return;

  const data = loadSiteData();
  data.matches.push({
    id: crypto.randomUUID(),
    date,
    time,
    court,
    hotScore: null,
    flyScore: null
  });

  data.matches.sort((a, b) => {
    const aDate = new Date(`${a.date}T${a.time}`);
    const bDate = new Date(`${b.date}T${b.time}`);
    return aDate - bDate;
  });

  saveSiteData(data);
  matchForm.reset();
  renderSiteData();
});

scoreForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const matchId = matchSelect.value;
  const hotScore = Number.parseInt(document.getElementById("score-hot").value, 10);
  const flyScore = Number.parseInt(document.getElementById("score-fly").value, 10);

  if (!matchId || Number.isNaN(hotScore) || Number.isNaN(flyScore)) return;

  const data = loadSiteData();
  const match = data.matches.find((item) => item.id === matchId);
  if (!match) return;

  match.hotScore = hotScore;
  match.flyScore = flyScore;

  saveSiteData(data);
  scoreForm.reset();
  renderSiteData();
});

function loadMessages() {
  const saved = localStorage.getItem(CHAT_KEY);
  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMessages(messages) {
  localStorage.setItem(CHAT_KEY, JSON.stringify(messages));
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

function renderMessages() {
  const messages = loadMessages();
  chatMessages.innerHTML = "";

  if (messages.length === 0) {
    const emptyState = document.createElement("li");
    emptyState.className = "chat-item";
    emptyState.textContent = "Δεν υπάρχουν ακόμα μηνύματα. Γίνε ο πρώτος!";
    chatMessages.append(emptyState);
    return;
  }

  messages.forEach((message) => {
    chatMessages.append(createMessageElement(message));
  });

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const usernameInput = document.getElementById("username");
  const messageInput = document.getElementById("message");

  const user = usernameInput.value.trim();
  const text = messageInput.value.trim();

  if (!user || !text) {
    return;
  }

  const messages = loadMessages();
  messages.unshift({
    user,
    text,
    createdAt: Date.now()
  });

  const MAX_MESSAGES = 100;
  saveMessages(messages.slice(0, MAX_MESSAGES));

  messageInput.value = "";
  renderMessages();
});

clearButton.addEventListener("click", () => {
  localStorage.removeItem(CHAT_KEY);
  renderMessages();
});

renderSiteData();
renderMessages();
