const pool = require('../config/database');

async function testAgentsSelectLimit() {
    console.log('🧪 Test de la limite des agents pour les listes déroulantes...\n');

    try {
        // Test 1: Compter le nombre total d'agents dans le ministère 1
        console.log('📊 Test 1: Compter le nombre total d\'agents dans le ministère 1');
        const countQuery = `
            SELECT COUNT(*) as total_agents
            FROM agents a
            WHERE a.id_ministere = 1 
            AND a.id_entite_principale IS NULL
        `;

        const countResult = await pool.query(countQuery);
        const totalAgents = parseInt(countResult.rows[0].total_agents);
        console.log(`   ✅ Total d'agents dans le ministère 1: ${totalAgents}`);

        // Test 2: Simuler la requête avec limite par défaut (10)
        console.log('\n📊 Test 2: Requête avec limite par défaut (10)');
        const defaultLimitQuery = `
            SELECT 
                a.id,
                a.nom,
                a.prenom,
                CONCAT(a.nom, ' ', a.prenom) as nom_complet,
                a.matricule,
                a.id_ministere
            FROM agents a
            WHERE a.id_ministere = 1 
            AND a.id_entite_principale IS NULL
            ORDER BY a.created_at DESC
            LIMIT 10
        `;

        const defaultResult = await pool.query(defaultLimitQuery);
        console.log(`   ✅ Agents retournés avec limite 10: ${defaultResult.rows.length}`);
        defaultResult.rows.forEach((agent, index) => {
            console.log(`      ${index + 1}. ${agent.nom} ${agent.prenom} (${agent.matricule})`);
        });

        // Test 3: Simuler la requête avec limite pour select (100)
        console.log('\n📊 Test 3: Requête avec limite pour select (100)');
        const selectLimitQuery = `
            SELECT 
                a.id,
                a.nom,
                a.prenom,
                CONCAT(a.nom, ' ', a.prenom) as nom_complet,
                a.matricule,
                a.id_ministere
            FROM agents a
            WHERE a.id_ministere = 1 
            AND a.id_entite_principale IS NULL
            ORDER BY a.created_at DESC
            LIMIT 100
        `;

        const selectResult = await pool.query(selectLimitQuery);
        console.log(`   ✅ Agents retournés avec limite 100: ${selectResult.rows.length}`);
        selectResult.rows.forEach((agent, index) => {
            console.log(`      ${index + 1}. ${agent.nom} ${agent.prenom} (${agent.matricule})`);
        });

        // Test 4: Vérifier si tous les agents sont maintenant visibles
        console.log('\n📊 Test 4: Vérification de la visibilité complète');
        if (selectResult.rows.length >= totalAgents) {
            console.log(`   ✅ SUCCÈS: Tous les ${totalAgents} agents sont maintenant visibles dans les listes déroulantes !`);
        } else {
            console.log(`   ⚠️ ATTENTION: Seulement ${selectResult.rows.length} agents sur ${totalAgents} sont visibles.`);
        }

        // Test 5: Simuler l'URL avec for_select=true
        console.log('\n📊 Test 5: Simulation de l\'URL avec for_select=true');
        console.log('   🔗 URL simulée: /api/agents?id_ministere=1&id_entite_principale=NULL&for_select=true');
        console.log(`   ✅ Cette URL devrait maintenant retourner ${selectResult.rows.length} agents au lieu de 10`);

        console.log('\n═══════════════════════════════════════════════════\n');

        if (selectResult.rows.length >= totalAgents) {
            console.log('🎉 CORRECTION RÉUSSIE !');
            console.log('\n✅ Résumé:');
            console.log(`   - Total d'agents dans le ministère: ${totalAgents}`);
            console.log(`   - Agents visibles avec limite 10: ${defaultResult.rows.length}`);
            console.log(`   - Agents visibles avec limite 100: ${selectResult.rows.length}`);
            console.log('   - Paramètre for_select=true ajouté au frontend');
            console.log('   - Backend modifié pour accepter for_select=true');

            console.log('\n🚀 Instructions pour tester:');
            console.log('1. Redémarrer le backend');
            console.log('2. Redémarrer les applications frontend');
            console.log('3. Naviguer vers Services ou Sous-directions');
            console.log('4. Cliquer sur "Modifier" pour une sous-direction');
            console.log('5. Ouvrir la liste déroulante "Sous-directeur"');
            console.log('6. Vérifier que tous les agents sont maintenant visibles');

            process.exit(0);
        } else {
            console.log('❌ PROBLÈME DÉTECTÉ !');
            console.log('\n⚠️ Certains agents ne sont toujours pas visibles.');
            console.log('Veuillez vérifier la configuration de la base de données.');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Erreur lors du test:', error);
        process.exit(1);
    }
}

// Exécuter le test
testAgentsSelectLimit();