const $ = (s, r = document) => r.querySelector(s), $$ = s => document.querySelectorAll(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const api = async (u, o) => { const r = await fetch('/api' + u, o), j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Request failed'); return j; };
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2000); };

// ---- icons (inline SVG, no dependencies)
const P = {
  dash: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
  people: '<path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M21 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  link: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>', moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  logo: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/>' };
const I = Object.fromEntries(Object.entries(P).map(([k, v]) => [k, `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${v}</svg>`]));
$('#mark').innerHTML = $('#mark2').innerHTML = I.logo; $('#sicon').innerHTML = I.search;
const NAV = [['', 'dash', 'Dashboard'], ['people', 'people', 'People'], ['companies', 'building', 'Companies'], ['shortlist', 'star', 'Shortlist'], ['import', 'upload', 'Import']];
$('#nav').innerHTML = $('#tabs').innerHTML = NAV.map(([p, i, l]) => `<a href="#/${p}" data-nav="${p}">${I[i]}<span>${l}</span></a>`).join('');

// ---- theme
const setTheme = t => { document.documentElement.dataset.theme = localStorage.theme = t; $('#theme').innerHTML = t === 'dark' ? I.sun : I.moon; };
setTheme(localStorage.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
$('#theme').onclick = () => { setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); route(); };

const BC = { '10+': '#004182', '8-10': '#0a66c2', '6-8': '#378fe9', '5-6': '#70b5f9', '<5': '#bac4ce' }, BANDS = Object.keys(BC), charts = {};
function chart(id, type, labels, sets, o = {}) {
  const el = $('#' + id); if (!el) return; charts[id]?.destroy();
  const css = getComputedStyle(document.documentElement), mut = css.getPropertyValue('--mut').trim(), line = css.getPropertyValue('--line').trim(), surf = css.getPropertyValue('--surface').trim();
  charts[id] = new Chart(el, { type, data: { labels, datasets: sets.map(s => ({ label: s.label, data: s.data, backgroundColor: s.colors || s.color || '#2563eb', borderColor: type === 'line' ? '#2563eb' : surf,
    borderWidth: type === 'line' ? 2.5 : type === 'doughnut' ? 2 : 0, borderRadius: type === 'bar' ? 5 : 0, tension: .35, fill: type === 'line', pointRadius: type === 'line' ? 3 : 0, maxBarThickness: 34 })) },
    options: { maintainAspectRatio: false, indexAxis: o.h ? 'y' : 'x', cutout: '66%', plugins: { legend: { display: type === 'doughnut' || o.stacked, position: 'bottom', labels: { color: mut, usePointStyle: true, boxWidth: 8 } } },
      scales: type === 'doughnut' ? {} : { x: { stacked: o.stacked, ticks: { color: mut }, grid: { display: o.h, color: line } }, y: { stacked: o.stacked, ticks: { color: mut }, grid: { display: !o.h, color: line } } } } });
}

// ---- shared renderers
const initials = n => n.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
const hue = s => [...s].reduce((a, c) => a + c.charCodeAt(0), 0) % 40;
const nameLink = x => x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.name)}</a>` : esc(x.name);
const bandTag = x => `<span class="tag"><i class="dot" style="background:${BC[x.band]}"></i>${esc(x.band)} yrs${x.yoe_source === 'estimated' ? '*' : ''}</span>`;
const starBtn = x => `<button class="star ${x.starred ? 'on' : ''}" data-star="${x.id}" title="Shortlist" aria-label="Shortlist">${I.star}</button>`;
const actions = x => `${x.url ? `<a class="btn sm" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${I.link}Profile</a><button class="icon-btn sm" data-copy="${esc(x.url)}" title="Copy link" aria-label="Copy link">${I.copy}</button>` : ''}${x.email ? `<a class="icon-btn sm" href="mailto:${esc(x.email)}" title="Email" aria-label="Email">${I.mail}</a>` : ''}`;
const coLink = x => `<a class="co" href="#/company/${encodeURIComponent(x.company)}">${esc(x.company) || '—'}</a>`;
const personCard = x => `<article class="person"><div class="pt"><span class="av" style="--h:${hue(x.name)}">${esc(initials(x.name))}</span><div class="pi"><b>${nameLink(x)}</b><small>${esc(x.position) || '—'}</small></div>${starBtn(x)}</div>
  ${coLink(x)}<div class="tags">${bandTag(x)}<span class="tag">${esc(x.domain)}</span>${x.is_ai ? '<span class="tag ai">AI</span>' : ''}${x.is_product ? '<span class="tag p">Product</span>' : ''}</div><div class="acts">${actions(x)}</div></article>`;
const personRow = x => `<tr><td><div class="pt"><span class="av sm" style="--h:${hue(x.name)}">${esc(initials(x.name))}</span><div class="pi"><b>${nameLink(x)}</b><small>${esc(x.domain)}${x.is_ai ? ' · AI' : ''}</small></div></div></td>
  <td>${esc(x.position) || '—'}</td><td>${coLink(x)}${x.is_product ? ' <span class="tag p">Product</span>' : ''}</td><td>${bandTag(x)}</td><td class="r"><div class="acts">${actions(x)}${starBtn(x)}</div></td></tr>`;

let PRE = {}; const go = (p, hash) => { PRE = p; location.hash === hash ? route() : (location.hash = hash); };
const view = () => $('#view'), emptyState = () => `<div class="empty">${I.upload}<h1 style="margin:10px 0">No data yet</h1><p class="sub" style="margin-bottom:16px">Import your LinkedIn connections to get started.</p><a class="btn pri" href="#/import">Import connections</a></div>`;

// ---- pages
async function dashboard() {
  let prod = PRE.product || 0, ai = PRE.ai || 0; PRE = {};
  const draw = async () => {
    const f = `product=${prod}&ai=${ai}`;
    const [s, sa, cos, lead] = await Promise.all([api(`/stats?${f}`), api(`/stats?product=${prod}&ai=1`), api(`/companies?limit=10&${f}`), api(`/people?limit=6&band=10%2B&product=${prod}&ai=1`)]);
    if (!s.kpi.total && !prod && !ai) return view().innerHTML = emptyState();
    const k = s.kpi, bm = Object.fromEntries(s.bands.map(b => [b.band, b.n])), am = Object.fromEntries(sa.bands.map(b => [b.band, b.n]));
    view().innerHTML = `<div class="hero"><div><h1>Dashboard</h1><p class="sub">Senior talent and company mix across your professional network</p></div>
      <div class="row"><button class="chip ${ai ? 'on' : ''}" id="fa">AI only</button><button class="chip ${prod ? 'on' : ''}" id="fp">Product companies</button></div></div>
      <section class="kpis">${[['Connections', k.total, {}], ['AI professionals', k.ai, { ai: 1 }], ['Senior (10+ yrs)', k.senior, { band: '10+' }], ['Product companies', k.product, { product: 1 }], ['Companies', k.companies, null], ['Avg. experience*', k.avg_yoe + ' yrs', null]]
        .map(([l, v, p]) => `<div class="kpi" ${p ? `data-go='${JSON.stringify(p)}'` : ''}><span>${l}</span><b>${v}</b></div>`).join('')}</section>
      <section class="grid"><div class="card"><h3>Experience distribution</h3><p class="sub">All matching connections</p><div class="ch"><canvas id="cb"></canvas></div></div>
      <div class="card"><h3>AI professionals by experience</h3><p class="sub">Roles in AI / ML / data science</p><div class="ch"><canvas id="ca"></canvas></div></div>
      <div class="card wide"><h3>Top companies by headcount</h3><p class="sub">Stacked by experience band</p><div class="ch tall"><canvas id="cc"></canvas></div></div>
      <div class="card"><h3>Domains</h3><p class="sub">Inferred from job titles</p><div class="ch"><canvas id="cd"></canvas></div></div>
      <div class="card"><h3>Network growth</h3><p class="sub">New connections per year</p><div class="ch"><canvas id="cy"></canvas></div></div>
      <div class="card wide"><div class="row" style="justify-content:space-between;margin-bottom:12px"><div><h3>Senior AI leaders</h3><p class="sub" style="margin:0">10+ years in AI-related roles</p></div><a class="btn sm" data-go='{"ai":1,"band":"10+"}' href="javascript:void 0">View all</a></div>
        <div class="people">${lead.rows.map(personCard).join('') || '<p class="empty">No senior AI profiles match</p>'}</div></div></section>`;
    chart('cb', 'doughnut', BANDS.map(b => b + ' yrs'), [{ data: BANDS.map(b => bm[b] || 0), colors: BANDS.map(b => BC[b]) }]);
    chart('ca', 'bar', BANDS.map(b => b + ' yrs'), [{ data: BANDS.map(b => am[b] || 0), colors: BANDS.map(b => BC[b]) }]);
    chart('cc', 'bar', cos.map(c => c.company), [['10+', 'b10'], ['8-10', 'b8'], ['6-8', 'b6'], ['5-6', 'b5'], ['<5', 'b0']].map(([l, key]) => ({ label: l + ' yrs', data: cos.map(c => c[key]), color: BC[l] })), { h: true, stacked: true });
    chart('cd', 'bar', s.domains.map(d => d.domain), [{ data: s.domains.map(d => d.n), color: '#2563eb' }], { h: true });
    chart('cy', 'line', s.years.map(y => y.y), [{ label: 'Connections', data: s.years.map(y => y.n) }]);
    $('#fa').onclick = () => { ai = ai ? 0 : 1; draw(); }; $('#fp').onclick = () => { prod = prod ? 0 : 1; draw(); };
  };
  await draw();
}

async function directory({ starred = 0, company = '', head = '', title = 'People' } = {}) {
  const S = { page: 1, q: '', band: '', domain: '', ai: 0, product: 0, sort: 'yoe', ...PRE }; PRE = {};
  let V = localStorage.pv || 'cards'; const meta = await api('/meta'), B = ['', ...BANDS];
  view().innerHTML = `${head}<div class="hero"><div><h1>${company ? 'Team members' : title}</h1><p class="sub" id="cnt"></p></div>
    <div class="row"><div class="seg"><button data-v="cards" aria-label="Card view">${I.grid}</button><button data-v="table" aria-label="Table view">${I.list}</button></div><button class="btn" id="exp">${I.download}Export CSV</button></div></div>
    <div class="filters"><input id="q" type="search" placeholder="Filter by name, company, role…" value="${esc(S.q)}">
    <select id="b" aria-label="Experience">${B.map(b => `<option value="${esc(b)}" ${S.band === b ? 'selected' : ''}>${b ? b + ' yrs' : 'All experience'}</option>`).join('')}</select>
    <select id="d" aria-label="Domain"><option value="">All domains</option>${meta.domains.map(d => `<option ${S.domain === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select>
    <select id="s" aria-label="Sort">${[['yoe', 'Most experienced'], ['recent', 'Recently connected'], ['name', 'Name A–Z'], ['company', 'Company A–Z']].map(([v, l]) => `<option value="${v}" ${S.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <button class="chip ${S.ai ? 'on' : ''}" id="ai">AI only</button><button class="chip ${S.product ? 'on' : ''}"    id="pr">Product</button><button class="chip ${S.has_email ? 'on' : ''}" id="em">Has email</button><select id="sn" aria-label="Connected since"><option value="">Any time</option>${[2025, 2024, 2022, 2020].map(y => `<option value="${y}" ${S.since == y ? 'selected' : ''}>Since ${y}</option>`).join('')}</select></div>
    <div id="list"></div><div class="pager" id="pager"></div>`;
  const qs = () => new URLSearchParams({ ...S, starred: starred ? 1 : '', company }).toString(), segs = () => $$('.seg button').forEach(b => b.classList.toggle('on', b.dataset.v === V));
  const load = async () => {
    const d = await api('/people?' + qs()); segs();
    $('#cnt').textContent = `${d.total.toLocaleString()} ${d.total === 1 ? 'person' : 'people'}`;
    $('#list').innerHTML = !d.rows.length ? `<div class="empty">${starred ? 'Star people to build your shortlist.' : 'No matches. Try changing the filters.'}</div>`
      : V === 'table' ? `<div class="card tbl"><div class="scroll"><table><thead><tr><th>Name</th><th>Role</th><th>Company</th><th>Experience</th><th></th></tr></thead><tbody>${d.rows.map(personRow).join('')}</tbody></table></div></div>`
      : `<div class="people">${d.rows.map(personCard).join('')}</div>`;
    $('#pager').innerHTML = d.pages > 1 ? `<button class="btn" id="pv" ${S.page <= 1 ? 'disabled' : ''}>← Previous</button><span class="sub">Page ${S.page} of ${d.pages}</span><button class="btn" id="nx" ${S.page >= d.pages ? 'disabled' : ''}>Next →</button>` : '';
    if (d.pages > 1) { $('#pv').onclick = () => { S.page--; load(); scrollTo(0, 0); }; $('#nx').onclick = () => { S.page++; load(); scrollTo(0, 0); }; }
  };
  let t; $('#q').oninput = e => { clearTimeout(t); t = setTimeout(() => { S.q = e.target.value; S.page = 1; load(); }, 300); };
  [['b', 'band'], ['d', 'domain'], ['s', 'sort']].forEach(([id, k]) => $('#' + id).onchange = e => { S[k] = e.target.value; S.page = 1; load(); });
  [['ai', 'ai'], ['pr', 'product']].forEach(([id, k]) => $('#' + id).onclick = e => { S[k] = S[k] ? 0 : 1; e.currentTarget.classList.toggle('on'); S.page = 1; load(); });
  $$('.seg button').forEach(b => b.onclick = () => { V = localStorage.pv = b.dataset.v; load(); });
  $('#exp').onclick = () => location.href = '/api/export.csv?' + qs();
  view().reload = load; await load();
}

async function companies() {
  let q = '', prod = 0; PRE = {};
  view().innerHTML = `<div class="hero"><div><h1>Companies</h1><p class="sub">Headcount and seniority mix per company</p></div></div>
    <div class="filters"><input id="q" type="search" placeholder="Search companies…"><button class="chip" id="pr">Product companies</button></div><div class="cos" id="list"></div>`;
  const load = async () => {
    const rows = await api(`/companies?limit=120&product=${prod}&q=${encodeURIComponent(q)}`);
    $('#list').innerHTML = rows.map(c => `<a class="co-card" href="#/company/${encodeURIComponent(c.company)}"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><b>${esc(c.company)}</b>${c.product ? '<span class="tag p">Product</span>' : ''}</div>
      <div class="sub">${c.n} people · ${c.ai} in AI · avg ${c.avg_yoe} yrs*</div>
      <div class="bar">${[['b10', '10+'], ['b8', '8-10'], ['b6', '6-8'], ['b5', '5-6'], ['b0', '<5']].map(([k, b]) => `<i style="width:${c[k] / c.n * 100}%;background:${BC[b]}"></i>`).join('')}</div>
      <div class="tags">${[['b10', '10+'], ['b8', '8-10'], ['b6', '6-8'], ['b5', '5-6']].map(([k, b]) => `<span class="tag"><i class="dot" style="background:${BC[b]}"></i>${b}: ${c[k]}</span>`).join('')}</div><div class="sub">${esc(c.domain)}</div></a>`).join('') || `<div class="empty" style="grid-column:1/-1">No companies found</div>`;
  };
  let t; $('#q').oninput = e => { clearTimeout(t); t = setTimeout(() => { q = e.target.value; load(); }, 300); };
  $('#pr').onclick = e => { prod = prod ? 0 : 1; e.currentTarget.classList.toggle('on'); load(); }; await load();
}

async function companyPage(name) {
  const s = (await api('/stats?company=' + encodeURIComponent(name))).kpi, li = 'https://www.linkedin.com/search/results/people/?keywords=' + encodeURIComponent(name);
  const head = `<a class="sub" href="#/companies">← All companies</a><div class="hero" style="margin-top:8px"><div><h1>${esc(name)}</h1><p class="sub">${s.total} connections · ${s.senior} senior (10+ yrs) · ${s.ai} in AI · avg ${s.avg_yoe} yrs*</p></div>
    <a class="btn pri" href="${li}" target="_blank" rel="noopener noreferrer">${I.link}Find more on LinkedIn</a></div>`;
  await directory({ company: name, head });
}

function importPage() {
  view().innerHTML = `<div class="hero"><div><h1>Import connections</h1><p class="sub">Replaces current data. Your shortlist is preserved.</p></div></div>
    <label class="drop" id="drop">${I.upload}<div><b>Drop Connections.csv here, or click to browse</b></div><p class="sub">Optional: add a <b>YOE</b> column for exact experience instead of title-based estimates.</p><input id="f" type="file" accept=".csv" hidden></label>
    <div class="card" style="margin-top:16px"><h3>How to get your file</h3><p class="sub" style="margin:6px 0 0">LinkedIn → Settings &amp; Privacy → Data privacy → Get a copy of your data → Connections. Download, unzip, and upload <b>Connections.csv</b>.</p></div>`;
  const run = file => { const r = new FileReader(); r.onload = async () => {
    let t = r.result; const i = t.indexOf('First Name'); if (i > 0) t = t.slice(i);
    const rows = Papa.parse(t, { header: true, skipEmptyLines: true }).data.map(o => ({ name: `${o['First Name'] || ''} ${o['Last Name'] || ''}`.trim(), url: o['URL'], email: o['Email Address'], company: o['Company'], position: o['Position'], connected: o['Connected On'], yoe: o['YOE'] || o['Experience'] }));
    try { toast('Importing…'); const j = await api('/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }) }); toast(`Imported ${j.imported.toLocaleString()} connections`); location.hash = '#/'; } catch (e) { toast(e.message); }
  }; r.readAsText(file); };
  $('#f').onchange = e => e.target.files[0] && run(e.target.files[0]);
  ['dragover', 'dragleave', 'drop'].forEach(ev => $('#drop').addEventListener(ev, e => { e.preventDefault(); $('#drop').classList.toggle('over', ev === 'dragover'); if (ev === 'drop' && e.dataTransfer.files[0]) run(e.dataTransfer.files[0]); }));
}

// ---- events & router
document.addEventListener('click', async e => {
  const st = e.target.closest('[data-star]'), cp = e.target.closest('[data-copy]'), g = e.target.closest('[data-go]');
  if (st) { try { const r = await api(`/people/${st.dataset.star}/star`, { method: 'POST' }); st.classList.toggle('on', r.starred); toast(r.starred ? 'Added to shortlist' : 'Removed from shortlist'); if (!r.starred && location.hash === '#/shortlist') view().reload?.(); } catch (x) { toast(x.message); } }
  if (cp) { try { await navigator.clipboard.writeText(cp.dataset.copy); toast('Profile link copied'); } catch { toast('Copy failed'); } }
  if (g) { e.preventDefault(); go(JSON.parse(g.dataset.go), '#/people'); }
});
$('#gs').onkeydown = e => { if (e.key === 'Enter') { go({ q: e.target.value }, '#/people'); e.target.blur(); } };

const pages = { '': dashboard, people: () => directory(), shortlist: () => directory({ starred: 1, title: 'Shortlist' }), companies, import: importPage, company: companyPage };
const TITLES = { '': 'Dashboard', people: 'People', companies: 'Companies', shortlist: 'Shortlist', import: 'Import', company: 'Company' };
async function route() {
  const [, pg = '', arg = ''] = location.hash.slice(1).split('/'), key = pages[pg] ? pg : '', f = pages[key];
  $$('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === (key === 'company' ? 'companies' : key)));
  document.title = `${TITLES[key]} · Networking Intelligence`; view().innerHTML = '<div class="load">Loading…</div>'; scrollTo(0, 0);
  try { await f(decodeURIComponent(arg)); } catch (e) { view().innerHTML = `<div class="empty"><h1>Something went wrong</h1><p class="sub">${esc(e.message)}<br>Is Postgres running and schema.sql applied?</p></div>`; }
}
addEventListener('hashchange', route); route();