const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ma_rh_db',
    password: '12345',
    port: 5432,
});

async function fixFunction() {
    const client = await pool.connect();

    try {
        console.log('🔧 Correction de la fonction get_hierarchy_for_agent...');

        // Lire le fichier SQL
        const sqlPath = path.join(__dirname, '../database/fix_function_id_service.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Exécuter le script SQL
        await client.query(sqlContent);

        console.log('✅ Fonction corrigée avec succès !');

        // Tester la fonction corrigée
        console.log('\n🧪 Test de la fonction corrigée...');

        const testQuery = `
            SELECT get_hierarchy_for_agent(1) as result
        `;

        const testResult = await client.query(testQuery);
        console.log('Résultat du test:', testResult.rows[0].result);

    } catch (error) {
        console.error('❌ Erreur lors de la correction:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter le script
fixFunction()
    .then(() => {
        console.log('\n🎉 Script terminé avec succès !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });