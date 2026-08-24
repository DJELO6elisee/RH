const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'ma_rh_db', password: '12345', port: 5432 });
pool.query("SELECT id, id_agent, type_demande, date_debut, status, niveau_evolution_demande, statut_drh, niveau_actuel FROM demandes WHERE type_demande IN ('conges', 'certificat_cessation') AND status != 'rejete' ORDER BY id DESC LIMIT 20;", (err, res) => {
    console.log(err ? err.stack : res.rows);
    pool.end();
});
