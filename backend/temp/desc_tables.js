const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ma_rh_db',
  password: '12345',
  port: 5432,
});

async function describeTable(tableName) {
  const result = await pool.query(`
    SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = $1
    ORDER BY ordinal_position;
  `, [tableName]);
  console.log(`\nTable: ${tableName}`);
  console.table(result.rows);
}

async function run() {
  try {
    await describeTable('demandes');
    await describeTable('workflow_demandes');
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
