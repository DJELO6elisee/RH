const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ma_rh_db',
    password: '12345',
    port: 5432,
});

async function checkDirections() {
    const client = await pool.connect();

    try {
        console.log('🔍 Vérification des directions disponibles...');

        // Vérifier les directions
        const directionsQuery = `
            SELECT id, libelle, description
            FROM directions 
            ORDER BY id
        `;

        const directionsResult = await client.query(directionsQuery);

        console.log('\n📋 Directions disponibles :');
        directionsResult.rows.forEach((direction, index) => {
            console.log(`${index + 1}. ID: ${direction.id} - ${direction.libelle}`);
            if (direction.description) {
                console.log(`   Description: ${direction.description}`);
            }
        });

        if (directionsResult.rows.length === 0) {
            console.log('\n⚠️ Aucune direction trouvée. Création d\'une direction par défaut...');

            const createDirectionQuery = `
                INSERT INTO directions (libelle, description, created_at, updated_at)
                VALUES ('Direction Générale', 'Direction par défaut pour les tests', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id
            `;

            const createResult = await client.query(createDirectionQuery);
            const directionId = createResult.rows[0].id;

            console.log(`✅ Direction créée avec l'ID: ${directionId}`);
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
checkDirections()
    .then(() => {
        console.log('\n🎉 Script terminé !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });