const pool = require('./backend/config/database');

async function test() {
    try {
        const res = await pool.query(`
            SELECT a.id, a.nom, a.prenom, a.id_type_d_agent, a.date_de_naissance, a.date_retraite, a.statut_emploi, t.libele as type_agent_libele, g.libele as grade_libele
            FROM agents a
            LEFT JOIN type_d_agents t ON a.id_type_d_agent = t.id
            LEFT JOIN grades g ON a.id_grade = g.id
            WHERE a.nom ILIKE '%CONTRACTUEL%' OR t.libele ILIKE '%ARTICLE 18%' OR t.libele ILIKE '%CONTRACTUEL%'
            LIMIT 10;
        `);
        console.log(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
test();
