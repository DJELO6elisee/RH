const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ma_rh_db',
    password: '12345',
    port: 5432,
});

async function testMessagesProgression() {
    const client = await pool.connect();

    try {
        console.log('🧪 Test des messages de progression pour les demandes...\n');

        // 1. Récupérer les demandes d'absence du chef de service
        console.log('1️⃣ Vérification des messages de progression des demandes du chef de service:');
        const demandesChefServiceQuery = `
            SELECT 
                d.id,
                d.type_demande,
                d.description,
                d.status,
                d.niveau_evolution_demande,
                d.phase,
                a.prenom,
                a.nom,
                a.matricule,
                r.nom as role_agent,
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
                END as statut_detaille
            FROM demandes d
            JOIN agents a ON d.id_agent = a.id
            JOIN utilisateurs u ON a.id = u.id_agent
            JOIN roles r ON u.id_role = r.id
            WHERE LOWER(r.nom) = 'chef_service'
            AND d.type_demande = 'absence'
            ORDER BY d.date_creation DESC
        `;

        const demandesResult = await client.query(demandesChefServiceQuery);

        if (demandesResult.rows.length === 0) {
            console.log('   ❌ Aucune demande d\'absence de chef de service trouvée');
            return;
        }

        console.log(`   📊 ${demandesResult.rows.length} demandes trouvées:`);
        demandesResult.rows.forEach((demande, index) => {
            console.log(`   ${index + 1}. Demande ID: ${demande.id} - ${demande.prenom} ${demande.nom}`);
            console.log(`      Type: ${demande.type_demande}`);
            console.log(`      Description: ${demande.description}`);
            console.log(`      Niveau: ${demande.niveau_evolution_demande}`);
            console.log(`      Phase: ${demande.phase}`);
            console.log(`      Message de progression: "${demande.statut_detaille}"`);

            // Vérifier si le message est correct
            if (demande.niveau_evolution_demande === 'soumis') {
                if (demande.statut_detaille === 'En attente de validation par le sous-directeur') {
                    console.log(`      ✅ Message correct pour une demande de chef de service`);
                } else {
                    console.log(`      ❌ Message incorrect - devrait être "En attente de validation par le sous-directeur"`);
                }
            }
            console.log('');
        });

        // 2. Tester la fonction getDemandesSuivi pour un chef de service
        console.log('2️⃣ Test de la fonction getDemandesSuivi pour un chef de service:');

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

        if (chefServiceResult.rows.length > 0) {
            const chefService = chefServiceResult.rows[0];
            console.log(`   Test avec chef de service: ${chefService.prenom} ${chefService.nom} (ID: ${chefService.id})`);

            // Simuler la requête de getDemandesSuivi
            const suiviQuery = `
                SELECT 
                    d.id,
                    d.type_demande,
                    d.description,
                    d.niveau_evolution_demande,
                    d.phase,
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
                    END as statut_detaille
                FROM demandes d
                WHERE d.id_agent = $1
                ORDER BY d.date_creation DESC
            `;

            const suiviResult = await client.query(suiviQuery, [chefService.id]);

            console.log(`   📊 Demandes de suivi trouvées: ${suiviResult.rows.length}`);

            suiviResult.rows.forEach((demande, index) => {
                console.log(`   ${index + 1}. Demande ID: ${demande.id} - ${demande.type_demande}`);
                console.log(`      Niveau: ${demande.niveau_evolution_demande}`);
                console.log(`      Phase: ${demande.phase}`);
                console.log(`      Message: "${demande.statut_detaille}"`);

                if (demande.niveau_evolution_demande === 'soumis' && demande.phase === 'aller') {
                    if (demande.statut_detaille === 'En attente de validation par le sous-directeur') {
                        console.log(`      ✅ Message correct`);
                    } else {
                        console.log(`      ❌ Message incorrect`);
                    }
                }
                console.log('');
            });
        }

        // 3. Tester avec d'autres types de demandes
        console.log('3️⃣ Test avec d\'autres niveaux de validation:');

        const autresNiveauxQuery = `
            SELECT 
                DISTINCT d.niveau_evolution_demande,
                COUNT(*) as nombre_demandes
            FROM demandes d
            WHERE d.status = 'en_attente'
            GROUP BY d.niveau_evolution_demande
            ORDER BY d.niveau_evolution_demande
        `;

        const autresNiveauxResult = await client.query(autresNiveauxQuery);

        console.log(`   📊 Niveaux de validation trouvés:`);
        autresNiveauxResult.rows.forEach((niveau, index) => {
            console.log(`   ${index + 1}. ${niveau.niveau_evolution_demande}: ${niveau.nombre_demandes} demandes`);
        });

        console.log('\n🎉 Test des messages de progression terminé !');

    } catch (error) {
        console.error('❌ Erreur lors du test:', error.message);
        console.error(error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter le test
testMessagesProgression()
    .then(() => {
        console.log('\n🎊 Test terminé avec succès !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });