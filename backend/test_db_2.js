const pool = require('./config/database');

async function test() {
    try {
        const res = await pool.query("SELECT * FROM utilisateurs WHERE username = '343470L'");
        console.log("User:", res.rows);
        
        const r = await pool.query("SELECT * FROM roles WHERE id = $1", [res.rows[0].id_role]);
        console.log("Role:", r.rows);
        
        const a = await pool.query("SELECT * FROM agents WHERE id = $1", [res.rows[0].id_agent]);
        console.log("Agent:", a.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
test();
