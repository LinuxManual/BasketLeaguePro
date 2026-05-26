const ENTRY_PIN = '2945';
const ADMIN_PIN = '4591';
const PLAYER_POINTS_KEY = 'basketleaguepro:v2:playerPoints';

const $ = (s, r = document) => r.querySelector(s);
const readState = () => {
  try { return JSON.parse(localStorage.getItem('basketleaguepro:v6') || '{}'); } catch { return {}; }
};
const saveState = (state) => localStorage.setItem('basketleaguepro:v6', JSON.stringify(state));

function showEntryGate() {
  if (sessionStorage.getItem('blp:v2:entry') === 'ok') return;
  document.body.classList.add('v2-locked');
  const gate = document.createElement('div');
  gate.id = 'entry-gate';
  gate.innerHTML = `
    <div class="entry-card">
      <h1>BasketLeague Pro V2</h1>
      <p>Elite secured dashboard. Πληκτρολόγησε κωδικό εισόδου.</p>
      <input id="entry-pin" type="password" inputmode="numeric" maxlength="8" placeholder="Κωδικός" />
      <button id="entry-submit" type="button">Είσοδος</button>
      <small id="entry-msg">Access required</small>
    </div>`;
  document.body.append(gate);
  const input = $('#entry-pin', gate);
  const msg = $('#entry-msg', gate);
  const unlock = () => {
    if (input.value === ENTRY_PIN) {
      sessionStorage.setItem('blp:v2:entry', 'ok');
      document.body.classList.remove('v2-locked');
      gate.remove();
      return;
    }
    msg.textContent = 'Λάθος κωδικός';
  };
  $('#entry-submit', gate).addEventListener('click', unlock);
  input.addEventListener('keydown', (e) => e.key === 'Enter' && unlock());
}

function ensureAdminPin() {
  const pin = window.prompt('Admin PIN required');
  if (pin !== ADMIN_PIN) { alert('Λάθος admin PIN'); return false; }
  return true;
}

function getPoints() {
  try { return JSON.parse(localStorage.getItem(PLAYER_POINTS_KEY) || '{}'); } catch { return {}; }
}
function setPoints(points) { localStorage.setItem(PLAYER_POINTS_KEY, JSON.stringify(points)); }

function mountV2Center() {
  const wrap = document.createElement('section');
  wrap.className = 'v2-grid';
  wrap.innerHTML = `
    <article class="panel">
      <div class="panel-heading"><div><p class="section-label">V2 Controls</p><h2>Admin Resets</h2></div><span class="pill">PIN 4591</span></div>
      <div class="v2-actions">
        <button data-reset="rosters">Reset Ρόστερ</button>
        <button data-reset="matches">Reset Αγώνες</button>
        <button data-reset="scores">Reset Σκορ</button>
        <button data-reset="chat">Reset Chat</button>
        <button data-reset="ranking">Reset Ranking</button>
        <button data-reset="theme">Reset Theme</button>
        <button data-reset="all" class="danger">FULL RESET</button>
      </div>
    </article>
    <article class="panel">
      <div class="panel-heading"><div><p class="section-label">V2 Ranking</p><h2>All Players Leaderboard</h2></div></div>
      <div class="v2-rank-toolbar"><button id="v2-refresh-ranking" type="button">Refresh ranking</button></div>
      <div class="table-wrap"><table><thead><tr><th>#</th><th>Παίκτης</th><th>Ομάδα</th><th>Πόντοι</th><th>+/-</th></tr></thead><tbody id="v2-ranking-body"></tbody></table></div>
    </article>`;
  $('#ultra')?.insertAdjacentElement('afterend', wrap);

  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-reset]');
    if (!btn) return;
    if (!ensureAdminPin()) return;
    const type = btn.dataset.reset;
    const s = readState();
    if (type === 'rosters') s.rosters = { HotHeroes: [], 'Ιπτάμενοι': [] };
    if (type === 'matches') s.matches = [];
    if (type === 'scores') (s.matches || []).forEach(m => { m.hotScore = null; m.flyScore = null; });
    if (type === 'chat') s.messages = [];
    if (type === 'theme') localStorage.removeItem('basketleaguepro:theme');
    if (type === 'ranking') localStorage.removeItem(PLAYER_POINTS_KEY);
    if (type === 'all') {
      localStorage.removeItem('basketleaguepro:v6');
      localStorage.removeItem('basketleaguepro:v5');
      localStorage.removeItem('basketleaguepro:v4');
      localStorage.removeItem('basketleaguepro:theme');
      localStorage.removeItem(PLAYER_POINTS_KEY);
      location.reload();
      return;
    }
    saveState(s);
    renderRanking();
    location.reload();
  });

  $('#v2-refresh-ranking')?.addEventListener('click', renderRanking);
}

function renderRanking() {
  const body = $('#v2-ranking-body');
  if (!body) return;
  const s = readState();
  const points = getPoints();
  const rows = [];
  ['HotHeroes', 'Ιπτάμενοι'].forEach(team => (s.rosters?.[team] || []).forEach(name => rows.push({ team, name, points: Number(points[name] || 0) })));
  rows.sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name,'el'));
  if (!rows.length) { body.innerHTML = '<tr><td colspan="5" class="empty-state">Δεν υπάρχουν παίκτες.</td></tr>'; return; }
  body.innerHTML = rows.map((r,i)=>`<tr><td>${i+1}</td><td>${r.name}</td><td>${r.team}</td><td>${r.points}</td><td><button data-player="${encodeURIComponent(r.name)}" data-delta="1">+1</button> <button data-player="${encodeURIComponent(r.name)}" data-delta="-1">-1</button> <button data-player="${encodeURIComponent(r.name)}" data-delta="5">+5</button></td></tr>`).join('');
  body.querySelectorAll('button[data-player]').forEach(btn=>btn.addEventListener('click',()=>{
    if (!ensureAdminPin()) return;
    const name = decodeURIComponent(btn.dataset.player);
    const delta = Number(btn.dataset.delta||0);
    const p = getPoints();
    p[name] = Math.max(0, Number(p[name]||0)+delta);
    setPoints(p);
    renderRanking();
  }));
}

showEntryGate();
window.addEventListener('load', () => {
  setTimeout(() => {
    mountV2Center();
    renderRanking();
  }, 60);
});
