const pool = require('./config/database');
pool.query("SELECT a.fonction_actuelle, d.libelle as direction_nom, dg.libelle as direction_generale_nom, s.libelle as service_nom FROM agents a LEFT JOIN directions d ON a.id_direction = d.id LEFT JOIN direction_generale dg ON d.id_direction_generale = dg.id LEFT JOIN sous_directions s ON a.id_sous_direction = s.id WHERE a.nom ILIKE '%ASSARI%'", (err, res) => {
  console.log(res ? res.rows : err);
  pool.end();
});
