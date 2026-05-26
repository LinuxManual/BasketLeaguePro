const $ = (s, r = document) => r.querySelector(s);
function mountUltraPanel() {
  const host = document.createElement('section');
  host.className = 'ultra-grid';
  host.id = 'ultra';
  host.innerHTML = `
    <article class="panel ultra-card">
      <div class="panel-heading"><div><p class="section-label">Ultra Mode</p><h2>Command Center</h2></div><span class="pill">v7</span></div>
      <div class="command-row">
        <input id="ultra-command" placeholder="Γράψε εντολή: /focus /export /theme /backup" maxlength="120" />
        <button id="ultra-run" type="button">Run</button>
      </div>
      <p class="muted-line">Shortcuts: <kbd>Ctrl</kbd>+<kbd>K</kbd> palette, <kbd>Ctrl</kbd>+<kbd>J</kbd> jump matches.</p>
      <ul id="ultra-log" class="ultra-log"></ul>
    </article>
    <article class="panel ultra-card">
      <div class="panel-heading"><div><p class="section-label">Realtime Intel</p><h2>Live Engine</h2></div></div>
      <div class="ultra-stats" id="ultra-stats"></div>
      <canvas id="momentum-canvas" width="900" height="220" aria-label="Momentum chart"></canvas>
    </article>`;
  const anchor = $('#chat');
  anchor?.insertAdjacentElement('afterend', host);
}

function logLine(text) {
  const list = $('#ultra-log');
  if (!list) return;
  const li = document.createElement('li');
  li.textContent = `${new Date().toLocaleTimeString('el-GR')} · ${text}`;
  list.prepend(li);
  while (list.children.length > 12) list.removeChild(list.lastChild);
}

function updateUltraStats() {
  const raw = localStorage.getItem('basketleaguepro:v6') || localStorage.getItem('basketleaguepro:v5');
  let state = { rosters: {}, matches: [], messages: [] };
  try { state = JSON.parse(raw || '{}'); } catch {}
  const completed = (state.matches || []).filter(m => Number.isInteger(m.hotScore) && Number.isInteger(m.flyScore));
  const p = ((state.rosters?.HotHeroes?.length || 0) + (state.rosters?.['Ιπτάμενοι']?.length || 0));
  const avg = completed.length ? Math.round(completed.reduce((a,m)=>a+m.hotScore+m.flyScore,0)/completed.length) : 0;
  const stats = [
    ['Players', p], ['Matches', (state.matches||[]).length], ['Finals', completed.length], ['Avg pace', avg], ['Messages', (state.messages||[]).length]
  ];
  const host = $('#ultra-stats');
  if (host) host.innerHTML = stats.map(([k,v])=>`<div class="mini-stat"><span>${k}</span><b>${v}</b></div>`).join('');

  const c = $('#momentum-canvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  const ratio=Math.max(1,window.devicePixelRatio||1);const bounds=c.getBoundingClientRect();const w=Math.max(320,Math.floor(bounds.width*ratio));const h=Math.max(160,Math.floor(bounds.height*ratio));if(c.width!==w||c.height!==h){c.width=w;c.height=h;}
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = 'rgba(148,163,184,.15)'; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle = '#13d6c3'; ctx.lineWidth = 3; ctx.beginPath();
  const pts = completed.slice(-12).map(m => m.hotScore - m.flyScore);
  const data = pts.length ? pts : [0,2,-1,3,-2,1];
  const min = Math.min(...data)-2, max = Math.max(...data)+2;
  data.forEach((v,i)=>{const x=20 + (i*(w-40))/Math.max(1,data.length-1);const y= h-20 - ((v-min)/(max-min||1))*(h-40); if(i===0)ctx.moveTo(x,y); else ctx.lineTo(x,y);});
  ctx.stroke();
}

function runCommand(cmd) {
  const v = cmd.trim().toLowerCase();
  if (!v) return;
  if (v.includes('/theme')) { $('#theme-toggle')?.click(); logLine('Theme toggled'); return; }
  if (v.includes('/export')) { $('#export-state')?.click(); logLine('State exported'); return; }
  if (v.includes('/focus')) { location.hash = '#analytics'; logLine('Focused analytics'); return; }
  if (v.includes('/backup')) {
    const raw = localStorage.getItem('basketleaguepro:v6') || '{}';
    localStorage.setItem(`basketleaguepro:backup:${Date.now()}`, raw);
    logLine('Local backup snapshot created');
    return;
  }
  logLine(`Unknown command: ${cmd}`);
}

function mountPalette() {
  const modal = document.createElement('div');
  modal.id = 'ultra-palette';
  modal.innerHTML = '<div class="palette-inner"><input id="palette-input" placeholder="Type command..." /><div class="palette-hint">/theme · /export · /focus · /backup</div></div>';
  document.body.append(modal);
  const open = () => { modal.classList.add('open'); $('#palette-input').focus(); };
  const close = () => modal.classList.remove('open');
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'k') { e.preventDefault(); open(); }
    if (e.ctrlKey && e.key.toLowerCase() === 'j') { e.preventDefault(); location.hash = '#matches'; }
    if (e.key === 'Escape') close();
  });
  modal.addEventListener('click', (e)=>{ if(e.target===modal) close(); });
  modal.querySelector('#palette-input').addEventListener('keydown', (e)=>{
    if(e.key==='Enter'){ runCommand(e.target.value); e.target.value=''; close(); }
  });
}

function initUltraUpgrade() {
  mountUltraPanel();
  mountPalette();
  updateUltraStats();
  setInterval(updateUltraStats, 2500);
  window.addEventListener('resize', updateUltraStats, { passive: true });
  $('#ultra-run')?.addEventListener('click', () => {
    const input = $('#ultra-command');
    runCommand(input.value);
    input.value = '';
  });
  $('#ultra-command')?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); $('#ultra-run')?.click(); }});
  logLine('Ultra upgrade ready.');
}

initUltraUpgrade();
