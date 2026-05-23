const els = {
  hotList: document.getElementById('hot-list'), flyList: document.getElementById('fly-list'),
  insights: document.getElementById('insights'), matchesBody: document.getElementById('matches-body'),
  matchId: document.getElementById('match-id'), messages: document.getElementById('messages')
};

async function api(path, options = {}) {
  const res = await fetch(`/api/${path}`, {headers:{'Content-Type':'application/json'}, ...options});
  if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
  return res.json();
}

function fmtDate(v){ return new Date(`${v}T00:00:00`).toLocaleDateString('en-GB'); }

function render(state){
  els.hotList.innerHTML = state.rosters.HotHeroes.map(p=>`<li>${p}</li>`).join('') || '<li>No players yet.</li>';
  els.flyList.innerHTML = state.rosters['Ιπτάμενοι'].map(p=>`<li>${p}</li>`).join('') || '<li>No players yet.</li>';

  const completed = state.matches.filter(m => Number.isInteger(m.hotScore) && Number.isInteger(m.flyScore));
  const hotWins = completed.filter(m => m.hotScore > m.flyScore).length;
  const flyWins = completed.filter(m => m.flyScore > m.hotScore).length;
  const avg = completed.length ? (completed.reduce((a,m)=>a+m.hotScore+m.flyScore,0)/completed.length).toFixed(1) : '0';
  els.insights.innerHTML = `
    <div class="metric"><span>Total Matches</span><b>${state.matches.length}</b></div>
    <div class="metric"><span>Completed</span><b>${completed.length}</b></div>
    <div class="metric"><span>HotHeroes Wins</span><b>${hotWins}</b></div>
    <div class="metric"><span>Ιπτάμενοι Wins</span><b>${flyWins}</b></div>
    <div class="metric"><span>Avg Total Points</span><b>${avg}</b></div>`;

  els.matchId.innerHTML = state.matches.map(m => `<option value="${m.id}">${fmtDate(m.date)} ${m.time} • ${m.court}</option>`).join('') || '<option value="">Create a match first</option>';
  els.matchesBody.innerHTML = state.matches.map(m => {
    const done = Number.isInteger(m.hotScore) && Number.isInteger(m.flyScore);
    return `<tr><td>${fmtDate(m.date)}</td><td>${m.time}</td><td>${m.court}</td><td>${done ? `${m.hotScore}-${m.flyScore}`:'-'}</td><td><span class="status ${done?'done':'upcoming'}">${done?'Completed':'Upcoming'}</span></td></tr>`;
  }).join('') || '<tr><td colspan="5">No matches yet.</td></tr>';

  els.messages.innerHTML = state.messages.map(m => `<li><b>${m.user}</b><br>${m.text}<br><small>${new Date(m.createdAt).toLocaleString()}</small></li>`).join('') || '<li>No messages yet.</li>';
}

async function refresh(){ render(await api('state')); }

document.getElementById('player-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  await api('players', {method:'POST', body:JSON.stringify({team:document.getElementById('team').value, name:document.getElementById('player').value})});
  e.target.reset(); refresh();
});

document.getElementById('match-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  await api('matches', {method:'POST', body:JSON.stringify({date:date.value,time:time.value,court:court.value})});
  e.target.reset(); refresh();
});

document.getElementById('score-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  await api('scores', {method:'POST', body:JSON.stringify({matchId:els.matchId.value,hotScore:hot.value,flyScore:fly.value})});
  e.target.reset(); refresh();
});

document.getElementById('chat-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  await api('chat', {method:'POST', body:JSON.stringify({user:user.value,text:text.value})});
  text.value = ''; refresh();
});

document.getElementById('clear-chat').addEventListener('click', async ()=>{ await api('chat',{method:'DELETE'}); refresh(); });

refresh();
setInterval(refresh, 5000);
