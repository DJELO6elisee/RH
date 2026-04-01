/**
 * Script pour corriger les permissions de la base de données
 * Exécute les requêtes SQL nécessaires pour donner les permissions sur les séquences
 */

const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function fixPermissions() {
    const client = await pool.connect();

    try {
        console.log('🔧 Correction des permissions de la base de données...');

        // Commencer une transaction
        await client.query('BEGIN');

        // 1. Permissions spécifiques pour la séquence sessions_id_seq
        console.log('📝 Accordant les permissions sur sessions_id_seq...');
        await client.query('GRANT USAGE, SELECT ON SEQUENCE sessions_id_seq TO PUBLIC');

        // 2. Permissions sur la table sessions
        console.log('📝 Accordant les permissions sur la table sessions...');
        await client.query('GRANT INSERT, SELECT, UPDATE, DELETE ON TABLE sessions TO PUBLIC');

        // 3. Permissions sur toutes les séquences
        console.log('📝 Accordant les permissions sur toutes les séquences...');
        const sequences = await client.query(`
            SELECT sequence_name 
            FROM information_schema.sequences 
            WHERE sequence_schema = 'public'
        `);

        for (const row of sequences.rows) {
            const seqName = row.sequence_name;
            try {
                await client.query(`GRANT USAGE, SELECT ON SEQUENCE ${seqName} TO PUBLIC`);
                console.log(`  ✅ ${seqName}`);
            } catch (err) {
                console.log(`  ⚠️ ${seqName}: ${err.message}`);
            }
        }

        // 4. Permissions sur toutes les tables
        console.log('📝 Accordant les permissions sur toutes les tables...');
        const tables = await client.query(`
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public'
        `);

        for (const row of tables.rows) {
            const tableName = row.tablename;
            try {
                await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ${tableName} TO PUBLIC`);
                console.log(`  ✅ ${tableName}`);
            } catch (err) {
                console.log(`  ⚠️ ${tableName}: ${err.message}`);
            }
        }

        // Valider la transaction
        await client.query('COMMIT');

        console.log('\n✅ Permissions corrigées avec succès !');
        console.log('\n📌 Note: Si vous utilisez un utilisateur spécifique (pas PUBLIC),');
        console.log('   vous devrez peut-être modifier le script pour utiliser cet utilisateur.');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erreur lors de la correction des permissions:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Exécution du script
if (require.main === module) {
    fixPermissions()
        .then(() => {
            console.log('✨ Script terminé');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Échec du script:', error);
            process.exit(1);
        });
}

module.exports = fixPermissions;