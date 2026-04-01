const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ma_rh_db',
    password: '12345',
    port: 5432,
});

async function testEndpointSuiviDemandes() {
    const client = await pool.connect();

    try {
        console.log('🧪 Test de l\'endpoint /api/demandes/suivi pour un chef de service...\n');

        // 1. Récupérer un chef de service
        console.log('1️⃣ Récupération d\'un chef de service:');
        const chefServiceQuery = `
            SELECT 
                a.id,
                a.prenom,
                a.nom,
                a.matricule
            FROM agents a
            JOIN utilisateurs u ON a.id = u.id_agent
            JOIN roles r ON u.id_role = r.id
            WHERE LOWER(r.nom) = 'chef_service'
            LIMIT 1
        `;

        const chefServiceResult = await client.query(chefServiceQuery);

        if (chefServiceResult.rows.length === 0) {
            console.log('   ❌ Aucun chef de service trouvé');
            return;
        }

        const chefService = chefServiceResult.rows[0];
        console.log(`   ✅ Chef de service trouvé: ${chefService.prenom} ${chefService.nom} (ID: ${chefService.id})`);

        // 2. Simuler la requête de getDemandesSuivi
        console.log('\n2️⃣ Simulation de la requête getDemandesSuivi:');

        const suiviQuery = `
            SELECT 
                d.*,
                a.prenom, a.nom, a.matricule, a.email,
                fa.designation_poste as fonction_actuelle,
                s.libelle as service_nom, m.nom as ministere_nom,
                f.libele as fonction_libelle,
                CASE 
                    WHEN d.phase = 'aller' THEN
                        CASE d.niveau_evolution_demande
                            WHEN 'soumis' THEN 
                                CASE 
                                    WHEN EXISTS (
                                        SELECT 1 FROM agents a2 
                                        JOIN utilisateurs u2 ON a2.id = u2.id_agent 
                                        JOIN roles r2 ON u2.id_role = r2.id 
                                        WHERE a2.id = d.id_agent AND LOWER(r2.nom) = 'chef_service'
                                    ) THEN 'En attente de validation par le sous-directeur'
                                    ELSE 'En attente de validation par le sous-directeur'
                                END
                            WHEN 'valide_par_chef_service' THEN 'En attente de validation par le sous-directeur'
                            WHEN 'valide_par_sous_directeur' THEN 'En attente de validation par le DRH'
                            WHEN 'valide_par_directeur' THEN 'En attente de validation par le DRH'
                            WHEN 'valide_par_superieur' THEN 'En attente de validation par le DRH'
                            WHEN 'valide_par_drh' THEN 
                                CASE d.type_demande
                                    WHEN 'attestation_presence' THEN 'En attente de finalisation'
                                    WHEN 'attestation_travail' THEN 'En attente de finalisation'
                                    WHEN 'sortie_territoire' THEN 'En attente de validation par le ministre'
                                    ELSE 'En attente de validation par le directeur de cabinet'
                                END
                            WHEN 'valide_par_dir_cabinet' THEN 'En attente de validation par le ministre'
                            WHEN 'valide_par_chef_cabinet' THEN 'En attente de validation par le ministre'
                            WHEN 'valide_par_directeur_central' THEN 'En attente de validation par le directeur de cabinet'
                            WHEN 'valide_par_directeur_general' THEN 'En attente de validation par le directeur de cabinet'
                            WHEN 'valide_par_ministre' THEN 'En attente de retour'
                        END
                    WHEN d.phase = 'retour' THEN
                        CASE d.niveau_evolution_demande
                            WHEN 'retour_ministre' THEN 'Retour du ministre vers le DRH'
                            WHEN 'retour_drh' THEN 'Retour du DRH vers le chef de service'
                            WHEN 'retour_chef_service' THEN 'Retour du chef de service vers vous'
                        END
                    ELSE 'Statut inconnu'
                END as statut_detaille,
                CASE 
                    WHEN d.phase = 'aller' THEN 'Phase aller'
                    WHEN d.phase = 'retour' THEN 'Phase retour'
                    ELSE 'Phase inconnue'
                END as phase_label
            FROM demandes d
            LEFT JOIN agents a ON d.id_agent = a.id
            LEFT JOIN directions s ON a.id_direction = s.id
            LEFT JOIN ministeres m ON a.id_ministere = m.id
            LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
            )
            LEFT JOIN fonctions f ON fa.id_fonction = f.id
            WHERE d.id_agent = $1
            ORDER BY d.date_creation DESC
        `;

        const suiviResult = await client.query(suiviQuery, [chefService.id]);

        console.log(`   📊 Demandes de suivi trouvées: ${suiviResult.rows.length}`);

        if (suiviResult.rows.length > 0) {
            suiviResult.rows.forEach((demande, index) => {
                console.log(`   ${index + 1}. Demande ID: ${demande.id}`);
                console.log(`      Type: ${demande.type_demande}`);
                console.log(`      Description: ${demande.description}`);
                console.log(`      Niveau: ${demande.niveau_evolution_demande}`);
                console.log(`      Phase: ${demande.phase}`);
                console.log(`      Message de progression: "${demande.statut_detaille}"`);

                // Vérifier si le message est correct
                if (demande.niveau_evolution_demande === 'soumis' && demande.phase === 'aller') {
                    if (demande.statut_detaille === 'En attente de validation par le sous-directeur') {
                        console.log(`      ✅ Message correct pour une demande de chef de service`);
                    } else {
                        console.log(`      ❌ Message incorrect - devrait être "En attente de validation par le sous-directeur"`);
                    }
                }
                console.log('');
            });
        } else {
            console.log('   ❌ Aucune demande de suivi trouvée');
        }

        // 3. Test avec un agent normal
        console.log('3️⃣ Test avec un agent normal:');

        const agentQuery = `
            SELECT 
                a.id,
                a.prenom,
                a.nom,
                a.matricule
            FROM agents a
            JOIN utilisateurs u ON a.id = u.id_agent
            JOIN roles r ON u.id_role = r.id
            WHERE LOWER(r.nom) = 'agent'
            LIMIT 1
        `;

        const agentResult = await client.query(agentQuery);

        if (agentResult.rows.length > 0) {
            const agent = agentResult.rows[0];
            console.log(`   Test avec agent: ${agent.prenom} ${agent.nom} (ID: ${agent.id})`);

            const agentSuiviResult = await client.query(suiviQuery, [agent.id]);

            console.log(`   📊 Demandes de l'agent trouvées: ${agentSuiviResult.rows.length}`);

            if (agentSuiviResult.rows.length > 0) {
                agentSuiviResult.rows.forEach((demande, index) => {
                    console.log(`   ${index + 1}. Demande ID: ${demande.id} - ${demande.type_demande}`);
                    console.log(`      Niveau: ${demande.niveau_evolution_demande}`);
                    console.log(`      Message: "${demande.statut_detaille}"`);

                    if (demande.niveau_evolution_demande === 'soumis' && demande.phase === 'aller') {
                        if (demande.statut_detaille === 'En attente de validation par le sous-directeur') {
                            console.log(`      ✅ Message correct pour une demande d'agent normal`);
                        } else {
                            console.log(`      ❌ Message incorrect`);
                        }
                    }
                    console.log('');
                });
            }
        }

        console.log('\n🎉 Test de l\'endpoint suivi terminé !');

    } catch (error) {
        console.error('❌ Erreur lors du test:', error.message);
        console.error(error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter le test
testEndpointSuiviDemandes()
    .then(() => {
        console.log('\n🎊 Test terminé avec succès !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });