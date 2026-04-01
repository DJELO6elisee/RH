const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

/**
 * Script pour trouver l'utilisateur de la base de données configuré
 * et vérifier ses permissions sur les tables de congés
 */

async function findDbUser() {
    const pool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    });

    const client = await pool.connect();
    
    try {
        console.log('🔍 Identification de l\'utilisateur de la base de données...\n');
        
        // Afficher l'utilisateur configuré
        console.log('📋 Utilisateur configuré dans .env:');
        console.log(`   DB_USER = ${process.env.DB_USER || 'NON DÉFINI'}\n`);
        
        // Récupérer l'utilisateur actuel de la connexion
        const currentUserResult = await client.query('SELECT current_user, session_user');
        console.log('📋 Utilisateur actuel de la connexion:');
        console.log(`   current_user = ${currentUserResult.rows[0].current_user}`);
        console.log(`   session_user = ${currentUserResult.rows[0].session_user}\n`);
        
        // Vérifier si les tables existent
        console.log('🔍 Vérification de l\'existence des tables...');
        const tablesCheck = await client.query(`
            SELECT tablename, tableowner 
            FROM pg_tables 
            WHERE tablename IN ('agent_conges', 'jours_feries')
            ORDER BY tablename
        `);
        
        if (tablesCheck.rows.length === 0) {
            console.log('❌ Les tables agent_conges et jours_feries n\'existent pas!');
            console.log('   💡 Solution: Exécutez d\'abord node scripts/init-systeme-conges.js\n');
        } else {
            console.log('✅ Tables trouvées:');
            console.table(tablesCheck.rows);
            
            // Vérifier les permissions sur agent_conges
            console.log('\n🔐 Vérification des permissions sur agent_conges...');
            try {
                const permissionsCheck = await client.query(`
                    SELECT 
                        grantee,
                        privilege_type
                    FROM information_schema.role_table_grants 
                    WHERE table_name = 'agent_conges'
                    ORDER BY grantee, privilege_type
                `);
                
                if (permissionsCheck.rows.length === 0) {
                    console.log('⚠️ Aucune permission trouvée sur agent_conges');
                    console.log('   💡 Solution: Exécutez node scripts/grant-permissions-conges.js\n');
                } else {
                    console.log('📋 Permissions trouvées:');
                    console.table(permissionsCheck.rows);
                    
                    // Vérifier si l'utilisateur actuel a les permissions
                    const currentUser = currentUserResult.rows[0].current_user;
                    const hasPermissions = permissionsCheck.rows.some(
                        row => row.grantee === currentUser || row.grantee === 'PUBLIC'
                    );
                    
                    if (!hasPermissions) {
                        console.log(`\n⚠️ L'utilisateur "${currentUser}" n'a pas de permissions explicites sur agent_conges`);
                        console.log('   💡 Solution: Exécutez node scripts/grant-permissions-conges.js');
                        console.log(`   Ou exécutez manuellement ces commandes SQL (en tant que SUPERUSER):`);
                        console.log(`   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_conges TO "${currentUser}";`);
                        console.log(`   GRANT USAGE, SELECT ON SEQUENCE agent_conges_id_seq TO "${currentUser}";\n`);
                    } else {
                        console.log(`\n✅ L'utilisateur "${currentUser}" a des permissions sur agent_conges`);
                    }
                }
            } catch (error) {
                if (error.message.includes('permission denied')) {
                    console.log(`\n❌ Erreur de permission lors de la vérification: ${error.message}`);
                    console.log(`   💡 Cela confirme que l'utilisateur "${currentUserResult.rows[0].current_user}" n'a pas les permissions nécessaires`);
                    console.log(`   Solution: Exécutez les commandes GRANT avec un compte SUPERUSER\n`);
                } else {
                    throw error;
                }
            }
        }
        
        // Tester un accès simple à la table
        console.log('🧪 Test d\'accès à la table agent_conges...');
        try {
            const testQuery = await client.query('SELECT COUNT(*) FROM agent_conges LIMIT 1');
            console.log('✅ Accès à la table agent_conges réussi!');
            console.log(`   Nombre d\'enregistrements: ${testQuery.rows[0].count}`);
        } catch (error) {
            if (error.message.includes('permission denied')) {
                console.log(`\n❌ Erreur: ${error.message}`);
                console.log(`   💡 L'utilisateur "${currentUserResult.rows[0].current_user}" n'a pas la permission SELECT sur agent_conges`);
                console.log(`   Solution: Exécutez cette commande SQL en tant que SUPERUSER:`);
                console.log(`   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_conges TO "${currentUserResult.rows[0].current_user}";\n`);
            } else {
                throw error;
            }
        }
        
        console.log('\n📝 RÉSUMÉ:');
        console.log(`   Utilisateur configuré: ${process.env.DB_USER || 'NON DÉFINI'}`);
        console.log(`   Utilisateur actuel: ${currentUserResult.rows[0].current_user}`);
        console.log(`   Base de données: ${process.env.DB_NAME || 'NON DÉFINIE'}`);
        console.log(`   Host: ${process.env.DB_HOST || 'NON DÉFINI'}`);
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        if (error.message.includes('permission denied')) {
            console.error('\n💡 SOLUTION:');
            console.error('   Vous devez exécuter les commandes GRANT avec un compte SUPERUSER PostgreSQL');
            console.error('   Connectez-vous à PostgreSQL avec psql ou pgAdmin et exécutez:');
            console.error('   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_conges TO votre_utilisateur;');
        }
    } finally {
        client.release();
        await pool.end();
    }
}

findDbUser();

