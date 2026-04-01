const pool = require('../config/database');

async function checkRequiredTables() {
    console.log('🔍 Vérification des tables requises pour le formulaire de services...\n');

    try {
        // Vérifier l'existence des tables
        const tables = ['directions', 'sous_directions', 'agents', 'services'];

        for (const table of tables) {
            try {
                const query = `SELECT COUNT(*) as count FROM ${table}`;
                const result = await pool.query(query);
                console.log(`✅ Table ${table}: ${result.rows[0].count} entrées`);
            } catch (error) {
                console.log(`❌ Table ${table}: ERREUR - ${error.message}`);
            }
        }

        // Vérifier les données dans directions
        console.log('\n📋 Directions disponibles:');
        try {
            const directionsQuery = 'SELECT id, libelle FROM directions ORDER BY libelle';
            const directionsResult = await pool.query(directionsQuery);

            if (directionsResult.rows.length > 0) {
                directionsResult.rows.forEach(row => {
                    console.log(`   - ID: ${row.id}, Libellé: ${row.libelle}`);
                });
            } else {
                console.log('   ⚠️ Aucune direction trouvée');
            }
        } catch (error) {
            console.log(`   ❌ Erreur lors de la récupération des directions: ${error.message}`);
        }

        // Vérifier les données dans sous_directions
        console.log('\n📋 Sous-directions disponibles:');
        try {
            const sousDirectionsQuery = 'SELECT id, libelle FROM sous_directions ORDER BY libelle';
            const sousDirectionsResult = await pool.query(sousDirectionsQuery);

            if (sousDirectionsResult.rows.length > 0) {
                sousDirectionsResult.rows.forEach(row => {
                    console.log(`   - ID: ${row.id}, Libellé: ${row.libelle}`);
                });
            } else {
                console.log('   ⚠️ Aucune sous-direction trouvée');
            }
        } catch (error) {
            console.log(`   ❌ Erreur lors de la récupération des sous-directions: ${error.message}`);
        }

        // Vérifier les agents disponibles
        console.log('\n📋 Agents disponibles (premiers 5):');
        try {
            const agentsQuery = 'SELECT id, nom, prenom, matricule FROM agents ORDER BY nom LIMIT 5';
            const agentsResult = await pool.query(agentsQuery);

            if (agentsResult.rows.length > 0) {
                agentsResult.rows.forEach(row => {
                    console.log(`   - ID: ${row.id}, ${row.prenom} ${row.nom} (${row.matricule})`);
                });
            } else {
                console.log('   ⚠️ Aucun agent trouvé');
            }
        } catch (error) {
            console.log(`   ❌ Erreur lors de la récupération des agents: ${error.message}`);
        }

        // Tester l'API des services
        console.log('\n🧪 Test de l\'API des services...');
        try {
            const servicesQuery = 'SELECT COUNT(*) as count FROM services';
            const servicesResult = await pool.query(servicesQuery);
            console.log(`   ✅ API services: ${servicesResult.rows[0].count} services`);
        } catch (error) {
            console.log(`   ❌ Erreur API services: ${error.message}`);
        }

        console.log('\n═══════════════════════════════════════════════════\n');
        console.log('🔍 DIAGNOSTIC TERMINÉ');

        console.log('\n💡 Solutions possibles si le formulaire ne s\'affiche pas:');
        console.log('1. Vérifier la console du navigateur (F12) pour les erreurs JavaScript');
        console.log('2. S\'assurer que le backend est démarré et accessible');
        console.log('3. Vérifier que les tables directions et sous_directions contiennent des données');
        console.log('4. Tester avec la version simplifiée du formulaire');
        console.log('5. Vérifier les permissions de l\'utilisateur connecté');

        process.exit(0);

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
        process.exit(1);
    }
}

// Exécuter le script
checkRequiredTables();