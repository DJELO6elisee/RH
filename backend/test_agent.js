require('dotenv').config();
const db = require('./config/database');
const { getAgentPosteOuEmploi } = require('./services/utils/agentFunction');

async function run() {
    try {
        const res = await db.query("SELECT * FROM agents WHERE nom ILIKE '%ASSARI%' OR prenom ILIKE '%ASSARI%'");
        if (res.rows.length > 0) {
            const agent = res.rows[0];
            console.log("Agent:", agent.nom, agent.prenom);
            console.log("getAgentPosteOuEmploi returns:", getAgentPosteOuEmploi(agent));
        } else {
            console.log("Agent not found.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
