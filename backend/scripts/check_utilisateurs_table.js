const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ma_rh_db',
    password: '12345',
    port: 5432,
});

async function checkUtilisateursTable() {
    const client = await pool.connect();

    try {
        console.log('🔍 Vérification de la structure de la table utilisateurs...');

        // Vérifier la structure de la table utilisateurs
        const structureQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'utilisateurs' 
            ORDER BY ordinal_position
        `;

        const structureResult = await client.query(structureQuery);

        console.log('\n📋 Structure de la table utilisateurs :');
        structureResult.rows.forEach((column, index) => {
            console.log(`${index + 1}. ${column.column_name} (${column.data_type}, nullable: ${column.is_nullable})`);
        });

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter le script
checkUtilisateursTable()
    .then(() => {
        console.log('\n🎉 Script terminé !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });