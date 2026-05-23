const $ = (id) => document.getElementById(id);
const els = { hotList:$("hot-list"), flyList:$("fly-list"), insights:$("insights"), matchesBody:$("matches-body"), matchId:$("match-id"), betMatchId:$("bet-match-id"), betsBody:$("bets-body"), messages:$("messages"), matchSearch:$("match-search") };
let cache = null;

async function api(path, options = {}) {
  const res = await fetch(`/api/${path}`, { headers: { "Content-Type": "application/json" }, ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function fmtDate(v) { return new Date(`${v}T00:00:00`).toLocaleDateString("el-GR"); }
function matchLabel(m) { return `${fmtDate(m.date)} ${m.time} • ${m.court}`; }

function render(state) {
  cache = state;
  const completed = state.matches.filter((m) => Number.isInteger(m.hotScore) && Number.isInteger(m.flyScore));
  const hotWins = completed.filter((m) => m.hotScore > m.flyScore).length;
  const flyWins = completed.filter((m) => m.flyScore > m.hotScore).length;
  const avg = completed.length ? (completed.reduce((a, m) => a + m.hotScore + m.flyScore, 0) / completed.length).toFixed(1) : "0";
  const betsWon = state.bets.filter((b) => { const m = state.matches.find((x) => x.id === b.matchId); return m && m.hotScore === b.predHot && m.flyScore === b.predFly; }).length;

  els.insights.innerHTML = `<div class="metric"><span>Αγώνες</span><b>${state.matches.length}</b></div><div class="metric"><span>Completed</span><b>${completed.length}</b></div><div class="metric"><span>Νίκες Hot</span><b>${hotWins}</b></div><div class="metric"><span>Νίκες Fly</span><b>${flyWins}</b></div><div class="metric"><span>Won Bets</span><b>${betsWon}</b></div>`;
  els.hotList.innerHTML = state.rosters.HotHeroes.map((p) => `<li>${p}</li>`).join("") || "<li>Κανείς ακόμα.</li>";
  els.flyList.innerHTML = state.rosters["Ιπτάμενοι"].map((p) => `<li>${p}</li>`).join("") || "<li>Κανείς ακόμα.</li>";

  const q = (els.matchSearch.value || "").trim().toLowerCase();
  const matches = state.matches.filter((m) => !q || m.court.toLowerCase().includes(q));
  els.matchesBody.innerHTML = matches.map((m) => {
    const done = Number.isInteger(m.hotScore) && Number.isInteger(m.flyScore);
    return `<tr><td>${fmtDate(m.date)}</td><td>${m.time}</td><td>${m.court}</td><td>${done ? `${m.hotScore}-${m.flyScore}` : "-"}</td><td><span class="status ${done ? "done" : "upcoming"}">${done ? "Ολοκληρώθηκε" : "Προσεχώς"}</span></td></tr>`;
  }).join("") || '<tr><td colspan="5">Δεν υπάρχουν αγώνες.</td></tr>';

  const options = state.matches.map((m) => `<option value="${m.id}">${matchLabel(m)}</option>`).join("") || '<option value="">Πρώτα αγώνας</option>';
  els.matchId.innerHTML = options;
  els.betMatchId.innerHTML = options;

  const map = new Map(state.matches.map((m) => [m.id, m]));
  els.betsBody.innerHTML = state.bets.slice(0, 100).map((b) => {
    const m = map.get(b.matchId); const done = m && Number.isInteger(m.hotScore) && Number.isInteger(m.flyScore);
    const won = done && m.hotScore === b.predHot && m.flyScore === b.predFly;
    return `<tr><td>${b.user}</td><td>${m ? matchLabel(m) : "N/A"}</td><td>${b.predHot}-${b.predFly}</td><td>€${Number(b.stake).toFixed(2)}</td><td>${done ? (won ? "Won" : "Lost") : "Pending"}</td></tr>`;
  }).join("") || '<tr><td colspan="5">Δεν υπάρχουν στοιχήματα.</td></tr>';

  els.messages.innerHTML = state.messages.map((m) => `<li><b>${m.user}</b><br>${m.text}<br><small>${new Date(m.createdAt).toLocaleString("el-GR")}</small></li>`).join("") || "<li>Δεν υπάρχουν μηνύματα.</li>";
}

async function refresh() { render(await api("state")); }
function on(id, event, fn) { $(id).addEventListener(event, fn); }

on("player-form", "submit", async (e) => { e.preventDefault(); await api("players", { method: "POST", body: JSON.stringify({ team: $("team").value, name: $("player").value }) }); e.target.reset(); refresh(); });
on("match-form", "submit", async (e) => { e.preventDefault(); await api("matches", { method: "POST", body: JSON.stringify({ date: $("date").value, time: $("time").value, court: $("court").value }) }); e.target.reset(); refresh(); });
on("score-form", "submit", async (e) => { e.preventDefault(); await api("scores", { method: "POST", body: JSON.stringify({ matchId: els.matchId.value, hotScore: $("hot").value, flyScore: $("fly").value }) }); e.target.reset(); refresh(); });
on("bet-form", "submit", async (e) => { e.preventDefault(); await api("bets", { method: "POST", body: JSON.stringify({ user: $("bet-user").value, matchId: els.betMatchId.value, predHot: $("bet-hot").value, predFly: $("bet-fly").value, stake: $("bet-stake").value }) }); e.target.reset(); refresh(); });
on("chat-form", "submit", async (e) => { e.preventDefault(); await api("chat", { method: "POST", body: JSON.stringify({ user: $("user").value, text: $("text").value }) }); $("text").value = ""; refresh(); });
on("clear-chat", "click", async () => { await api("chat", { method: "DELETE" }); refresh(); });
on("match-search", "input", () => { if (cache) render(cache); });
on("export-json", "click", () => { if (!cache) return; const blob = new Blob([JSON.stringify(cache, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `basketleaguepro-export-${Date.now()}.json`; a.click(); URL.revokeObjectURL(a.href); });

refresh();
setInterval(refresh, 5000);
