const pool = require('./config/database');
pool.query("SELECT * FROM fonction_agents WHERE id_agent = 1082", (err, res) => {
  console.log(res ? res.rows : err);
  pool.end();
});
