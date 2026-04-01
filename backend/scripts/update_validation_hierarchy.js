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

async function updateValidationHierarchy() {
    const client = await pool.connect();

    try {
        console.log('🔄 Mise à jour de la hiérarchie de validation...');

        // Lire le fichier SQL
        const sqlPath = path.join(__dirname, '../database/update_validation_hierarchy.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Exécuter le script SQL
        await client.query(sqlContent);

        console.log('✅ Hiérarchie de validation mise à jour avec succès !');

        // Vérifier que les colonnes ont été ajoutées
        const checkColumnsQuery = `
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'demandes' 
            AND column_name LIKE '%sous_directeur%' 
            OR column_name LIKE '%directeur%'
            OR column_name LIKE '%dir_cabinet%'
            OR column_name LIKE '%chef_cabinet%'
            ORDER BY column_name
        `;

        const result = await client.query(checkColumnsQuery);

        console.log('\n📋 Colonnes de validation disponibles :');
        result.rows.forEach((row, index) => {
            console.log(`${index + 1}. ${row.column_name} (${row.data_type})`);
        });

        // Vérifier la structure complète de la table demandes
        const tableStructureQuery = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'demandes' 
            ORDER BY ordinal_position
        `;

        const structureResult = await client.query(tableStructureQuery);

        console.log('\n🏗️ Structure complète de la table demandes :');
        structureResult.rows.forEach((row, index) => {
            console.log(`${index + 1}. ${row.column_name} (${row.data_type}) - ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

    } catch (error) {
        console.error('❌ Erreur lors de la mise à jour de la hiérarchie:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter le script
updateValidationHierarchy()
    .then(() => {
        console.log('\n🎉 Script terminé avec succès !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });