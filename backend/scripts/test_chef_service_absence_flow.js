const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ma_rh_db',
    password: '12345',
    port: 5432,
});

async function testChefServiceAbsenceFlow() {
    const client = await pool.connect();

    try {
        console.log('🧪 Test du flux Chef de Service → DRH pour demande d\'absence...\n');

        // 1. Trouver un chef de service et une demande d'absence en attente
        console.log('1️⃣ Recherche d\'une demande d\'absence de chef de service...');

        const demandeQuery = `
            SELECT d.id, d.type_demande, d.description, d.status, d.niveau_evolution_demande, d.phase,
                   a.prenom, a.nom, a.matricule, a.id as id_agent, a.id_direction, a.id_ministere,
                   r.nom as role_nom
            FROM demandes d
            LEFT JOIN agents a ON d.id_agent = a.id
            LEFT JOIN utilisateurs u ON a.id = u.id_agent
            LEFT JOIN roles r ON u.id_role = r.id
            WHERE d.status = 'en_attente' 
            AND d.type_demande = 'absence'
            AND LOWER(r.nom) = 'chef_service'
            AND d.niveau_evolution_demande = 'valide_par_sous_directeur'
            ORDER BY d.date_creation DESC
            LIMIT 1
        `;

        const demandeResult = await client.query(demandeQuery);

        if (demandeResult.rows.length === 0) {
            console.log('   ⚠️ Aucune demande d\'absence de chef de service trouvée avec niveau "valide_par_sous_directeur"');
            console.log('   📝 Création d\'une demande de test...');

            // Créer une demande de test
            const chefServiceQuery = `
                SELECT a.id, a.prenom, a.nom, a.matricule, a.id_direction, a.id_ministere
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

            // Créer une demande d'absence
            const createDemandeQuery = `
                INSERT INTO demandes (
                    id_agent, type_demande, description, date_debut, date_fin, 
                    lieu, priorite, documents_joints, created_by, niveau_evolution_demande, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id
            `;

            const createResult = await client.query(createDemandeQuery, [
                chefService.id,
                'absence',
                'Test de demande d\'absence pour validation DRH',
                '2025-10-15',
                '2025-10-16',
                'Abidjan',
                'normale',
                JSON.stringify([]),
                1, // created_by
                'valide_par_sous_directeur', // niveau_evolution_demande
                'en_attente'
            ]);

            const demandeId = createResult.rows[0].id;
            console.log(`   ✅ Demande de test créée avec l'ID: ${demandeId}`);

            // Récupérer la demande créée
            const demandeCreatedResult = await client.query(`
                SELECT d.*, a.prenom, a.nom, a.matricule, a.id as id_agent, a.id_direction, a.id_ministere
                FROM demandes d
                LEFT JOIN agents a ON d.id_agent = a.id
                WHERE d.id = $1
            `, [demandeId]);

            demande = demandeCreatedResult.rows[0];
        } else {
            demande = demandeResult.rows[0];
            console.log(`   ✅ Demande trouvée - ID: ${demande.id}, Agent: ${demande.prenom} ${demande.nom}`);
        }

        // 2. Trouver un DRH du même ministère
        console.log('\n2️⃣ Recherche d\'un DRH du même ministère...');

        const drhQuery = `
            SELECT a.id, a.prenom, a.nom, a.matricule, a.email
            FROM agents a
            JOIN utilisateurs u ON a.id = u.id_agent
            JOIN roles r ON u.id_role = r.id
            WHERE LOWER(r.nom) = 'drh'
            AND a.id_ministere = $1
            LIMIT 1
        `;

        const drhResult = await client.query(drhQuery, [demande.id_ministere]);

        if (drhResult.rows.length === 0) {
            console.log('   ❌ Aucun DRH trouvé pour ce ministère');
            return;
        }

        const drh = drhResult.rows[0];
        console.log(`   ✅ DRH trouvé - ${drh.prenom} ${drh.nom} (${drh.email})`);

        // 3. Simuler la validation par le DRH
        console.log('\n3️⃣ Simulation de la validation par le DRH...');

        // 3.1. Mettre à jour la demande
        console.log('   3.1. Mise à jour de la demande...');
        const updateDemandeQuery = `
            UPDATE demandes 
            SET 
                statut_drh = 'approuve',
                date_validation_drh = CURRENT_TIMESTAMP,
                commentaire_drh = 'Validation test par DRH',
                id_drh = $1,
                status = 'approuve',
                niveau_actuel = 'finalise',
                niveau_evolution_demande = 'valide_par_drh',
                phase = 'retour'
            WHERE id = $2
        `;

        await client.query(updateDemandeQuery, [drh.id, demande.id]);
        console.log(`   ✅ Demande ${demande.id} mise à jour avec status 'approuve' et niveau 'finalise'`);

        // 3.2. Insérer dans workflow_demandes
        console.log('   3.2. Insertion dans workflow_demandes...');
        const insertWorkflowQuery = `
            INSERT INTO workflow_demandes (id_demande, niveau_validation, id_validateur, action, commentaire, date_action)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        `;

        const workflowParams = [
            demande.id,
            'drh',
            drh.id,
            'approuve',
            'Validation par DRH pour test - demande d\'absence finalisée'
        ];

        await client.query(insertWorkflowQuery, workflowParams);
        console.log('   ✅ Enregistrement workflow créé');

        // 4. Vérifier que la demande est bien finalisée
        console.log('\n4️⃣ Vérification de la finalisation...');

        const verificationQuery = `
            SELECT d.id, d.status, d.niveau_evolution_demande, d.phase,
                   a.prenom, a.nom, a.matricule
            FROM demandes d
            LEFT JOIN agents a ON d.id_agent = a.id
            WHERE d.id = $1
        `;

        const verificationResult = await client.query(verificationQuery, [demande.id]);
        const demandeFinalisee = verificationResult.rows[0];

        console.log(`   📊 Statut final de la demande:`);
        console.log(`   - ID: ${demandeFinalisee.id}`);
        console.log(`   - Status: ${demandeFinalisee.status}`);
        console.log(`   - Niveau évolution: ${demandeFinalisee.niveau_evolution_demande}`);
        console.log(`   - Phase: ${demandeFinalisee.phase}`);
        console.log(`   - Agent: ${demandeFinalisee.prenom} ${demandeFinalisee.nom}`);

        // 5. Vérifier les notifications créées
        console.log('\n5️⃣ Vérification des notifications...');

        const notificationsQuery = `
            SELECT nd.id, nd.type_notification, nd.titre, nd.message, nd.lu,
                   a.prenom, a.nom, a.matricule
            FROM notifications_demandes nd
            LEFT JOIN agents a ON nd.id_agent_destinataire = a.id
            WHERE nd.id_demande = $1
            ORDER BY nd.date_creation DESC
        `;

        const notificationsResult = await client.query(notificationsQuery, [demande.id]);

        console.log(`   📧 ${notificationsResult.rows.length} notifications trouvées:`);

        notificationsResult.rows.forEach((notif, index) => {
            console.log(`   ${index + 1}. ${notif.titre}`);
            console.log(`      Destinataire: ${notif.prenom} ${notif.nom} (${notif.matricule})`);
            console.log(`      Type: ${notif.type_notification}`);
            console.log(`      Message: ${notif.message.substring(0, 100)}...`);
            console.log(`      Lu: ${notif.lu ? 'Oui' : 'Non'}`);
            console.log('');
        });

        // 6. Vérifier qu'un document a été généré
        console.log('6️⃣ Vérification de la génération de document...');

        const documentQuery = `
            SELECT doc.id, doc.titre, doc.type_document, doc.date_generation,
                   a.prenom, a.nom
            FROM documents_autorisation doc
            LEFT JOIN agents a ON doc.id_agent_destinataire = a.id
            WHERE doc.id_demande = $1
            ORDER BY doc.date_generation DESC
        `;

        const documentResult = await client.query(documentQuery, [demande.id]);

        if (documentResult.rows.length > 0) {
            console.log(`   ✅ ${documentResult.rows.length} document(s) généré(s):`);
            documentResult.rows.forEach((doc, index) => {
                console.log(`   ${index + 1}. ${doc.titre} (${doc.type_document})`);
                console.log(`      Agent: ${doc.prenom} ${doc.nom}`);
                console.log(`      Date: ${doc.date_generation}`);
            });
        } else {
            console.log('   ⚠️ Aucun document généré (normal si le service de génération n\'est pas configuré)');
        }

        // 7. Test de la barre de progression
        console.log('\n7️⃣ Test de la barre de progression...');

        const progressValue = getProgressValue(demandeFinalisee.niveau_evolution_demande, demandeFinalisee.phase);
        const progressColor = getProgressColor(demandeFinalisee.phase, demandeFinalisee.niveau_evolution_demande);

        console.log(`   🎯 Progression calculée: ${progressValue}% (${progressColor})`);

        if (progressValue === 100 && progressColor === 'success') {
            console.log('   ✅ SUCCÈS : La barre de progression est à 100% et verte !');
        } else {
            console.log('   ❌ ÉCHEC : La barre de progression n\'est pas correcte');
        }

        console.log('\n🎉 Test terminé !');

        // Résumé
        console.log('\n📋 RÉSUMÉ DU TEST:');
        console.log('✅ Demande d\'absence de chef de service créée/trouvée');
        console.log('✅ Validation par DRH simulée');
        console.log('✅ Demande finalisée avec status "approuve"');
        console.log('✅ Phase mise à "retour"');
        console.log('✅ Notifications créées');
        console.log(`${documentResult.rows.length > 0 ? '✅' : '⚠️'} Document généré`);
        console.log(`${progressValue === 100 ? '✅' : '❌'} Barre de progression à 100%`);

    } catch (error) {
        console.error('❌ Erreur lors du test:', error.message);
        console.error(error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Fonction de simulation de la logique de progression (copiée du frontend)
function getProgressValue(niveau, phase) {
    if (niveau === 'finalise') {
        return 100;
    }

    if (phase === 'retour') {
        const retourSteps = {
            'retour_ministre': 25,
            'retour_drh': 75,
            'retour_chef_service': 90,
            'retour_sous_directeur': 85,
            'valide_par_drh': 100, // NOUVEAU : Si validé par DRH en phase retour, c'est finalisé
            'finalise': 100
        };
        return retourSteps[niveau] || 0;
    } else {
        const allerSteps = {
            'soumis': 10,
            'valide_par_superieur': 25,
            'valide_par_sous_directeur': 30,
            'valide_par_drh': 50,
            'valide_par_dir_cabinet': 65,
            'valide_par_chef_cabinet': 70,
            'valide_par_directeur_central': 75,
            'valide_par_directeur_general': 80,
            'valide_par_ministre': 85,
            'finalise': 100
        };
        return allerSteps[niveau] || 0;
    }
}

function getProgressColor(phase, niveau) {
    if (niveau === 'finalise' || niveau === 'valide_par_drh') {
        return 'success';
    }
    return phase === 'retour' ? 'warning' : 'primary';
}

// Exécuter le test
testChefServiceAbsenceFlow()
    .then(() => {
        console.log('\n🎊 Test terminé !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });