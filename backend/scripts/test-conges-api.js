const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function testCongesSystem() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Vérification du système de gestion des congés...\n');

        // 1. Vérifier si la table agent_conges existe
        console.log('1️⃣ Vérification de la table agent_conges...');
        try {
            const checkTableQuery = `
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'agent_conges'
                );
            `;
            const tableExists = await client.query(checkTableQuery);
            if (tableExists.rows[0].exists) {
                console.log('✅ Table agent_conges existe');
                
                // Compter le nombre d'agents avec des congés
                const countQuery = `SELECT COUNT(*) as count FROM agent_conges WHERE annee = EXTRACT(YEAR FROM CURRENT_DATE)`;
                const countResult = await client.query(countQuery);
                console.log(`   📊 Nombre d'agents avec congés pour l'année en cours: ${countResult.rows[0].count}`);
            } else {
                console.log('❌ Table agent_conges N\'EXISTE PAS');
                console.log('   💡 Solution: Exécutez le script create_conges_table.sql');
            }
        } catch (error) {
            console.log('❌ Erreur lors de la vérification de la table:', error.message);
        }

        // 2. Vérifier si la table jours_feries existe
        console.log('\n2️⃣ Vérification de la table jours_feries...');
        try {
            const checkTableQuery = `
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'jours_feries'
                );
            `;
            const tableExists = await client.query(checkTableQuery);
            if (tableExists.rows[0].exists) {
                console.log('✅ Table jours_feries existe');
                
                // Compter le nombre de jours fériés
                const countQuery = `SELECT COUNT(*) as count FROM jours_feries`;
                const countResult = await client.query(countQuery);
                console.log(`   📊 Nombre de jours fériés: ${countResult.rows[0].count}`);
            } else {
                console.log('❌ Table jours_feries N\'EXISTE PAS');
                console.log('   💡 Solution: Exécutez le script create_jours_feries_table.sql');
            }
        } catch (error) {
            console.log('❌ Erreur lors de la vérification de la table:', error.message);
        }

        // 3. Vérifier si la fonction calculer_jours_ouvres existe
        console.log('\n3️⃣ Vérification de la fonction calculer_jours_ouvres...');
        try {
            const checkFunctionQuery = `
                SELECT EXISTS (
                    SELECT FROM pg_proc 
                    WHERE proname = 'calculer_jours_ouvres'
                );
            `;
            const functionExists = await client.query(checkFunctionQuery);
            if (functionExists.rows[0].exists) {
                console.log('✅ Fonction calculer_jours_ouvres existe');
                
                // Tester la fonction
                const testQuery = `SELECT calculer_jours_ouvres('2025-01-01'::DATE, '2025-01-10'::DATE) as jours`;
                const testResult = await client.query(testQuery);
                console.log(`   📊 Test: Jours ouvrés du 01/01/2025 au 10/01/2025 = ${testResult.rows[0].jours}`);
            } else {
                console.log('❌ Fonction calculer_jours_ouvres N\'EXISTE PAS');
                console.log('   💡 Solution: Exécutez le script create_function_jours_ouvres.sql');
            }
        } catch (error) {
            console.log('❌ Erreur lors de la vérification de la fonction:', error.message);
        }

        // 4. Vérifier un agent spécifique (s'il y en a un)
        console.log('\n4️⃣ Vérification d\'un agent exemple...');
        try {
            const agentQuery = `SELECT id, matricule, nom, prenom FROM agents LIMIT 1`;
            const agentResult = await client.query(agentQuery);
            
            if (agentResult.rows.length > 0) {
                const agent = agentResult.rows[0];
                console.log(`   Agent exemple: ${agent.nom} ${agent.prenom} (ID: ${agent.id}, Matricule: ${agent.matricule})`);
                
                const congesQuery = `
                    SELECT * FROM agent_conges 
                    WHERE id_agent = $1 AND annee = EXTRACT(YEAR FROM CURRENT_DATE)
                `;
                const congesResult = await client.query(congesQuery, [agent.id]);
                
                if (congesResult.rows.length > 0) {
                    const conges = congesResult.rows[0];
                    console.log(`   ✅ Congés trouvés: ${conges.jours_alloues} jours alloués, ${conges.jours_restants} jours restants`);
                } else {
                    console.log(`   ❌ Aucun congé trouvé pour cet agent pour l'année en cours`);
                    console.log(`   💡 Solution: Exécutez le script init_conges_agents.sql`);
                }
            } else {
                console.log('   ⚠️ Aucun agent trouvé dans la base de données');
            }
        } catch (error) {
            console.log('❌ Erreur lors de la vérification de l\'agent:', error.message);
        }

        console.log('\n✨ Vérification terminée!');
        console.log('\n💡 Si des éléments manquent, exécutez le script: node backend/scripts/init-systeme-conges.js');
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

testCongesSystem();

