// Best Profiles page. Loaded after app.js and referral.js; reuses $, api, esc, I, view, toast, pages, TITLES, personCard, BANDS.
(() => {
    for (const sel of ['#nav', '#tabs']) $(sel).insertAdjacentHTML('beforeend', `<a href="#/best" data-nav="best">${I.search}<span>Best</span></a>`);
    TITLES.best = 'Best Profiles';
    const modal = html => {
      let m = $('#md');
      if (!m) { document.body.insertAdjacentHTML('beforeend', '<div id="md" class="md"><div class="card"><button class="icon-btn" id="mx" aria-label="Close">✕</button><div id="mb"></div></div></div>'); m = $('#md'); m.onclick = e => { if (e.target === m || e.target.id === 'mx') m.classList.remove('show'); }; }
      $('#mb').innerHTML = html; m.classList.add('show');
    };
    const card = x => `<div class="match">${personCard(x)}<div class="sc"><i style="width:${Math.min(x.score, 100)}%"></i><span>${x.score} match</span></div>
      <p class="sub why" id="w${x.id}"></p><div class="acts"><button class="btn sm" data-intel="${esc(x.company)}">Company intel</button></div></div>`;
  
    pages.best = async () => {
      const st = { bands: ['10+', '8-10'], ai: 0, product: 0, rows: [] };
      view().innerHTML = `<div class="hero"><div><h1>Best profiles</h1><p class="sub">Ranked by seniority, role fit, company type and reachability. Use AI to see why each person fits.</p></div></div>
        <div class="filters"><input id="br" placeholder="Target role, e.g. AI Engineer" value="${esc(localStorage.b_role || '')}"><input id="bt" placeholder="Target company (optional)"></div>
        <div class="row" style="margin-bottom:16px">${BANDS.map(b => `<button class="chip ${st.bands.includes(b) ? 'on' : ''}" data-b="${esc(b)}">${esc(b)} yrs</button>`).join('')}
          <button class="chip" id="bai">AI only</button><button class="chip" id="bpr">Product</button>
          <button class="btn pri" id="bgo">${I.search}Find best</button><button class="btn" id="bex">Explain with AI</button></div>
        <div class="people" id="bl"><div class="empty" style="grid-column:1/-1">Enter a role and tap Find best.</div></div>`;
      const run = async () => {
        localStorage.b_role = $('#br').value; $('#bl').innerHTML = '<div class="load" style="grid-column:1/-1">Ranking…</div>';
        st.rows = await api('/best?' + new URLSearchParams({ role: $('#br').value, target: $('#bt').value, bands: st.bands.join(','), ai: st.ai, product: st.product, limit: 12 }));
        $('#bl').innerHTML = st.rows.map(card).join('') || '<div class="empty" style="grid-column:1/-1">No matches. Try more bands.</div>';
      };
      const explain = async () => {
        if (!st.rows.length) return toast('Find profiles first');
        toast('Asking AI…');
        const r = await api('/messages/why', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: st.rows.map(x => x.id), role: $('#br').value }) });
        r.reasons.forEach(d => { const el = $('#w' + d.id); if (el) el.textContent = d.reason; });
      };
      view().onclick = async e => {
        const t = x => e.target.closest(x), b = t('[data-b]'), it = t('[data-intel]');
        try {
          if (b) { st.bands = st.bands.includes(b.dataset.b) ? st.bands.filter(v => v !== b.dataset.b) : [...st.bands, b.dataset.b]; b.classList.toggle('on'); }
          else if (t('#bai')) { st.ai = +!st.ai; t('#bai').classList.toggle('on'); }
          else if (t('#bpr')) { st.product = +!st.product; t('#bpr').classList.toggle('on'); }
          else if (t('#bgo')) await run();
          else if (t('#bex')) await explain();
          else if (it) {
            modal('<div class="load">Researching…</div>');
            const r = await api('/messages/intel?company=' + encodeURIComponent(it.dataset.intel));
            modal(`<h3>${esc(it.dataset.intel)}</h3><p style="margin:10px 0">${esc(r.summary)}</p>${r.sources.map(s => `<a class="co" style="display:block;margin-top:6px" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>`).join('')}`);
          }
        } catch (x) { toast(x.message); if (it) $('#md').classList.remove('show'); }
      };
    };
    if (location.hash.startsWith('#/best')) route();
  })();