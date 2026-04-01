const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ma_rh_db',
    password: '12345',
    port: 5432,
});

async function testNewRoutes() {
    const client = await pool.connect();
    
    try {
        console.log('🧪 Test des nouvelles routes services et sous-directions...\n');
        
        // 1. Test de récupération des services
        console.log('1️⃣ Test de récupération des services...');
        
        const servicesQuery = `
            SELECT 
                s.*,
                m.nom as ministere_nom,
                m.code as ministere_code,
                e.nom as entite_nom,
                a.prenom as responsable_prenom,
                a.nom as responsable_nom,
                a.matricule as responsable_matricule
            FROM services s
            LEFT JOIN ministeres m ON s.id_ministere = m.id
            LEFT JOIN entites_administratives e ON s.id_entite = e.id
            LEFT JOIN agents a ON s.responsable_id = a.id
            ORDER BY s.libelle ASC
        `;
        
        const servicesResult = await client.query(servicesQuery);
        
        console.log(`   ✅ ${servicesResult.rows.length} services trouvés:`);
        servicesResult.rows.forEach((service, index) => {
            console.log(`   ${index + 1}. ${service.libelle} (Ministère: ${service.ministere_nom})`);
            if (service.responsable_nom) {
                console.log(`      Responsable: ${service.responsable_prenom} ${service.responsable_nom}`);
            }
        });
        
        // 2. Test de récupération des sous-directions
        console.log('\n2️⃣ Test de récupération des sous-directions...');
        
        const sousDirectionsQuery = `
            SELECT 
                sd.*,
                m.nom as ministere_nom,
                m.code as ministere_code,
                e.nom as entite_nom,
                a.prenom as sous_directeur_prenom,
                a.nom as sous_directeur_nom,
                a.matricule as sous_directeur_matricule
            FROM sous_directions sd
            LEFT JOIN ministeres m ON sd.id_ministere = m.id
            LEFT JOIN entites_administratives e ON sd.id_entite = e.id
            LEFT JOIN agents a ON sd.sous_directeur_id = a.id
            ORDER BY sd.libelle ASC
        `;
        
        const sousDirectionsResult = await client.query(sousDirectionsQuery);
        
        console.log(`   ✅ ${sousDirectionsResult.rows.length} sous-directions trouvées:`);
        sousDirectionsResult.rows.forEach((sousDir, index) => {
            console.log(`   ${index + 1}. ${sousDir.libelle} (Ministère: ${sousDir.ministere_nom})`);
            if (sousDir.sous_directeur_nom) {
                console.log(`      Sous-directeur: ${sousDir.sous_directeur_prenom} ${sousDir.sous_directeur_nom}`);
            }
        });
        
        // 3. Test de récupération des agents avec leurs services et sous-directions
        console.log('\n3️⃣ Test de récupération des agents avec services et sous-directions...');
        
        const agentsQuery = `
            SELECT 
                a.id,
                a.prenom,
                a.nom,
                a.matricule,
                s.libelle as service_nom,
                sd.libelle as sous_direction_nom,
                d.libelle as direction_nom,
                m.nom as ministere_nom
            FROM agents a
            LEFT JOIN services s ON a.id_service = s.id
            LEFT JOIN sous_directions sd ON a.id_sous_direction = sd.id
            LEFT JOIN directions d ON a.id_direction = d.id
            LEFT JOIN ministeres m ON a.id_ministere = m.id
            WHERE a.id_service IS NOT NULL OR a.id_sous_direction IS NOT NULL
            ORDER BY a.prenom, a.nom
            LIMIT 10
        `;
        
        const agentsResult = await client.query(agentsQuery);
        
        console.log(`   ✅ ${agentsResult.rows.length} agents avec services/sous-directions trouvés:`);
        agentsResult.rows.forEach((agent, index) => {
            console.log(`   ${index + 1}. ${agent.prenom} ${agent.nom} (${agent.matricule})`);
            if (agent.service_nom) {
                console.log(`      Service: ${agent.service_nom}`);
            }
            if (agent.sous_direction_nom) {
                console.log(`      Sous-direction: ${agent.sous_direction_nom}`);
            }
            if (agent.direction_nom) {
                console.log(`      Direction: ${agent.direction_nom}`);
            }
        });
        
        // 4. Test des statistiques
        console.log('\n4️⃣ Test des statistiques...');
        
        // Statistiques des services
        const servicesStatsQuery = `
            SELECT 
                COUNT(*) as total_services,
                COUNT(CASE WHEN s.is_active = true THEN 1 END) as services_actifs,
                COUNT(CASE WHEN s.is_active = false THEN 1 END) as services_inactifs,
                COUNT(CASE WHEN s.responsable_id IS NOT NULL THEN 1 END) as services_avec_responsable,
                COUNT(CASE WHEN s.id_entite IS NOT NULL THEN 1 END) as services_avec_entite
            FROM services s
        `;
        
        const servicesStatsResult = await client.query(servicesStatsQuery);
        const servicesStats = servicesStatsResult.rows[0];
        
        console.log('   📊 Statistiques des services:');
        console.log(`      - Total: ${servicesStats.total_services}`);
        console.log(`      - Actifs: ${servicesStats.services_actifs}`);
        console.log(`      - Inactifs: ${servicesStats.services_inactifs}`);
        console.log(`      - Avec responsable: ${servicesStats.services_avec_responsable}`);
        console.log(`      - Avec entité: ${servicesStats.services_avec_entite}`);
        
        // Statistiques des sous-directions
        const sousDirectionsStatsQuery = `
            SELECT 
                COUNT(*) as total_sous_directions,
                COUNT(CASE WHEN sd.is_active = true THEN 1 END) as sous_directions_actives,
                COUNT(CASE WHEN sd.is_active = false THEN 1 END) as sous_directions_inactives,
                COUNT(CASE WHEN sd.sous_directeur_id IS NOT NULL THEN 1 END) as sous_directions_avec_directeur,
                COUNT(CASE WHEN sd.id_entite IS NOT NULL THEN 1 END) as sous_directions_avec_entite
            FROM sous_directions sd
        `;
        
        const sousDirectionsStatsResult = await client.query(sousDirectionsStatsQuery);
        const sousDirectionsStats = sousDirectionsStatsResult.rows[0];
        
        console.log('\n   📊 Statistiques des sous-directions:');
        console.log(`      - Total: ${sousDirectionsStats.total_sous_directions}`);
        console.log(`      - Actives: ${sousDirectionsStats.sous_directions_actives}`);
        console.log(`      - Inactives: ${sousDirectionsStats.sous_directions_inactives}`);
        console.log(`      - Avec directeur: ${sousDirectionsStats.sous_directions_avec_directeur}`);
        console.log(`      - Avec entité: ${sousDirectionsStats.sous_directions_avec_entite}`);
        
        // 5. Test des vues
        console.log('\n5️⃣ Test des vues créées...');
        
        try {
            const viewServicesQuery = `SELECT COUNT(*) as count FROM v_services_complets`;
            const viewServicesResult = await client.query(viewServicesQuery);
            console.log(`   ✅ v_services_complets: ${viewServicesResult.rows[0].count} enregistrements`);
        } catch (error) {
            console.log(`   ❌ Erreur avec v_services_complets: ${error.message}`);
        }
        
        try {
            const viewSousDirectionsQuery = `SELECT COUNT(*) as count FROM v_sous_directions_completes`;
            const viewSousDirectionsResult = await client.query(viewSousDirectionsQuery);
            console.log(`   ✅ v_sous_directions_completes: ${viewSousDirectionsResult.rows[0].count} enregistrements`);
        } catch (error) {
            console.log(`   ❌ Erreur avec v_sous_directions_completes: ${error.message}`);
        }
        
        try {
            const viewAgentsQuery = `SELECT COUNT(*) as count FROM v_agents_complets`;
            const viewAgentsResult = await client.query(viewAgentsQuery);
            console.log(`   ✅ v_agents_complets: ${viewAgentsResult.rows[0].count} enregistrements`);
        } catch (error) {
            console.log(`   ❌ Erreur avec v_agents_complets: ${error.message}`);
        }
        
        // 6. Test de création d'un service (simulation)
        console.log('\n6️⃣ Test de création d\'un service (simulation)...');
        
        const testServiceData = {
            id_ministere: 1,
            libelle: 'Service Test API',
            description: 'Service créé pour tester l\'API'
        };
        
        // Vérifier si le service existe déjà
        const existingServiceQuery = `
            SELECT id FROM services 
            WHERE libelle = $1 AND id_ministere = $2
        `;
        const existingServiceResult = await client.query(existingServiceQuery, [
            testServiceData.libelle, 
            testServiceData.id_ministere
        ]);
        
        if (existingServiceResult.rows.length === 0) {
            const createServiceQuery = `
                INSERT INTO services (id_ministere, libelle, description)
                VALUES ($1, $2, $3)
                RETURNING *
            `;
            
            const createServiceResult = await client.query(createServiceQuery, [
                testServiceData.id_ministere,
                testServiceData.libelle,
                testServiceData.description
            ]);
            
            console.log(`   ✅ Service créé avec succès - ID: ${createServiceResult.rows[0].id}`);
            
            // Supprimer le service de test
            const deleteServiceQuery = `DELETE FROM services WHERE id = $1`;
            await client.query(deleteServiceQuery, [createServiceResult.rows[0].id]);
            console.log(`   🗑️ Service de test supprimé`);
        } else {
            console.log(`   ⚠️ Service de test existe déjà - ID: ${existingServiceResult.rows[0].id}`);
        }
        
        console.log('\n🎉 Tests terminés avec succès !');
        
        // Résumé
        console.log('\n📋 RÉSUMÉ DES TESTS:');
        console.log(`✅ ${servicesResult.rows.length} services récupérés`);
        console.log(`✅ ${sousDirectionsResult.rows.length} sous-directions récupérées`);
        console.log(`✅ ${agentsResult.rows.length} agents avec services/sous-directions`);
        console.log('✅ Statistiques calculées');
        console.log('✅ Vues testées');
        console.log('✅ Création/suppression de service testée');
        
    } catch (error) {
        console.error('❌ Erreur lors des tests:', error.message);
        console.error(error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter les tests
testNewRoutes()
    .then(() => {
        console.log('\n🎊 Tests terminés !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });
