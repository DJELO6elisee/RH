const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ma_rh_db',
    password: '12345',
    port: 5432,
});

async function testEndpointDemandesEnAttente() {
    const client = await pool.connect();

    try {
        console.log('🧪 Test de l\'endpoint /api/demandes/en-attente pour un sous-directeur...\n');

        // 1. Récupérer un sous-directeur
        console.log('1️⃣ Récupération d\'un sous-directeur:');
        const sousDirecteurQuery = `
            SELECT 
                a.id,
                a.prenom,
                a.nom,
                a.matricule,
                a.id_direction,
                a.id_ministere,
                d.libelle as direction_nom,
                m.nom as ministere_nom
            FROM agents a
            JOIN utilisateurs u ON a.id = u.id_agent
            JOIN roles r ON u.id_role = r.id
            LEFT JOIN directions d ON a.id_direction = d.id
            LEFT JOIN ministeres m ON a.id_ministere = m.id
            WHERE LOWER(r.nom) = 'sous_directeur'
            LIMIT 1
        `;

        const sousDirecteurResult = await client.query(sousDirecteurQuery);

        if (sousDirecteurResult.rows.length === 0) {
            console.log('   ❌ Aucun sous-directeur trouvé');
            return;
        }

        const sousDir = sousDirecteurResult.rows[0];
        console.log(`   ✅ Sous-directeur trouvé: ${sousDir.prenom} ${sousDir.nom} (ID: ${sousDir.id})`);
        console.log(`      Direction: ${sousDir.direction_nom} (ID: ${sousDir.id_direction})`);
        console.log(`      Ministère: ${sousDir.ministere_nom} (ID: ${sousDir.id_ministere})`);

        // 2. Simuler la logique de getDemandesEnAttente pour ce sous-directeur
        console.log('\n2️⃣ Simulation de la logique getDemandesEnAttente:');

        const demandesQuery = `
            SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                   fa.designation_poste as fonction_actuelle,
                   s.libelle as service_nom, m.nom as ministere_nom,
                   f.libele as fonction_libelle,
                   r.nom as role_agent
            FROM demandes d
            LEFT JOIN agents a ON d.id_agent = a.id
            LEFT JOIN directions s ON a.id_direction = s.id
            LEFT JOIN ministeres m ON a.id_ministere = m.id
            LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
            )
            LEFT JOIN fonctions f ON fa.id_fonction = f.id
            LEFT JOIN utilisateurs u2 ON a.id = u2.id_agent
            LEFT JOIN roles r ON u2.id_role = r.id
            WHERE d.status = 'en_attente' 
            AND d.niveau_evolution_demande = 'soumis'
            AND a.id_direction = $1
            AND a.id_ministere = $2
            ORDER BY d.date_creation ASC
        `;

        const demandesResult = await client.query(demandesQuery, [sousDir.id_direction, sousDir.id_ministere]);

        console.log(`   📊 Demandes trouvées: ${demandesResult.rows.length}`);

        if (demandesResult.rows.length > 0) {
            demandesResult.rows.forEach((demande, index) => {
                console.log(`   ${index + 1}. Demande ID: ${demande.id}`);
                console.log(`      Agent: ${demande.prenom} ${demande.nom} (${demande.role_agent})`);
                console.log(`      Type: ${demande.type_demande}`);
                console.log(`      Description: ${demande.description}`);
                console.log(`      Niveau: ${demande.niveau_evolution_demande}`);
                console.log(`      Date: ${demande.date_creation}`);
            });
        } else {
            console.log('   ❌ Aucune demande trouvée');
        }

        // 3. Vérifier les demandes d'absence spécifiquement
        console.log('\n3️⃣ Vérification des demandes d\'absence:');

        const demandesAbsenceQuery = `
            SELECT 
                COUNT(*) as total_absence,
                COUNT(CASE WHEN d.niveau_evolution_demande = 'soumis' THEN 1 END) as absence_soumises,
                COUNT(CASE WHEN d.status = 'en_attente' THEN 1 END) as absence_attente
            FROM demandes d
            LEFT JOIN agents a ON d.id_agent = a.id
            WHERE d.type_demande = 'absence'
            AND a.id_direction = $1
            AND a.id_ministere = $2
        `;

        const absenceResult = await client.query(demandesAbsenceQuery, [sousDir.id_direction, sousDir.id_ministere]);
        const stats = absenceResult.rows[0];

        console.log(`   📊 Statistiques des demandes d'absence:`);
        console.log(`      - Total demandes d'absence: ${stats.total_absence}`);
        console.log(`      - Demandes d'absence soumises: ${stats.absence_soumises}`);
        console.log(`      - Demandes d'absence en attente: ${stats.absence_attente}`);

        // 4. Test avec un filtre par type de demande
        console.log('\n4️⃣ Test avec filtre type_demande=absence:');

        const demandesAbsenceFilterQuery = `
            SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                   r.nom as role_agent
            FROM demandes d
            LEFT JOIN agents a ON d.id_agent = a.id
            LEFT JOIN utilisateurs u2 ON a.id = u2.id_agent
            LEFT JOIN roles r ON u2.id_role = r.id
            WHERE d.status = 'en_attente' 
            AND d.niveau_evolution_demande = 'soumis'
            AND d.type_demande = 'absence'
            AND a.id_direction = $1
            AND a.id_ministere = $2
            ORDER BY d.date_creation ASC
        `;

        const absenceFilterResult = await client.query(demandesAbsenceFilterQuery, [sousDir.id_direction, sousDir.id_ministere]);

        console.log(`   📊 Demandes d'absence trouvées: ${absenceFilterResult.rows.length}`);

        if (absenceFilterResult.rows.length > 0) {
            absenceFilterResult.rows.forEach((demande, index) => {
                console.log(`   ${index + 1}. Demande ID: ${demande.id} - ${demande.prenom} ${demande.nom} (${demande.role_agent})`);
            });
        }

        // 5. Recommandations
        console.log('\n5️⃣ Recommandations:');
        if (demandesResult.rows.length > 0) {
            console.log('   ✅ La logique backend fonctionne correctement');
            console.log('   ✅ Le sous-directeur peut voir les demandes');
            console.log('   💡 Vérifiez que le frontend appelle le bon endpoint');
            console.log('   💡 Vérifiez que l\'utilisateur connecté est bien un sous-directeur');
        } else {
            console.log('   ❌ Aucune demande trouvée - vérifiez:');
            console.log('      1. Qu\'il y a des demandes avec niveau_evolution_demande = "soumis"');
            console.log('      2. Que ces demandes sont dans la même direction que le sous-directeur');
            console.log('      3. Que ces demandes ont le statut "en_attente"');
        }

    } catch (error) {
        console.error('❌ Erreur lors du test:', error.message);
        console.error(error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter le test
testEndpointDemandesEnAttente()
    .then(() => {
        console.log('\n🎉 Test terminé avec succès !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });