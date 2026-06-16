const db = require('../config/database');

async function checkAgent() {
    try {
        const result = await db.query("SELECT id, prenom, nom, matricule, date_prise_service_au_ministere, date_prise_service_dans_la_direction, date_prise_service, date_embauche FROM agents WHERE matricule = '504952W'");
        console.log('Agent data:', result.rows[0]);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

checkAgent();
