const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration de la connexion (À MODIFIER avec vos identifiants de production)
const pool = new Pool({
    host: 'localhost', // ou l'adresse de votre serveur PostgreSQL
    port: 5432,
    database: 'ma_rh_db', // nom de votre base de données
    user: 'votre_utilisateur', // votre utilisateur PostgreSQL
    password: 'votre_mot_de_passe', // votre mot de passe
});

async function runMigration() {
    try {
        console.log('🚀 Début de la migration...\n');

        // Lire le fichier SQL de migration
        const migrationPath = path.join(__dirname, '../../MIGRATION_PRODUCTION.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Exécuter le script de migration
        await pool.query(migrationSQL);

        console.log('\n✅ Migration terminée avec succès !');
        
    } catch (error) {
        console.error('\n❌ Erreur lors de la migration:', error);
        console.error('Message:', error.message);
    } finally {
        await pool.end();
    }
}

runMigration();




















