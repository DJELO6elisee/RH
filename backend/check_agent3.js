const pool = require('./config/database');
pool.query("SELECT * FROM agents WHERE id = 1082", (err, res) => {
  console.log(res ? res.rows : err);
  pool.end();
});
