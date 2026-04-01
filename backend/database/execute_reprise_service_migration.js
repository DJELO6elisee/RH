const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration de la connexion depuis les variables d'environnement
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ma_rh_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '12345',
});

async function executeMigration() {
    const client = await pool.connect();
    
    try {
        console.log('\n================================================================================');
        console.log('🚀 MIGRATION: Ajout des colonnes pour certificat de reprise de service');
        console.log('================================================================================\n');
        
        // Lire le fichier SQL de migration
        const migrationPath = path.join(__dirname, 'add_certificat_reprise_service_fields.sql');
        console.log(`📄 Lecture du fichier: ${migrationPath}\n`);
        
        const sqlContent = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('🔄 Exécution de la migration...\n');
        
        const startTime = Date.now();
        await client.query(sqlContent);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log(`\n✅ Migration terminée avec succès en ${duration}s!\n`);
        
        // Vérifier que les colonnes ont été ajoutées
        const verifyQuery = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'demandes'
            AND column_name IN ('date_reprise_service', 'date_fin_conges')
            ORDER BY column_name;
        `;
        
        const result = await client.query(verifyQuery);
        
        if (result.rows.length === 2) {
            console.log('✅ Vérification: Les colonnes ont été ajoutées avec succès:\n');
            result.rows.forEach(col => {
                console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
            });
        } else {
            console.log('⚠️  Attention: Certaines colonnes n\'ont pas été trouvées');
            console.log(`   Colonnes trouvées: ${result.rows.length}/2`);
        }
        
        console.log('\n================================================================================');
        console.log('✅ Migration complétée avec succès!');
        console.log('================================================================================\n');
        
    } catch (error) {
        console.error('\n❌ Erreur lors de la migration:', error.message);
        console.error('Détails:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter la migration
executeMigration();

