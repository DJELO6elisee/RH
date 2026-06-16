const pool = require('./config/database');
pool.query("SELECT n.*, d.libelle as direction_nom, dg.libelle as direction_generale_nom FROM nominations n LEFT JOIN directions d ON n.id_direction = d.id LEFT JOIN direction_generale dg ON n.id_direction_generale = dg.id WHERE n.id = 120", (err, res) => {
  console.log(res ? res.rows : err);
  pool.end();
});
