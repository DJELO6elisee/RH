const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function grantPermissionsConges() {
    const client = await pool.connect();
    
    try {
        console.log('🔐 Attribution des permissions sur les tables et fonctions de gestion des congés...\n');
        
        const dbUser = process.env.DB_USER || 'postgres';
        console.log(`👤 Utilisateur de la base de données: ${dbUser}\n`);
        
        // Fonction pour échapper les identifiants SQL
        const escapeIdentifier = (id) => `"${id.replace(/"/g, '""')}"`;
        const escapedUser = escapeIdentifier(dbUser);
        
        // Permissions sur la table agent_conges
        console.log('📋 Attribution des permissions sur agent_conges...');
        await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_conges TO ${escapedUser}`);
        await client.query(`GRANT USAGE, SELECT ON SEQUENCE agent_conges_id_seq TO ${escapedUser}`);
        console.log('✅ Permissions accordées sur agent_conges');
        
        // Permissions sur la table jours_feries
        console.log('📋 Attribution des permissions sur jours_feries...');
        await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE jours_feries TO ${escapedUser}`);
        await client.query(`GRANT USAGE, SELECT ON SEQUENCE jours_feries_id_seq TO ${escapedUser}`);
        console.log('✅ Permissions accordées sur jours_feries');
        
        // Permissions sur la fonction calculer_jours_ouvres
        console.log('📋 Attribution des permissions sur calculer_jours_ouvres...');
        await client.query(`GRANT EXECUTE ON FUNCTION calculer_jours_ouvres(DATE, DATE) TO ${escapedUser}`);
        console.log('✅ Permissions accordées sur calculer_jours_ouvres');
        
        console.log('\n✨ Toutes les permissions ont été accordées avec succès!');
        
        // Vérifier les permissions
        console.log('\n🔍 Vérification des permissions...');
        const tablesCheck = await client.query(`
            SELECT tablename, tableowner 
            FROM pg_tables 
            WHERE tablename IN ('agent_conges', 'jours_feries')
        `);
        console.table(tablesCheck.rows);
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'attribution des permissions:', error);
        
        if (error.message.includes('permission denied')) {
            console.error('\n💡 Solution: Exécutez ce script avec un utilisateur ayant les privilèges SUPERUSER');
            console.error('   Ou exécutez manuellement le script SQL: backend/database/grant_permissions_conges.sql');
        }
        
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

grantPermissionsConges().catch(error => {
    console.error('❌ Échec:', error);
    process.exit(1);
});

