const TEAM_HOT = "HotHeroes";
const TEAM_FLY = "Ιπτάμενοι";
const LEGACY_TEAM_FLY = "Ξ™Ο€Ο„Ξ¬ΞΌΞµΞ½ΞΏΞΉ";
const TEAMS = [TEAM_HOT, TEAM_FLY];
const STORAGE_KEY = "basketleaguepro:v6";
const LEGACY_STORAGE_KEYS = ["basketleaguepro:v5"];
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
  refresh: document.getElementById("refresh"),
  seasonHealth: document.getElementById("season-health"),
  seasonNarrative: document.getElementById("season-narrative"),
  timelineStrip: document.getElementById("timeline-strip"),
  nextMatch: document.getElementById("next-match"),
  hotPowerBar: document.getElementById("hot-power-bar"),
  flyPowerBar: document.getElementById("fly-power-bar"),
  hotPowerLabel: document.getElementById("hot-power-label"),
  flyPowerLabel: document.getElementById("fly-power-label"),
  rosterSearch: document.getElementById("roster-search"),
  rosterSort: document.getElementById("roster-sort"),
  matchSearch: document.getElementById("match-search"),
  matchSort: document.getElementById("match-sort"),
  exportData: document.getElementById("export-data"),
  copySummary: document.getElementById("copy-summary"),
  resetLocal: document.getElementById("reset-local"),

  // Simulator Elements
  simModal: document.getElementById("simulator-modal"),
  simScoreHot: document.getElementById("sim-score-hot"),
  simScoreFly: document.getElementById("sim-score-fly"),
  simClock: document.getElementById("sim-clock"),
  simPeriod: document.getElementById("sim-period"),
  simFeed: document.getElementById("sim-feed"),
  simCourt: document.getElementById("sim-court"),
  startSimBtn: document.getElementById("start-sim-btn"),
  cancelSimBtn: document.getElementById("cancel-sim-btn"),
  closeSimBtn: document.getElementById("close-sim-btn"),
};

let state = normalizeState();
let activeFilter = "all";
let toastTimer;
let rosterQuery = "";
let rosterSortMode = "name";
let matchQuery = "";
let matchSortMode = "date-asc";

// Simulation State
let activeSimMatch = null;
let simInterval = null;
let simTimeTotalSeconds = 0; // 0 to 48 minutes (2880 seconds)
let simScoreHot = 0;
let simScoreFly = 0;
let simSpeed = 1; // 1x or 5x

// SVG Icons
const SVG_TRASH = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
const SVG_SIMULATE = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>`;

function normalizeState(next = {}) {
  const rosters = next.rosters || {};
  const flyRoster = rosters[TEAM_FLY] || rosters[LEGACY_TEAM_FLY] || [];
  
  const mapPlayer = (item) => {
    if (!item) return null;
    if (typeof item === "string") {
      return { name: item, number: Math.floor(Math.random() * 99).toString(), position: "SG" };
    }
    return {
      name: String(item.name || "").trim(),
      number: String(item.number || "0").trim(),
      position: String(item.position || "SG").trim()
    };
  };

  return {
    rosters: {
      [TEAM_HOT]: (Array.isArray(rosters[TEAM_HOT]) ? rosters[TEAM_HOT] : []).map(mapPlayer).filter(Boolean),
      [TEAM_FLY]: (Array.isArray(flyRoster) ? flyRoster : []).map(mapPlayer).filter(Boolean)
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
  const keys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return normalizeState(JSON.parse(raw));
    } catch {
      // Try the next key before falling back to an empty store.
    }
  }
  return normalizeState();
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
    const number = String(body.number || "0").trim();
    const position = normalizeText(body.position, 10);
    if (!TEAMS.includes(team) || !name || !position) throw new Error("Invalid player payload");
    const exists = store.rosters[team].some((item) => item.name.toLocaleLowerCase("el-GR") === name.toLocaleLowerCase("el-GR"));
    if (!exists) store.rosters[team].push({ name, number, position });
    return Promise.resolve(writeLocalStore(store));
  }

  if (path === "players" && method === "DELETE") {
    const team = body.team;
    const name = normalizeText(body.name, 80);
    if (!TEAMS.includes(team) || !name) throw new Error("Invalid player payload");
    store.rosters[team] = store.rosters[team].filter((item) => item.name.toLocaleLowerCase("el-GR") !== name.toLocaleLowerCase("el-GR"));
    return Promise.resolve(writeLocalStore(store));
  }

  if (path === "matches" && method === "POST") {
    const date = normalizeText(body.date, 10);
    const time = normalizeText(body.time, 5);
    const court = normalizeText(body.court, 80);
    if (!date || !time || !court) throw new Error("Invalid match payload");
    store.matches.push({ id: createId(), date, time, court, hotScore: null, flyScore: null });
    store.matches.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
    
    // Auto-post system log
    store.messages.unshift({
      user: "System",
      text: `📅 Νέος αγώνας προγραμματίστηκε: ${formatDate(date)} ${time} στο γήπεδο ${court}`,
      createdAt: Date.now()
    });
    
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

    // Auto-post system log
    store.messages.unshift({
      user: "System",
      text: `🏀 Ο αγώνας στο γήπεδο ${match.court} ολοκληρώθηκε! HotHeroes ${hotScore} - ${flyScore} Ιπτάμενοι`,
      createdAt: Date.now()
    });

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

  if (path === "health" && method === "GET") return Promise.resolve({ ok: true, version: "5.0.0", mode: "static" });
  throw new Error("Method or endpoint not allowed");
}

function createNode(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.html !== undefined) node.innerHTML = options.html;
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

// Quick click emojis quick click injections helper
function setupEmojis() {
  const quickEmojis = document.querySelector(".quick-emojis");
  if (quickEmojis) {
    quickEmojis.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-emoji]");
      if (!btn) return;
      const textarea = document.getElementById("text");
      textarea.value += btn.dataset.emoji;
      textarea.focus();
    });
  }
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


function getTeamSnapshot(team, standings = buildStandings(state.matches)) {
  const stats = standings.find((row) => row.team === team) || {
    team,
    played: 0,
    wins: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    diff: 0
  };
  const rosterSize = state.rosters[team].length;
  const winRate = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
  const offensiveAverage = stats.played ? Math.round(stats.pointsFor / stats.played) : 0;
  const power = Math.min(100, Math.round(winRate * 0.55 + Math.max(stats.diff, 0) * 0.7 + rosterSize * 4 + offensiveAverage * 0.18));
  return { ...stats, rosterSize, winRate, offensiveAverage, power };
}

function getNextMatch() {
  const now = new Date();
  return state.matches
    .filter((match) => !isCompleted(match))
    .slice()
    .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`))
    .find((match) => new Date(`${match.date}T${match.time}`) >= now) || state.matches.find((match) => !isCompleted(match));
}

function makeSeasonSummary() {
  const completed = state.matches.filter(isCompleted);
  const standings = buildStandings(state.matches);
  const leader = standings[0];
  const totalPlayers = TEAMS.reduce((sum, team) => sum + state.rosters[team].length, 0);
  const nextMatch = getNextMatch();
  if (!state.matches.length) return "Το πρωτάθλημα είναι έτοιμο για εκκίνηση: πρόσθεσε παίκτες, δημιούργησε αγώνα και άνοιξε το live simulator.";
  const leaderText = leader?.wins ? `${leader.team} οδηγεί με ${leader.wins} νίκες και διαφορά ${leader.diff >= 0 ? "+" : ""}${leader.diff}` : "η κορυφή παραμένει ανοιχτή";
  const nextText = nextMatch ? `Επόμενο tip-off: ${formatDate(nextMatch.date)} στις ${nextMatch.time}, ${nextMatch.court}.` : "Δεν υπάρχει άλλο ανοιχτό fixture.";
  return `${completed.length}/${state.matches.length} αγώνες έχουν ολοκληρωθεί, ${leaderText}, με ${totalPlayers} ενεργούς παίκτες. ${nextText}`;
}

function renderCommandCenter() {
  if (!els.seasonNarrative) return;
  const standings = buildStandings(state.matches);
  const hot = getTeamSnapshot(TEAM_HOT, standings);
  const fly = getTeamSnapshot(TEAM_FLY, standings);
  const completed = state.matches.filter(isCompleted).length;
  const nextMatch = getNextMatch();

  els.seasonHealth.textContent = completed ? `${completed} final${completed === 1 ? "" : "s"}` : "Pre-season";
  els.seasonNarrative.textContent = makeSeasonSummary();
  els.nextMatch.replaceChildren(
    nextMatch
      ? createNode("div", { className: "next-match-content" }, [
          createNode("b", { text: `${formatDate(nextMatch.date)} • ${nextMatch.time}` }),
          createNode("span", { text: nextMatch.court }),
          createNode("small", { text: "HotHeroes vs Ιπτάμενοι" })
        ])
      : createNode("span", { text: "Δεν υπάρχει προγραμματισμένος αγώνας." })
  );

  const maxPower = Math.max(hot.power, fly.power, 1);
  const hotPercent = Math.max(8, Math.round((hot.power / maxPower) * 100));
  const flyPercent = Math.max(8, Math.round((fly.power / maxPower) * 100));
  els.hotPowerBar.style.width = `${hotPercent}%`;
  els.flyPowerBar.style.width = `${flyPercent}%`;
  els.hotPowerLabel.textContent = `${hot.power}%`;
  els.flyPowerLabel.textContent = `${fly.power}%`;

  const timelineItems = state.matches.slice(0, 8).map((match) => {
    const completedMatch = isCompleted(match);
    const label = completedMatch ? `${match.hotScore}-${match.flyScore}` : match.time;
    return createNode("span", {
      className: `timeline-dot ${completedMatch ? "completed" : "upcoming"}`,
      text: label,
      attrs: { title: `${formatDate(match.date)} • ${match.court}` }
    });
  });
  els.timelineStrip.replaceChildren(...(timelineItems.length ? timelineItems : [createNode("span", { className: "empty-state", text: "Χωρίς αγώνες ακόμα." })]));
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
        createNode("td", { text: row.team, className: "team-cell-bold" }),
        createNode("td", { text: String(row.played) }),
        createNode("td", { text: String(row.wins) }),
        createNode("td", { text: `${row.pointsFor}-${row.pointsAgainst}`, className: "score-cell" }),
        createNode("td", { text: row.diff > 0 ? `+${row.diff}` : String(row.diff), className: row.diff > 0 ? "positive-diff" : "" })
      ])
    )
  );
}

function getVisibleRoster(team) {
  const query = rosterQuery.toLocaleLowerCase("el-GR");
  return state.rosters[team]
    .filter((player) => {
      const haystack = `${player.name} ${player.number} ${player.position}`.toLocaleLowerCase("el-GR");
      return !query || haystack.includes(query);
    })
    .slice()
    .sort((a, b) => {
      if (rosterSortMode === "number") return Number(a.number) - Number(b.number) || a.name.localeCompare(b.name, "el-GR");
      if (rosterSortMode === "position") return a.position.localeCompare(b.position, "el-GR") || a.name.localeCompare(b.name, "el-GR");
      return a.name.localeCompare(b.name, "el-GR");
    });
}

