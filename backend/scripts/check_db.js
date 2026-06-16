const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  password: '12345',
  host: 'localhost',
  port: 5432,
  database: 'ma_rh_db'
});
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'agents'")
  .then(res => {
    console.log(res.rows.map(r => r.column_name).join(', '));
    pool.end();
  })
  .catch(e => {
    console.error(e);
    pool.end();
  });
