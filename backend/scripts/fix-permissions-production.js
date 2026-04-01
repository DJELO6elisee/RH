const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

/**
 * Script pour identifier et accorder les permissions au bon utilisateur
 * Ce script essaie plusieurs utilisateurs possibles
 */

async function fixPermissionsProduction() {
    // Essayer de se connecter avec l'utilisateur configuré
    const pool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    });

    const client = await pool.connect();
    
    try {
        console.log('🔍 Identification de l\'utilisateur utilisé par l\'application...\n');
        
        // Obtenir l'utilisateur actuel
        const currentUserResult = await client.query('SELECT current_user, session_user');
        const currentUser = currentUserResult.rows[0].current_user;
        const sessionUser = currentUserResult.rows[0].session_user;
        
        console.log('📋 Informations de connexion:');
        console.log(`   DB_USER (from .env): ${process.env.DB_USER || 'NON DÉFINI'}`);
        console.log(`   current_user: ${currentUser}`);
        console.log(`   session_user: ${sessionUser}\n`);
        
        // Utilisateur cible (celui qui a besoin des permissions)
        const targetUser = currentUser || process.env.DB_USER || sessionUser;
        
        console.log(`🎯 Utilisateur cible pour les permissions: ${targetUser}\n`);
        
        // Vérifier si les tables existent
        console.log('🔍 Vérification de l\'existence des tables...');
        const tablesCheck = await client.query(`
            SELECT tablename FROM pg_tables 
            WHERE tablename IN ('agent_conges', 'jours_feries')
            ORDER BY tablename
        `);
        
        if (tablesCheck.rows.length === 0) {
            console.error('❌ Les tables agent_conges et jours_feries n\'existent pas!');
            console.error('   💡 Exécutez d\'abord: node scripts/init-systeme-conges.js');
            process.exit(1);
        }
        
        console.log('✅ Tables trouvées:');
        tablesCheck.rows.forEach(row => {
            console.log(`   - ${row.tablename}`);
        });
        console.log('');
        
        // Vérifier les permissions actuelles
        console.log('🔐 Vérification des permissions actuelles...');
        try {
            const permissionsCheck = await client.query(`
                SELECT grantee, privilege_type 
                FROM information_schema.role_table_grants 
                WHERE table_name = 'agent_conges'
                  AND grantee = $1
                ORDER BY privilege_type
            `, [targetUser]);
            
            if (permissionsCheck.rows.length >= 4) {
                console.log('✅ L\'utilisateur a déjà les permissions nécessaires:');
                permissionsCheck.rows.forEach(row => {
                    console.log(`   - ${row.privilege_type}`);
                });
                console.log('\n✨ Les permissions sont déjà accordées!');
                
                // Tester l'accès
                try {
                    const testQuery = await client.query('SELECT COUNT(*) FROM agent_conges LIMIT 1');
                    console.log('✅ Test d\'accès à la table réussi!');
                    console.log(`   Nombre d'enregistrements: ${testQuery.rows[0].count}`);
                } catch (error) {
                    console.error('❌ Erreur lors du test d\'accès:', error.message);
                }
                
                return;
            }
        } catch (error) {
            console.log('⚠️ Impossible de vérifier les permissions:', error.message);
        }
        
        // Essayer d'accorder les permissions
        console.log(`\n🔧 Tentative d\'attribution des permissions à "${targetUser}"...`);
        console.log('⚠️  NOTE: Vous devez être connecté en tant que SUPERUSER pour accorder les permissions.\n');
        
        try {
            // Fonction pour échapper les identifiants SQL
            const escapeIdentifier = (id) => `"${id.replace(/"/g, '""')}"`;
            const escapedUser = escapeIdentifier(targetUser);
            
            // Accorder les permissions
            await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_conges TO ${escapedUser}`);
            await client.query(`GRANT USAGE, SELECT ON SEQUENCE agent_conges_id_seq TO ${escapedUser}`);
            await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE jours_feries TO ${escapedUser}`);
            await client.query(`GRANT USAGE, SELECT ON SEQUENCE jours_feries_id_seq TO ${escapedUser}`);
            await client.query(`GRANT EXECUTE ON FUNCTION calculer_jours_ouvres(DATE, DATE) TO ${escapedUser}`);
            
            console.log('✅ Permissions accordées avec succès!\n');
            
        } catch (error) {
            if (error.message.includes('permission denied') || error.message.includes('must be owner')) {
                console.error('\n❌ ERREUR: Vous n\'avez pas les permissions pour accorder les permissions.');
                console.error('   Cela signifie que l\'utilisateur actuel n\'est pas un SUPERUSER.\n');
                console.error('💡 SOLUTION:');
                console.error('   1. Connectez-vous à PostgreSQL avec un compte SUPERUSER (généralement "postgres")');
                console.error('   2. Exécutez ces commandes SQL dans phpPgAdmin ou psql:\n');
                
                const escapeIdentifier = (id) => `"${id.replace(/"/g, '""')}"`;
                const escapedUser = escapeIdentifier(targetUser);
                
                console.error(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_conges TO ${escapedUser};`);
                console.error(`GRANT USAGE, SELECT ON SEQUENCE agent_conges_id_seq TO ${escapedUser};`);
                console.error(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE jours_feries TO ${escapedUser};`);
                console.error(`GRANT USAGE, SELECT ON SEQUENCE jours_feries_id_seq TO ${escapedUser};`);
                console.error(`GRANT EXECUTE ON FUNCTION calculer_jours_ouvres(DATE, DATE) TO ${escapedUser};`);
                
                console.error('\n   Ou exécutez le fichier SQL: backend/database/ACCORDER_PERMISSIONS_ISEGROUP.sql');
                
            } else {
                throw error;
            }
        }
        
        // Vérifier que les permissions ont été accordées
        console.log('\n🔍 Vérification finale des permissions...');
        const finalCheck = await client.query(`
            SELECT grantee, privilege_type 
            FROM information_schema.role_table_grants 
            WHERE table_name = 'agent_conges'
              AND grantee = $1
            ORDER BY privilege_type
        `, [targetUser]);
        
        if (finalCheck.rows.length >= 4) {
            console.log('✅ Permissions vérifiées avec succès:');
            finalCheck.rows.forEach(row => {
                console.log(`   - ${row.privilege_type}`);
            });
        } else {
            console.warn('⚠️  Les permissions n\'ont pas été accordées correctement.');
            console.warn('   Vous devez les accorder manuellement avec un compte SUPERUSER.');
        }
        
        // Vérifier les données
        console.log('\n📊 Vérification des données...');
        const dataCheck = await client.query(`
            SELECT 
                COUNT(*) as total_agents,
                SUM(jours_alloues) as total_jours_alloues
            FROM agent_conges
            WHERE annee = EXTRACT(YEAR FROM CURRENT_DATE)
        `);
        
        if (dataCheck.rows[0].total_agents > 0) {
            console.log(`✅ ${dataCheck.rows[0].total_agents} agents ont des congés initialisés`);
            console.log(`   Total jours alloués: ${dataCheck.rows[0].total_jours_alloues}`);
        } else {
            console.warn('⚠️  Aucun agent n\'a de congés initialisés pour l\'année en cours.');
            console.warn('   💡 Exécutez: node scripts/init-systeme-conges.js');
        }
        
        console.log('\n✨ Script terminé!');
        console.log(`\n📝 RÉSUMÉ:`);
        console.log(`   Utilisateur identifié: ${targetUser}`);
        console.log(`   Tables existantes: ✅`);
        if (finalCheck.rows.length >= 4) {
            console.log(`   Permissions accordées: ✅`);
        } else {
            console.log(`   Permissions accordées: ❌ (à faire manuellement)`);
        }
        if (dataCheck.rows[0].total_agents > 0) {
            console.log(`   Données initialisées: ✅`);
        } else {
            console.log(`   Données initialisées: ❌ (à faire)`);
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

fixPermissionsProduction();

