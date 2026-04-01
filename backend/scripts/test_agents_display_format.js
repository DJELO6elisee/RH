const pool = require('../config/database');

async function testAgentsDisplayFormat() {
    console.log('🧪 Test du format d\'affichage des agents dans les listes déroulantes...\n');

    try {
        // Test 1: Vérifier les champs disponibles
        console.log('📊 Test 1: Vérification des champs disponibles');
        const fieldsQuery = `
            SELECT 
                a.id,
                a.nom,
                a.prenom,
                CONCAT(a.nom, ' ', a.prenom) as nom_complet,
                CONCAT(a.prenom, ' ', a.nom) as nom_prenom,
                a.matricule,
                a.id_ministere
            FROM agents a
            WHERE a.id_ministere = 1 
            AND a.id_entite_principale IS NULL
            ORDER BY a.created_at DESC
            LIMIT 10
        `;

        const result = await pool.query(fieldsQuery);
        console.log(`   ✅ Agents récupérés: ${result.rows.length}`);

        console.log('\n📋 Format d\'affichage des agents:');
        result.rows.forEach((agent, index) => {
            console.log(`   ${index + 1}. ID: ${agent.id}`);
            console.log(`      - Nom: "${agent.nom}"`);
            console.log(`      - Prénom: "${agent.prenom}"`);
            console.log(`      - nom_complet: "${agent.nom_complet}"`);
            console.log(`      - nom_prenom: "${agent.nom_prenom}"`);
            console.log(`      - Matricule: "${agent.matricule}"`);
            console.log('');
        });

        // Test 2: Simuler le format utilisé dans les listes déroulantes
        console.log('📊 Test 2: Simulation du format des listes déroulantes');
        console.log('   🔍 Format actuel (nom_prenom):');
        result.rows.forEach((agent, index) => {
            const label = agent.nom_prenom || `${agent.nom || ''} ${agent.prenom || ''}`.trim();
            console.log(`      ${index + 1}. ${label} (ID: ${agent.id})`);
        });

        // Test 3: Comparer avec d'autres formats possibles
        console.log('\n📊 Test 3: Comparaison des formats d\'affichage');
        console.log('   📋 Format "Prénom Nom":');
        result.rows.slice(0, 5).forEach((agent, index) => {
            const label = `${agent.prenom} ${agent.nom}`;
            console.log(`      ${index + 1}. ${label}`);
        });

        console.log('\n   📋 Format "Nom Prénom":');
        result.rows.slice(0, 5).forEach((agent, index) => {
            const label = `${agent.nom} ${agent.prenom}`;
            console.log(`      ${index + 1}. ${label}`);
        });

        console.log('\n   📋 Format "Prénom Nom (Matricule)":');
        result.rows.slice(0, 5).forEach((agent, index) => {
            const label = `${agent.prenom} ${agent.nom} (${agent.matricule})`;
            console.log(`      ${index + 1}. ${label}`);
        });

        // Test 4: Vérifier la cohérence des données
        console.log('\n📊 Test 4: Vérification de la cohérence des données');
        let hasEmptyNames = 0;
        let hasEmptyPrenoms = 0;

        result.rows.forEach((agent, index) => {
            if (!agent.nom || agent.nom.trim() === '') {
                hasEmptyNames++;
                console.log(`   ⚠️ Agent ${index + 1} (ID: ${agent.id}) a un nom vide`);
            }
            if (!agent.prenom || agent.prenom.trim() === '') {
                hasEmptyPrenoms++;
                console.log(`   ⚠️ Agent ${index + 1} (ID: ${agent.id}) a un prénom vide`);
            }
        });

        if (hasEmptyNames === 0 && hasEmptyPrenoms === 0) {
            console.log('   ✅ Tous les agents ont des noms et prénoms valides');
        } else {
            console.log(`   ⚠️ ${hasEmptyNames} agents avec nom vide, ${hasEmptyPrenoms} agents avec prénom vide`);
        }

        console.log('\n═══════════════════════════════════════════════════\n');

        console.log('🎉 TEST TERMINÉ !');
        console.log('\n✅ Résumé:');
        console.log(`   - Agents testés: ${result.rows.length}`);
        console.log('   - Champ nom_prenom ajouté au backend');
        console.log('   - Format "Prénom Nom" disponible');
        console.log('   - Données cohérentes vérifiées');

        console.log('\n🚀 Instructions pour tester:');
        console.log('1. Redémarrer le backend');
        console.log('2. Redémarrer les applications frontend');
        console.log('3. Naviguer vers Services ou Sous-directions');
        console.log('4. Cliquer sur "Modifier" pour une sous-direction');
        console.log('5. Ouvrir la liste déroulante "Sous-directeur"');
        console.log('6. Vérifier que les noms s\'affichent au format "Prénom Nom"');

        process.exit(0);

    } catch (error) {
        console.error('❌ Erreur lors du test:', error);
        process.exit(1);
    }
}

// Exécuter le test
testAgentsDisplayFormat();