function renderRosterList(list, team) {
  const players = getVisibleRoster(team);
  if (!players.length) {
    const message = state.rosters[team].length ? "Δεν βρέθηκαν παίκτες για το φίλτρο." : "Δεν έχουν προστεθεί παίκτες.";
    list.replaceChildren(createNode("li", { className: "empty-state", text: message }));
    return;
  }

  list.replaceChildren(
    ...players.map((player) =>
      createNode("li", {}, [
        createNode("div", { className: "player-row" }, [
          createNode("div", { className: "player-info-badge" }, [
            createNode("span", { className: "player-num-tag", text: player.number }),
            createNode("span", { className: "player-pos-tag", text: player.position }),
            createNode("span", { className: "player-name", text: player.name })
          ]),
          createNode("button", {
            className: "icon-button delete-player-btn",
            html: SVG_TRASH,
            attrs: {
              type: "button",
              title: "Αφαίρεση παίκτη",
              "aria-label": `Αφαίρεση ${player.name}`,
              "data-action": "delete-player",
              "data-team": team,
              "data-name": player.name
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
  const query = matchQuery.toLocaleLowerCase("el-GR");
  return state.matches
    .filter((match) => {
      if (activeFilter === "completed") return isCompleted(match);
      if (activeFilter === "upcoming") return !isCompleted(match);
      return true;
    })
    .filter((match) => {
      const score = isCompleted(match) ? `${match.hotScore}-${match.flyScore}` : "επόμενος";
      const haystack = `${formatDate(match.date)} ${match.date} ${match.time} ${match.court} ${score}`.toLocaleLowerCase("el-GR");
      return !query || haystack.includes(query);
    })
    .slice()
    .sort((a, b) => {
      if (matchSortMode === "date-desc") return new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`);
      if (matchSortMode === "score-desc") return ((b.hotScore || 0) + (b.flyScore || 0)) - ((a.hotScore || 0) + (a.flyScore || 0));
      return new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`);
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
      
      const actionCell = createNode("div", { className: "action-cell" });
      
      if (!completed) {
        actionCell.appendChild(
          createNode("button", {
            className: "button-sim-action",
            html: `${SVG_SIMULATE} Simulate`,
            attrs: {
              type: "button",
              "data-action": "simulate-match",
              "data-match-id": match.id
            }
          })
        );
      }

      actionCell.appendChild(
        createNode("button", {
          className: "icon-button delete-match-btn",
          html: SVG_TRASH,
          attrs: {
            type: "button",
            title: "Διαγραφή αγώνα",
            "aria-label": "Διαγραφή αγώνα",
            "data-action": "delete-match",
            "data-match-id": match.id
          }
        })
      );

      return createNode("tr", {}, [
        createNode("td", { text: formatDate(match.date) }),
        createNode("td", { text: match.time }),
        createNode("td", { text: match.court }),
        createNode("td", { text: score, className: "match-score-cell" }),
        createNode("td", {}, [
          createNode("span", {
            className: `status ${completed ? "completed" : "upcoming"}`,
            text: completed ? "Τελικός" : "Επόμενος"
          })
        ]),
        createNode("td", {}, [actionCell])
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
    ...state.messages.map((message) => {
      const isSystem = message.user === "System";
      return createNode("li", { className: isSystem ? "system-message-log" : "" }, [
        createNode("div", { className: "message-header" }, [
          createNode("b", { text: message.user }),
          createNode("time", { text: formatDateTime(message.createdAt), attrs: { datetime: new Date(message.createdAt).toISOString() } })
        ]),
        createNode("p", { className: "message-text", text: message.text })
      ]);
    })
  );
}

function render() {
  renderMetrics();
  renderCommandCenter();
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

// Live Match Simulator Implementation
function openSimulator(matchId) {
  const match = state.matches.find((m) => m.id === matchId);
  if (!match) return;

  activeSimMatch = match;
  simTimeTotalSeconds = 0; // Starts at Q1 10:00 (represented by timer)
  simScoreHot = 0;
  simScoreFly = 0;
  simSpeed = 1;

  els.simCourt.textContent = match.court;
  els.simScoreHot.textContent = "0";
  els.simScoreFly.textContent = "0";
  els.simClock.textContent = "10:00";
  els.simPeriod.textContent = "Q1";
  els.simFeed.innerHTML = '<div class="ticker-entry system-msg">🏁 Jump ball! Ο αγώνας ξεκινάει.</div>';

  els.startSimBtn.disabled = false;
  els.startSimBtn.textContent = "Έναρξη 🏀";
  els.cancelSimBtn.textContent = "Ακύρωση";

  els.simModal.removeAttribute("aria-hidden");
}

function closeSimulator() {
  if (simInterval) {
    clearInterval(simInterval);
    simInterval = null;
  }
  els.simModal.setAttribute("aria-hidden", "true");
  activeSimMatch = null;
}

const commentaryTemplates = {
  scores: [
    "{player} σκοράρει ένα απίθανο τρίποντο από τη γωνία! 🔥",
    "{player} διεισδύει στη ρακέτα και σκοράρει με λέι-απ! 🏀",
    "{player} παίρνει το ριμπάουντ και σκοράρει με φόλοου!",
    "Εκπληκτικό κάρφωμα από τον {player} στον αιφνιδιασμό! 🚀",
    "{player} ευστοχεί σε σουτ μέσης απόστασης μετά από ντρίμπλα.",
    "{player} κερδίζει φάουλ και ευστοχεί στις ελεύθερες βολές."
  ],
  misses: [
    "Ο {player} αστοχεί σε σουτ τριών πόντων.",
    "Δυνατή άμυνα! Ο {player} τάπαρε το σουτ του αντιπάλου! 🛡️",
    "Λάθος πάσα από τον {player}, η μπάλα βγαίνει εκτός.",
    "Ο {player} χάνει τη μπάλα στο ντρίμπλαρισμα.",
    "Αστοχεί σε λέι-απ ο {player} υπό πίεση."
  ],
  generic: [
    "Σκληρή μάχη για τη μπάλα στο κέντρο του γηπέδου.",
    "Time-out ζητάει ο προπονητής για οδηγίες.",
    "Οι παίκτες κυκλοφορούν τη μπάλα ψάχνοντας ελεύθερο σουτ."
  ]
};

function generateSimEvent() {
  // Choose scoring team
  const isHotScoring = Math.random() > 0.48; // Slight advantage simulation
  const scoringTeam = isHotScoring ? TEAM_HOT : TEAM_FLY;
  const defendingTeam = isHotScoring ? TEAM_FLY : TEAM_HOT;

  const scoringRoster = state.rosters[scoringTeam];
  const defendingRoster = state.rosters[defendingTeam];

  const scoringPlayerObj = scoringRoster.length 
    ? scoringRoster[Math.floor(Math.random() * scoringRoster.length)]
    : { name: `Παίκτης ${scoringTeam}` };

  const defendingPlayerObj = defendingRoster.length 
    ? defendingRoster[Math.floor(Math.random() * defendingRoster.length)]
    : { name: `Παίκτης ${defendingTeam}` };

  const isScore = Math.random() > 0.45; // 55% chance of score event on simulation action tick

  let logText = "";
  let points = 0;

  if (isScore) {
    const isThree = Math.random() > 0.7; // 30% chance of a 3-pointer
    points = isThree ? 3 : 2;
    
    if (isHotScoring) {
      simScoreHot += points;
    } else {
      simScoreFly += points;
    }

    const template = commentaryTemplates.scores[Math.floor(Math.random() * commentaryTemplates.scores.length)];
    logText = template.replace("{player}", `${scoringPlayerObj.name} (#${scoringPlayerObj.number})`);
  } else {
    const isDefense = Math.random() > 0.5;
    if (isDefense && defendingRoster.length) {
      logText = `🛡️ Εξαιρετική άμυνα από τον ${defendingPlayerObj.name} (#${defendingPlayerObj.number}) που κλέβει τη μπάλα!`;
    } else {
      const template = commentaryTemplates.misses[Math.floor(Math.random() * commentaryTemplates.misses.length)];
      logText = template.replace("{player}", `${scoringPlayerObj.name} (#${scoringPlayerObj.number})`);
    }
  }

  // Append entry
  const entry = createNode("div", {
    className: `ticker-entry ${isScore ? (isHotScoring ? "hot-play" : "fly-play") : ""}`,
    text: `[${els.simPeriod.textContent} ${els.simClock.textContent}] ${logText}`
  });
  
  els.simFeed.appendChild(entry);
  els.simFeed.scrollTop = els.simFeed.scrollHeight;

  // Update score elements
  els.simScoreHot.textContent = String(simScoreHot);
  els.simScoreFly.textContent = String(simScoreFly);
}

function startSim() {
  if (simInterval) return;

  els.startSimBtn.disabled = true;
  els.startSimBtn.textContent = "Προσομοίωση...";
  els.cancelSimBtn.textContent = "Διακοπή";

  // Match lasts 4 periods of 10 minutes.
  // We simulate 1 minute per tick (every 500ms).
  // Total 40 minutes = 40 ticks.
  let currentMinutes = 10;
  let currentPeriod = 1;

  simInterval = setInterval(() => {
    currentMinutes -= 1;
    
    if (currentMinutes < 0) {
      currentPeriod += 1;
      currentMinutes = 9;
    }

    if (currentPeriod > 4) {
      // Simulation finished!
      clearInterval(simInterval);
      simInterval = null;
      
      els.simClock.textContent = "00:00";
      els.simPeriod.textContent = "Q4";

      const finalEntry = createNode("div", {
        className: "ticker-entry system-msg",
        text: `🏁 Λήξη αγώνα! Τελικό Σκορ: HotHeroes ${simScoreHot} - ${simScoreFly} Ιπτάμενοι.`
      });
      els.simFeed.appendChild(finalEntry);
      els.simFeed.scrollTop = els.simFeed.scrollHeight;

      // Enable save / close
      els.startSimBtn.disabled = false;
      els.startSimBtn.textContent = "Αποθήκευση Σκορ";
      els.cancelSimBtn.textContent = "Κλείσιμο";
      return;
    }

    // Format clock
    els.simClock.textContent = `${String(currentMinutes).padStart(2, "0")}:00`;
    els.simPeriod.textContent = `Q${currentPeriod}`;

    // Perform game events
    generateSimEvent();
  }, 450);
}

async function saveSimScore() {
  if (!activeSimMatch) return;
  
  try {
    state = normalizeState(
      await api("scores", {
        method: "POST",
        body: JSON.stringify({
          matchId: activeSimMatch.id,
          hotScore: simScoreHot,
          flyScore: simScoreFly
        })
      })
    );
    render();
    showToast("Το αποτέλεσμα του αγώνα αποθηκεύτηκε!");
    closeSimulator();
  } catch (error) {
    showToast(error.message);
  }
}


function downloadJson() {
  const payload = {
    exportedAt: new Date().toISOString(),
    version: "6.0.0",
    ...normalizeState(state)
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `basketleaguepro-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Το αρχείο JSON ετοιμάστηκε.");
}

async function copySeasonSummary() {
  const text = makeSeasonSummary();
  try {
    await navigator.clipboard.writeText(text);
    showToast("Το recap αντιγράφηκε.");
  } catch {
    showToast(text);
  }
}

function resetLocalData() {
  localStorage.removeItem(STORAGE_KEY);
  LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  state = normalizeState();
  render();
  showToast("Τα τοπικά δεδομένα μηδενίστηκαν.");
}

// Event Listeners for Forms
document.getElementById("player-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const numberVal = parseInt(document.getElementById("player-number").value, 10);
  if (isNaN(numberVal) || numberVal < 0 || numberVal > 99) {
    showToast("Το νούμερο της φανέλας πρέπει να είναι από 0 έως 99.");
    return;
  }

  handleSubmit(
    form,
    () =>
      api("players", {
        method: "POST",
        body: JSON.stringify({
          team: document.getElementById("team").value,
          name: document.getElementById("player").value,
          number: String(numberVal),
          position: document.getElementById("player-position").value
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

// Emojis Quick Click Injections
setupEmojis();

els.rosterSearch?.addEventListener("input", (event) => {
  rosterQuery = event.target.value.trim();
  renderRosters();
});

els.rosterSort?.addEventListener("change", (event) => {
  rosterSortMode = event.target.value;
  renderRosters();
});

els.matchSearch?.addEventListener("input", (event) => {
  matchQuery = event.target.value.trim();
  renderMatches();
});

els.matchSort?.addEventListener("change", (event) => {
  matchSortMode = event.target.value;
  renderMatches();
});

els.exportData?.addEventListener("click", downloadJson);
els.copySummary?.addEventListener("click", copySeasonSummary);
els.resetLocal?.addEventListener("click", resetLocalData);

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

// Click delegation
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
      render();
    }

    if (button.dataset.action === "delete-match") {
      state = normalizeState(
        await api("matches", {
          method: "DELETE",
          body: JSON.stringify({ matchId: button.dataset.matchId })
        })
      );
      showToast("Ο αγώνας διαγράφηκε.");
      render();
    }

    if (button.dataset.action === "simulate-match") {
      openSimulator(button.dataset.matchId);
    }
  } catch (error) {
    showToast(error.message);
  }
});

// Simulator Modal Actions
els.startSimBtn.addEventListener("click", () => {
  if (els.startSimBtn.textContent === "Αποθήκευση Σκορ") {
    saveSimScore();
  } else {
    startSim();
  }
});

els.cancelSimBtn.addEventListener("click", () => {
  closeSimulator();
});

els.closeSimBtn.addEventListener("click", () => {
  closeSimulator();
});

els.refresh.addEventListener("click", () => refresh());

// Initialization
render();
refresh(true);
window.setInterval(() => refresh(true), 5000);
