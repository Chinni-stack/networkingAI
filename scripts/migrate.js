const fs = require('fs'), path = require('path'), db = require('../db');
(async () => {
  try { await db.query(fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8')); console.log('Database schema ready (schema: networking)'); }
  catch (e) { console.error('Migration failed:', e.message); process.exitCode = 1; }
  finally { await db.end(); }
})();
