const router = require('express').Router(), db = require('../db'), { classify } = require('../lib/classify');
const h = f => (q, s) => f(q, s).catch(e => { console.error(e); s.status(500).json({ error: e.message }); });
const SORT = { yoe: 'yoe DESC', name: 'name ASC', company: 'company ASC, name ASC', recent: 'connected_on DESC NULLS LAST' };
const COLS = 'id,name,url,email,company,position,connected_on,yoe::float yoe,yoe_source,band,domain,is_ai,is_product,starred';

function where(q) {
  const w = [], p = [], add = (sql, v) => { p.push(v); w.push(sql.replace('?', () => '$' + p.length)); };
  if (q.ai === '1') w.push('is_ai'); if (q.product === '1') w.push('is_product'); if (q.starred === '1') w.push('starred');
  if (q.has_email === '1') w.push("email<>''");
  if (q.band) add('band = ?', q.band); if (q.domain) add('domain = ?', q.domain); if (q.company) add('company = ?', q.company);
  if (q.bands) add('band = ANY(?)', String(q.bands).split(',')); // multi-select experience bands
  if (+q.since) add('connected_on >= ?::date', `${+q.since}-01-01`);
  if (+q.yoe_min) add('yoe >= ?', +q.yoe_min);
  if (q.q) { p.push('%' + q.q + '%'); w.push(`(name ILIKE $${p.length} OR company ILIKE $${p.length} OR position ILIKE $${p.length})`); }
  return { sql: 'WHERE ' + (w.join(' AND ') || 'TRUE'), p };
}

