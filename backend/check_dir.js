const pool = require('./config/database');
pool.query("SELECT * FROM directions WHERE libelle ILIKE '%RESSOURCES HUMAINES%'", (err, res) => {
  console.log(res ? res.rows : err);
  pool.end();
});
