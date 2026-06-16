const pool = require('./config/database');
pool.query("SELECT * FROM direction_generale WHERE id = 14", (err, res) => {
  console.log(res ? res.rows : err);
  pool.end();
});