router.post('/import', h(async (q, s) => {
  const rows = (Array.isArray(q.body.rows) ? q.body.rows : []).map(classify).filter(x => x.name);
  if (!rows.length) return s.status(400).json({ error: 'No valid rows found. Is this the LinkedIn Connections.csv?' });
  const k = f => rows.map(f), c = await db.connect();
  try {
    await c.query('BEGIN');
    const kept = (await c.query("SELECT url FROM connections WHERE starred AND url<>''")).rows.map(o => o.url);
    await c.query('TRUNCATE connections RESTART IDENTITY');
    await c.query(`INSERT INTO connections(name,url,email,company,position,connected_on,yoe,yoe_source,band,domain,is_ai,is_product)
      SELECT * FROM unnest($1::text[],$2::text[],$3::text[],$4::text[],$5::text[],$6::date[],$7::numeric[],$8::text[],$9::text[],$10::text[],$11::bool[],$12::bool[])`,
      [k(x => x.name), k(x => x.url), k(x => x.email), k(x => x.company), k(x => x.position), k(x => x.on), k(x => x.yoe), k(x => x.src), k(x => x.band), k(x => x.domain), k(x => x.ai), k(x => x.prod)]);
    if (kept.length) await c.query('UPDATE connections SET starred=true WHERE url = ANY($1)', [kept]);
    await c.query('COMMIT');
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
  s.json({ imported: rows.length });
}));

router.get('/health', (q, s) => s.json({ ok: true }));
router.get('/meta', h(async (q, s) => s.json({ domains: (await db.query('SELECT DISTINCT domain FROM connections ORDER BY 1')).rows.map(o => o.domain) })));

router.get('/stats', h(async (q, s) => {
  const w = where(q.query), run = sql => db.query(sql, w.p).then(r => r.rows);
  const [kpi, bands, domains, years] = await Promise.all([
    run(`SELECT count(*)::int total, count(*) FILTER(WHERE is_ai)::int ai, count(*) FILTER(WHERE band='10+')::int senior,
         count(*) FILTER(WHERE is_product)::int product, count(DISTINCT NULLIF(company,''))::int companies, coalesce(round(avg(yoe),1),0)::float avg_yoe FROM connections ${w.sql}`),
    run(`SELECT band, count(*)::int n FROM connections ${w.sql} GROUP BY band`),
    run(`SELECT domain, count(*)::int n FROM connections ${w.sql} GROUP BY domain ORDER BY n DESC`),
    run(`SELECT EXTRACT(year FROM connected_on)::int y, count(*)::int n FROM connections ${w.sql} AND connected_on IS NOT NULL GROUP BY y ORDER BY y`)]);
  s.json({ kpi: kpi[0], bands, domains, years });
}));

router.get('/companies', h(async (q, s) => {
  const w = where(q.query), lim = Math.min(parseInt(q.query.limit) || 60, 200);
  const f = b => `count(*) FILTER(WHERE band='${b}')::int`;
  const { rows } = await db.query(`SELECT company, count(*)::int n, ${f('10+')} b10, ${f('8-10')} b8, ${f('6-8')} b6, ${f('5-6')} b5, ${f('<5')} b0,
    count(*) FILTER(WHERE is_ai)::int ai, bool_or(is_product) product, round(avg(yoe),1)::float avg_yoe, mode() WITHIN GROUP (ORDER BY domain) domain
    FROM connections ${w.sql} AND company<>'' GROUP BY company ORDER BY n DESC, company LIMIT ${lim}`, w.p);
  s.json(rows);
}));

router.get('/people', h(async (q, s) => {
  const w = where(q.query), lim = Math.min(parseInt(q.query.limit) || 24, 100), page = Math.max(parseInt(q.query.page) || 1, 1);
  const [rows, tot] = await Promise.all([
    db.query(`SELECT ${COLS} FROM connections ${w.sql} ORDER BY ${SORT[q.query.sort] || SORT.yoe}, id LIMIT ${lim} OFFSET ${(page - 1) * lim}`, w.p),
    db.query(`SELECT count(*)::int n FROM connections ${w.sql}`, w.p)]);
  s.json({ rows: rows.rows, total: tot.rows[0].n, pages: Math.max(Math.ceil(tot.rows[0].n / lim), 1) });
}));

// Best profiles: score = seniority + AI + product company + reachable email + keyword fit with the target role + target-company match
router.get('/best', h(async (q, s) => {
  const w = where(q.query), p = w.p, Q = q.query;
  const kw = String(Q.role || '').toLowerCase().split(/[^a-z0-9+#.]+/).filter(x => x.length > 2).slice(0, 6);
  const fit = kw.map(k => { p.push('%' + k + '%'); return `+CASE WHEN position ILIKE $${p.length} THEN 12 WHEN company ILIKE $${p.length} THEN 6 ELSE 0 END`; }).join('');
  let tc = ''; if (Q.target) { p.push('%' + String(Q.target).slice(0, 80) + '%'); tc = `+CASE WHEN company ILIKE $${p.length} THEN 35 ELSE 0 END`; }
  const score = `(CASE band WHEN '10+' THEN 40 WHEN '8-10' THEN 32 WHEN '6-8' THEN 24 WHEN '5-6' THEN 16 ELSE 8 END
    +CASE WHEN is_ai THEN 12 ELSE 0 END+CASE WHEN is_product THEN 8 ELSE 0 END+CASE WHEN email<>'' THEN 4 ELSE 0 END ${fit} ${tc})::int`;
  const { rows } = await db.query(`SELECT ${COLS}, ${score} score FROM connections ${w.sql} ORDER BY score DESC, yoe DESC, id LIMIT ${Math.min(parseInt(Q.limit) || 12, 30)}`, p);
  s.json(rows);
}));

router.post('/people/:id/star', h(async (q, s) => {
  const { rows } = await db.query('UPDATE connections SET starred = NOT starred WHERE id=$1 RETURNING starred', [parseInt(q.params.id)]);
  rows.length ? s.json(rows[0]) : s.status(404).json({ error: 'Not found' });
}));

router.get('/export.csv', h(async (q, s) => {
  const w = where(q.query), cols = ['name', 'url', 'email', 'company', 'position', 'band', 'domain', 'yoe', 'is_product', 'is_ai'];
  const e = v => { v = String(v ?? ''); if (/^[=+\-@]/.test(v)) v = "'" + v; return `"${v.replace(/"/g, '""')}"`; };
  const { rows } = await db.query(`SELECT ${cols.join(',')} FROM connections ${w.sql} ORDER BY yoe DESC, name`, w.p);
  s.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="network-export.csv"' })
    .send([cols.join(',')].concat(rows.map(x => cols.map(c => e(x[c])).join(','))).join('\n'));
}));
module.exports = router;