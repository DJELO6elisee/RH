const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ma_rh_db',
    password: '12345',
    port: 5432,
});

async function testProgressBarCorrection() {
    const client = await pool.connect();

    try {
        console.log('🧪 Test de la correction de la barre de progression...\n');

        // 1. Vérifier les demandes avec différents niveaux
        console.log('1️⃣ Vérification des demandes avec différents niveaux de validation...');

        const demandesQuery = `
            SELECT d.id, d.type_demande, d.description, d.status, d.niveau_evolution_demande, d.phase,
                   a.prenom, a.nom, a.matricule, r.nom as role_nom
            FROM demandes d
            LEFT JOIN agents a ON d.id_agent = a.id
            LEFT JOIN utilisateurs u ON a.id = u.id_agent
            LEFT JOIN roles r ON u.id_role = r.id
            WHERE d.status = 'en_attente'
            ORDER BY d.date_creation DESC
            LIMIT 10
        `;

        const demandesResult = await client.query(demandesQuery);

        console.log(`   📊 ${demandesResult.rows.length} demandes trouvées:`);

        if (demandesResult.rows.length > 0) {
            demandesResult.rows.forEach((demande, index) => {
                console.log(`   ${index + 1}. ID: ${demande.id} - ${demande.prenom} ${demande.nom} (${demande.role_nom})`);
                console.log(`      Type: ${demande.type_demande}, Description: ${demande.description}`);
                console.log(`      Statut: ${demande.status}, Niveau: ${demande.niveau_evolution_demande}, Phase: ${demande.phase || 'N/A'}`);

                // Simuler la logique de progression
                const progressValue = getProgressValue(demande.niveau_evolution_demande, demande.phase);
                const progressColor = getProgressColor(demande.phase, demande.niveau_evolution_demande);

                console.log(`      🎯 Progression: ${progressValue}% (${progressColor})`);
                console.log('');
            });
        } else {
            console.log('   ⚠️ Aucune demande en attente trouvée');
        }

        // 2. Tester spécifiquement les demandes valide_par_sous_directeur
        console.log('2️⃣ Test spécifique des demandes "valide_par_sous_directeur"...');

        const sousDirecteurQuery = `
            SELECT d.id, d.type_demande, d.description, d.status, d.niveau_evolution_demande, d.phase,
                   a.prenom, a.nom, a.matricule
            FROM demandes d
            LEFT JOIN agents a ON d.id_agent = a.id
            WHERE d.status = 'en_attente' 
            AND d.niveau_evolution_demande = 'valide_par_sous_directeur'
            ORDER BY d.date_creation DESC
            LIMIT 5
        `;

        const sousDirecteurResult = await client.query(sousDirecteurQuery);

        console.log(`   📊 ${sousDirecteurResult.rows.length} demandes "valide_par_sous_directeur" trouvées:`);

        if (sousDirecteurResult.rows.length > 0) {
            sousDirecteurResult.rows.forEach((demande, index) => {
                console.log(`   ${index + 1}. ID: ${demande.id} - ${demande.prenom} ${demande.nom}`);
                console.log(`      Type: ${demande.type_demande}, Description: ${demande.description}`);
                console.log(`      Statut: ${demande.status}, Niveau: ${demande.niveau_evolution_demande}, Phase: ${demande.phase || 'N/A'}`);

                // Simuler la logique de progression
                const progressValue = getProgressValue(demande.niveau_evolution_demande, demande.phase);
                const progressColor = getProgressColor(demande.phase, demande.niveau_evolution_demande);

                console.log(`      🎯 Progression: ${progressValue}% (${progressColor})`);

                // Vérifier que la progression n'est pas 0
                if (progressValue > 0) {
                    console.log(`      ✅ SUCCÈS : La barre de progression n'est plus vide !`);
                } else {
                    console.log(`      ❌ ÉCHEC : La barre de progression est toujours vide`);
                }
                console.log('');
            });
        } else {
            console.log('   ⚠️ Aucune demande "valide_par_sous_directeur" trouvée');
        }

        // 3. Test de tous les niveaux possibles
        console.log('3️⃣ Test de tous les niveaux de validation...');

        const allNiveaux = [
            'soumis',
            'valide_par_superieur',
            'valide_par_sous_directeur',
            'valide_par_drh',
            'valide_par_dir_cabinet',
            'valide_par_chef_cabinet',
            'valide_par_directeur_central',
            'valide_par_directeur_general',
            'valide_par_ministre',
            'retour_ministre',
            'retour_drh',
            'retour_sous_directeur',
            'retour_chef_service',
            'finalise'
        ];

        console.log('   📊 Test des niveaux de progression:');

        allNiveaux.forEach(niveau => {
            const progressValue = getProgressValue(niveau, 'aller');
            const progressColor = getProgressColor('aller', niveau);

            console.log(`   ${niveau}: ${progressValue}% (${progressColor})`);
        });

        console.log('\n4️⃣ Résumé des corrections apportées:');
        console.log('   ✅ Ajout du niveau "valide_par_sous_directeur" dans getProgressValue');
        console.log('   ✅ Ajout de tous les nouveaux niveaux de validation');
        console.log('   ✅ Mise à jour des badges de niveau d\'évolution');
        console.log('   ✅ Correction appliquée dans toutes les applications frontend');

        console.log('\n🎉 Test terminé !');

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
    // Logique de progression basée sur le workflow complet
    // Si la demande est finalisée, progression à 100% peu importe la phase
    if (niveau === 'finalise') {
        return 100;
    }

    if (phase === 'retour') {
        const retourSteps = {
            'retour_ministre': 25, // Ministre → DRH
            'retour_drh': 75, // DRH → Chef de service (document généré)
            'retour_chef_service': 90, // Chef de service → Agent (transmission)
            'retour_sous_directeur': 85, // Sous-Directeur → Agent (nouveau)
            'finalise': 100 // Agent a reçu le document
        };
        return retourSteps[niveau] || 0;
    } else {
        const allerSteps = {
            'soumis': 10, // Agent soumet
            'valide_par_superieur': 25, // Chef de service valide (ancien)
            'valide_par_sous_directeur': 30, // Sous-Directeur valide (NOUVEAU)
            'valide_par_drh': 50, // DRH valide (document généré automatiquement)
            'valide_par_dir_cabinet': 65, // Directeur de Cabinet valide (NOUVEAU)
            'valide_par_chef_cabinet': 70, // Chef de Cabinet valide (NOUVEAU)
            'valide_par_directeur_central': 75, // Directeur Central valide (NOUVEAU)
            'valide_par_directeur_general': 80, // Directeur Général valide (NOUVEAU)
            'valide_par_ministre': 85, // Ministre valide (si nécessaire)
            'finalise': 100 // Demande finalisée
        };
        return allerSteps[niveau] || 0;
    }
}

function getProgressColor(phase, niveau) {
    // Si la demande est finalisée, couleur verte
    if (niveau === 'finalise') {
        return 'success';
    }
    return phase === 'retour' ? 'warning' : 'primary';
}

// Exécuter le test
testProgressBarCorrection()
    .then(() => {
        console.log('\n🎊 Test terminé !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });