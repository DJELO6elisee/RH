const pool = require('./config/database');
pool.query("SELECT e.libele as emploi_libele, ea.designation_poste as emploi_designation_poste FROM agents a LEFT JOIN emploi_agents ea ON a.id = ea.id_agent LEFT JOIN emplois e ON ea.id_emploi = e.id WHERE a.id = 1082 LIMIT 1", (err, res) => {
  console.log(res ? res.rows : err);
  pool.end();
});
