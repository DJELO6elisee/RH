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

async function addValidationColumns() {
    const client = await pool.connect();

    try {
        console.log('🔄 Ajout des colonnes de validation pour les nouveaux rôles...');

        // Lire le fichier SQL
        const sqlPath = path.join(__dirname, '..', 'database', 'add_validation_columns_chef_cabinet_dg_dc.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Exécuter le script SQL
        await client.query(sqlContent);

        console.log('✅ Colonnes de validation ajoutées avec succès !');

        // Vérifier les colonnes ajoutées
        const result = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'demandes' 
            AND (column_name LIKE '%chef_cabinet%' 
            OR column_name LIKE '%directeur_general%' 
            OR column_name LIKE '%directeur_central%')
            ORDER BY column_name
        `);

        console.log('\n📋 Colonnes ajoutées à la table demandes :');
        result.rows.forEach(column => {
            console.log(`- ${column.column_name} (${column.data_type}, nullable: ${column.is_nullable})`);
        });

        // Vérifier le nombre total de colonnes dans la table demandes
        const totalColumns = await client.query(`
            SELECT COUNT(*) as total 
            FROM information_schema.columns 
            WHERE table_name = 'demandes'
        `);

        console.log(`\n🎯 Total des colonnes dans la table demandes : ${totalColumns.rows[0].total}`);

    } catch (error) {
        console.error('❌ Erreur lors de l\'ajout des colonnes:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter le script
addValidationColumns()
    .then(() => {
        console.log('\n🎉 Script terminé avec succès !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });