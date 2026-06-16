const pool = require('./config/database');
pool.query("SELECT * FROM validateurs_documents", (err, res) => {
  console.log(res ? res.rows : err);
  pool.end();
});
