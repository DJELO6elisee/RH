const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ma_rh_db',
    password: '12345',
    port: 5432,
});

async function checkTableStructure() {
    const client = await pool.connect();

    try {
        console.log('🔍 Vérification de la structure de la table agents...');

        // Vérifier la structure de la table agents
        const structureQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'agents' 
            ORDER BY ordinal_position
        `;

        const structureResult = await client.query(structureQuery);

        console.log('\n📋 Structure de la table agents :');
        structureResult.rows.forEach((column, index) => {
            console.log(`${index + 1}. ${column.column_name} (${column.data_type}, nullable: ${column.is_nullable})`);
        });

        // Vérifier un agent existant pour voir les champs requis
        const sampleQuery = `
            SELECT * FROM agents 
            WHERE id = (SELECT MIN(id) FROM agents)
            LIMIT 1
        `;

        const sampleResult = await client.query(sampleQuery);

        if (sampleResult.rows.length > 0) {
            console.log('\n📋 Exemple d\'agent existant :');
            const agent = sampleResult.rows[0];
            Object.keys(agent).forEach(key => {
                console.log(`   ${key}: ${agent[key]}`);
            });
        }

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter le script
checkTableStructure()
    .then(() => {
        console.log('\n🎉 Script terminé !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });