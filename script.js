const TEAM_HOT = "HotHeroes";
const TEAM_FLY = "Ιπτάμενοι";
const LEGACY_TEAM_FLY = "Ξ™Ο€Ο„Ξ¬ΞΌΞµΞ½ΞΏΞΉ";
const TEAMS = [TEAM_HOT, TEAM_FLY];
const STORAGE_KEY = "basketleaguepro:v4";
const USE_STATIC_STORE = location.hostname.endsWith("github.io");

const els = {
  insights: document.getElementById("insights"),
  standingsBody: document.getElementById("standings-body"),
  leaderPill: document.getElementById("leader-pill"),
  rosterCount: document.getElementById("roster-count"),
  hotList: document.getElementById("hot-list"),
  flyList: document.getElementById("fly-list"),
  hotCount: document.getElementById("hot-count"),
  flyCount: document.getElementById("fly-count"),
  matchesBody: document.getElementById("matches-body"),
  matchId: document.getElementById("match-id"),
  messages: document.getElementById("messages"),
  toast: document.getElementById("toast"),
  refresh: document.getElementById("refresh")
};

let state = normalizeState();
let activeFilter = "all";
let toastTimer;

function normalizeState(next = {}) {
  const rosters = next.rosters || {};
  const flyRoster = rosters[TEAM_FLY] || rosters[LEGACY_TEAM_FLY] || [];
  return {
    rosters: {
      [TEAM_HOT]: Array.isArray(rosters[TEAM_HOT]) ? rosters[TEAM_HOT] : [],
      [TEAM_FLY]: Array.isArray(flyRoster) ? flyRoster : []
    },
    matches: Array.isArray(next.matches) ? next.matches : [],
    messages: Array.isArray(next.messages) ? next.messages : []
  };
}

async function api(path, options = {}) {
  if (USE_STATIC_STORE) return localApi(path, options);

  try {
    const response = await fetch(`/api/${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options
    });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return localApi(path, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 404) return localApi(path, options);
      throw new Error(payload.error || "Request failed");
    }
    return payload;
  } catch (error) {
    if (error instanceof TypeError) return localApi(path, options);
    throw error;
  }
}

function readLocalStore() {
  try {
    return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"));
  } catch {
    return normalizeState();
  }
}

function writeLocalStore(nextState) {
  const normalized = normalizeState(nextState);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

function parseBody(options) {
  if (!options.body) return {};
  try {
    return JSON.parse(options.body);
  } catch {
    throw new Error("Invalid JSON");
  }
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeText(value, maxLength) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function localApi(path, options = {}) {
  const method = options.method || "GET";
  const body = parseBody(options);
  const store = readLocalStore();

  if (path === "state" && method === "GET") return Promise.resolve(store);

  if (path === "players" && method === "POST") {
    const team = body.team;
    const name = normalizeText(body.name, 80);
    if (!TEAMS.includes(team) || !name) throw new Error("Invalid player payload");
    const exists = store.rosters[team].some((item) => item.toLocaleLowerCase("el-GR") === name.toLocaleLowerCase("el-GR"));
    if (!exists) store.rosters[team].push(name);
    return Promise.resolve(writeLocalStore(store));
  }

  if (path === "players" && method === "DELETE") {
    const team = body.team;
    const name = normalizeText(body.name, 80);
    if (!TEAMS.includes(team) || !name) throw new Error("Invalid player payload");
    store.rosters[team] = store.rosters[team].filter((item) => item.toLocaleLowerCase("el-GR") !== name.toLocaleLowerCase("el-GR"));
    return Promise.resolve(writeLocalStore(store));
  }

  if (path === "matches" && method === "POST") {
    const date = normalizeText(body.date, 10);
    const time = normalizeText(body.time, 5);
    const court = normalizeText(body.court, 80);
    if (!date || !time || !court) throw new Error("Invalid match payload");
    store.matches.push({ id: createId(), date, time, court, hotScore: null, flyScore: null });
    store.matches.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
    return Promise.resolve(writeLocalStore(store));
  }

  if (path === "matches" && method === "DELETE") {
    const matchId = String(body.matchId || "");
    store.matches = store.matches.filter((item) => item.id !== matchId);
    return Promise.resolve(writeLocalStore(store));
  }

  if (path === "scores" && method === "POST") {
    const matchId = String(body.matchId || "");
    const hotScore = Number.parseInt(body.hotScore, 10);
    const flyScore = Number.parseInt(body.flyScore, 10);
    const match = store.matches.find((item) => item.id === matchId);
    if (!match || Number.isNaN(hotScore) || Number.isNaN(flyScore) || hotScore < 0 || flyScore < 0) {
      throw new Error("Invalid score payload");
    }
    match.hotScore = hotScore;
    match.flyScore = flyScore;
    return Promise.resolve(writeLocalStore(store));
  }

  if (path === "chat" && method === "POST") {
    const user = normalizeText(body.user, 80);
    const text = normalizeText(body.text, 500);
    if (!user || !text) throw new Error("Invalid chat payload");
    store.messages.unshift({ user, text, createdAt: Date.now() });
    store.messages = store.messages.slice(0, 100);
    return Promise.resolve(writeLocalStore(store));
  }

  if (path === "chat" && method === "DELETE") {
    store.messages = [];
    return Promise.resolve(writeLocalStore(store));
  }

  if (path === "health" && method === "GET") return Promise.resolve({ ok: true, version: "4.0.0", mode: "static" });
  throw new Error("Method or endpoint not allowed");
}

function createNode(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.attrs) {
    Object.entries(options.attrs).forEach(([name, value]) => {
      if (value !== undefined && value !== null) node.setAttribute(name, value);
    });
  }
  children.forEach((child) => node.append(child));
  return node;
}

function isCompleted(match) {
  return Number.isInteger(match.hotScore) && Number.isInteger(match.flyScore);
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("el-GR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatDateTime(value) {
  return new Date(value).toLocaleString("el-GR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => els.toast.classList.remove("is-visible"), 2600);
}

function setBusy(form, busy) {
  const controls = form.querySelectorAll("button, input, select, textarea");
  controls.forEach((control) => {
    control.disabled = busy;
  });
}

function buildStandings(matches) {
  const table = Object.fromEntries(
    TEAMS.map((team) => [
      team,
      {
        team,
        played: 0,
        wins: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        diff: 0
      }
    ])
  );

  matches.filter(isCompleted).forEach((match) => {
    const hotWon = match.hotScore > match.flyScore;
    const flyWon = match.flyScore > match.hotScore;
    table[TEAM_HOT].played += 1;
    table[TEAM_FLY].played += 1;
    table[TEAM_HOT].wins += hotWon ? 1 : 0;
    table[TEAM_FLY].wins += flyWon ? 1 : 0;
    table[TEAM_HOT].pointsFor += match.hotScore;
    table[TEAM_HOT].pointsAgainst += match.flyScore;
    table[TEAM_FLY].pointsFor += match.flyScore;
    table[TEAM_FLY].pointsAgainst += match.hotScore;
  });

  Object.values(table).forEach((row) => {
    row.diff = row.pointsFor - row.pointsAgainst;
  });

  return Object.values(table).sort((a, b) => b.wins - a.wins || b.diff - a.diff || b.pointsFor - a.pointsFor);
}

function renderMetrics() {
  const completed = state.matches.filter(isCompleted);
  const upcoming = state.matches.length - completed.length;
  const totalPlayers = TEAMS.reduce((sum, team) => sum + state.rosters[team].length, 0);
  const avgPoints = completed.length
    ? Math.round(completed.reduce((sum, match) => sum + match.hotScore + match.flyScore, 0) / completed.length)
    : 0;

  const metrics = [
    ["Αγώνες", state.matches.length],
    ["Τελικοί", completed.length],
    ["Επόμενοι", upcoming],
    ["Παίκτες", totalPlayers],
    ["Μ.Ο. πόντων", avgPoints]
  ];

  els.insights.replaceChildren(
    ...metrics.map(([label, value]) =>
      createNode("div", { className: "metric" }, [
        createNode("span", { text: label }),
        createNode("b", { text: String(value) })
      ])
    )
  );
}

function renderStandings() {
  const standings = buildStandings(state.matches);
  const leader = standings[0];
  els.leaderPill.textContent = leader && leader.wins ? `Leader: ${leader.team}` : "Season open";
  els.standingsBody.replaceChildren(
    ...standings.map((row) =>
      createNode("tr", {}, [
        createNode("td", { text: row.team }),
        createNode("td", { text: String(row.played) }),
        createNode("td", { text: String(row.wins) }),
        createNode("td", { text: `${row.pointsFor}-${row.pointsAgainst}` }),
        createNode("td", { text: row.diff > 0 ? `+${row.diff}` : String(row.diff) })
      ])
    )
  );
}

function renderRosterList(list, team) {
  const players = state.rosters[team];
  if (!players.length) {
    list.replaceChildren(createNode("li", { className: "empty-state", text: "Δεν έχουν προστεθεί παίκτες." }));
    return;
  }

  list.replaceChildren(
    ...players.map((player) =>
      createNode("li", {}, [
        createNode("div", { className: "player-row" }, [
          createNode("span", { text: player }),
          createNode("button", {
            className: "icon-button",
            text: "×",
            attrs: {
              type: "button",
              title: "Αφαίρεση παίκτη",
              "aria-label": `Αφαίρεση ${player}`,
              "data-action": "delete-player",
              "data-team": team,
              "data-name": player
            }
          })
        ])
      ])
    )
  );
}

function renderRosters() {
  const hotTotal = state.rosters[TEAM_HOT].length;
  const flyTotal = state.rosters[TEAM_FLY].length;
  els.hotCount.textContent = String(hotTotal);
  els.flyCount.textContent = String(flyTotal);
  els.rosterCount.textContent = `${hotTotal + flyTotal} παίκτες`;
  renderRosterList(els.hotList, TEAM_HOT);
  renderRosterList(els.flyList, TEAM_FLY);
}

function getFilteredMatches() {
  return state.matches.filter((match) => {
    if (activeFilter === "completed") return isCompleted(match);
    if (activeFilter === "upcoming") return !isCompleted(match);
    return true;
  });
}

function renderMatchOptions() {
  const openMatches = state.matches.filter((match) => !isCompleted(match));
  const options = openMatches.length ? openMatches : state.matches;
  if (!options.length) {
    els.matchId.replaceChildren(createNode("option", { text: "Δεν υπάρχει αγώνας", attrs: { value: "" } }));
    return;
  }

  els.matchId.replaceChildren(
    ...options.map((match) =>
      createNode("option", {
        text: `${formatDate(match.date)} ${match.time} - ${match.court}`,
        attrs: { value: match.id }
      })
    )
  );
}

function renderMatches() {
  const matches = getFilteredMatches();
  if (!matches.length) {
    els.matchesBody.replaceChildren(
      createNode("tr", {}, [createNode("td", { className: "empty-state", text: "Δεν υπάρχουν αγώνες για αυτό το φίλτρο.", attrs: { colspan: "6" } })])
    );
    renderMatchOptions();
    return;
  }

  els.matchesBody.replaceChildren(
    ...matches.map((match) => {
      const completed = isCompleted(match);
      const score = completed ? `${match.hotScore}-${match.flyScore}` : "-";
      return createNode("tr", {}, [
        createNode("td", { text: formatDate(match.date) }),
        createNode("td", { text: match.time }),
        createNode("td", { text: match.court }),
        createNode("td", { text: score }),
        createNode("td", {}, [
          createNode("span", {
            className: `status ${completed ? "completed" : "upcoming"}`,
            text: completed ? "Τελικός" : "Επόμενος"
          })
        ]),
        createNode("td", {}, [
          createNode("button", {
            className: "icon-button",
            text: "×",
            attrs: {
              type: "button",
              title: "Διαγραφή αγώνα",
              "aria-label": "Διαγραφή αγώνα",
              "data-action": "delete-match",
              "data-match-id": match.id
            }
          })
        ])
      ]);
    })
  );
  renderMatchOptions();
}

function renderMessages() {
  if (!state.messages.length) {
    els.messages.replaceChildren(createNode("li", { className: "empty-state", text: "Δεν υπάρχουν μηνύματα." }));
    return;
  }

  els.messages.replaceChildren(
    ...state.messages.map((message) =>
      createNode("li", {}, [
        createNode("div", { className: "message-header" }, [
          createNode("b", { text: message.user }),
          createNode("time", { text: formatDateTime(message.createdAt), attrs: { datetime: new Date(message.createdAt).toISOString() } })
        ]),
        createNode("p", { className: "message-text", text: message.text })
      ])
    )
  );
}

function render() {
  renderMetrics();
  renderStandings();
  renderRosters();
  renderMatches();
  renderMessages();
}

async function refresh(silent = false) {
  try {
    state = normalizeState(await api("state"));
    render();
    if (!silent) showToast("Το dashboard ενημερώθηκε.");
  } catch (error) {
    showToast(error.message);
  }
}

async function handleSubmit(form, callback, successMessage) {
  setBusy(form, true);
  try {
    state = normalizeState(await callback());
    form.reset();
    render();
    showToast(successMessage);
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(form, false);
  }
}

document.getElementById("player-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  handleSubmit(
    form,
    () =>
      api("players", {
        method: "POST",
        body: JSON.stringify({
          team: document.getElementById("team").value,
          name: document.getElementById("player").value
        })
      }),
    "Ο παίκτης προστέθηκε."
  );
});

document.getElementById("match-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  handleSubmit(
    form,
    () =>
      api("matches", {
        method: "POST",
        body: JSON.stringify({
          date: document.getElementById("date").value,
          time: document.getElementById("time").value,
          court: document.getElementById("court").value
        })
      }),
    "Ο αγώνας δημιουργήθηκε."
  );
});

document.getElementById("score-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  handleSubmit(
    form,
    () =>
      api("scores", {
        method: "POST",
        body: JSON.stringify({
          matchId: els.matchId.value,
          hotScore: document.getElementById("hot").value,
          flyScore: document.getElementById("fly").value
        })
      }),
    "Το σκορ αποθηκεύτηκε."
  );
});

document.getElementById("chat-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  handleSubmit(
    form,
    () =>
      api("chat", {
        method: "POST",
        body: JSON.stringify({
          user: document.getElementById("user").value,
          text: document.getElementById("text").value
        })
      }),
    "Το μήνυμα στάλθηκε."
  );
});

document.getElementById("clear-chat").addEventListener("click", async () => {
  try {
    state = normalizeState(await api("chat", { method: "DELETE" }));
    render();
    showToast("Το chat καθαρίστηκε.");
  } catch (error) {
    showToast(error.message);
  }
});

document.querySelector(".segmented").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-filter]");
  if (!button) return;
  activeFilter = button.dataset.filter;
  document.querySelectorAll(".segmented button").forEach((item) => item.classList.toggle("is-active", item === button));
  renderMatches();
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  try {
    if (button.dataset.action === "delete-player") {
      state = normalizeState(
        await api("players", {
          method: "DELETE",
          body: JSON.stringify({ team: button.dataset.team, name: button.dataset.name })
        })
      );
      showToast("Ο παίκτης αφαιρέθηκε.");
    }

    if (button.dataset.action === "delete-match") {
      state = normalizeState(
        await api("matches", {
          method: "DELETE",
          body: JSON.stringify({ matchId: button.dataset.matchId })
        })
      );
      showToast("Ο αγώνας διαγράφηκε.");
    }

    render();
  } catch (error) {
    showToast(error.message);
  }
});

els.refresh.addEventListener("click", () => refresh());

render();
refresh(true);
window.setInterval(() => refresh(true), 5000);
