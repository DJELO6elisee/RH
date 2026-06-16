const db = require('./config/database');
async function run() {
    let res = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'echelons_agents'`);
    console.log('echelons_agents columns:', res.rows.map(r => r.column_name).join(', '));
    process.exit(0);
}
run();
