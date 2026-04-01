const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ma_rh_db',
    password: '12345',
    port: 5432,
});

async function checkDirectionsStructure() {
    const client = await pool.connect();

    try {
        console.log('🔍 Vérification de la structure de la table directions...\n');

        // Vérifier la structure de la table directions
        const structureQuery = `
            SELECT 
                column_name, 
                data_type, 
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = 'directions' 
            ORDER BY ordinal_position
        `;

        const structureResult = await client.query(structureQuery);
        console.log('📋 Structure de la table directions:');
        structureResult.rows.forEach((col, index) => {
            console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
        });

        // Vérifier quelques données de la table directions
        console.log('\n📊 Exemples de données de la table directions:');
        const dataQuery = `
            SELECT * FROM directions LIMIT 5
        `;

        const dataResult = await client.query(dataQuery);
        if (dataResult.rows.length > 0) {
            console.log('   Colonnes disponibles:', Object.keys(dataResult.rows[0]).join(', '));
            dataResult.rows.forEach((row, index) => {
                console.log(`   ${index + 1}. ID: ${row.id}, Libellé: ${row.libelle || 'N/A'}`);
            });
        } else {
            console.log('   Aucune donnée trouvée dans la table directions');
        }

        // Vérifier la structure de la table sous_directions
        console.log('\n📋 Structure actuelle de la table sous_directions:');
        const sousDirectionsQuery = `
            SELECT 
                column_name, 
                data_type, 
                is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'sous_directions' 
            ORDER BY ordinal_position
        `;

        const sousDirectionsResult = await client.query(sousDirectionsQuery);
        sousDirectionsResult.rows.forEach((col, index) => {
            console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
        });

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

checkDirectionsStructure();