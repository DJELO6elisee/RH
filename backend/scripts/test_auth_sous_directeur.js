const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ma_rh_db',
    password: '12345',
    port: 5432,
});

async function testAuthSousDirecteur() {
    const client = await pool.connect();

    try {
        console.log('🧪 Test de l\'authentification et des données utilisateur pour un sous-directeur...\n');

        // 1. Récupérer les informations complètes d'un sous-directeur
        console.log('1️⃣ Informations complètes du sous-directeur:');
        const sousDirecteurQuery = `
            SELECT 
                u.id as user_id,
                u.username,
                u.email,
                u.is_active,
                r.id as role_id,
                r.nom as role_nom,
                r.description as role_description,
                a.id as agent_id,
                a.prenom,
                a.nom,
                a.matricule,
                a.id_direction,
                a.id_ministere,
                d.libelle as direction_nom,
                m.nom as ministere_nom
            FROM utilisateurs u
            JOIN roles r ON u.id_role = r.id
            JOIN agents a ON u.id_agent = a.id
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
        console.log(`   ✅ Sous-directeur trouvé:`);
        console.log(`      User ID: ${sousDir.user_id}`);
        console.log(`      Username: ${sousDir.username}`);
        console.log(`      Email: ${sousDir.email}`);
        console.log(`      Active: ${sousDir.is_active}`);
        console.log(`      Role ID: ${sousDir.role_id}`);
        console.log(`      Role: ${sousDir.role_nom}`);
        console.log(`      Agent ID: ${sousDir.agent_id}`);
        console.log(`      Nom: ${sousDir.prenom} ${sousDir.nom}`);
        console.log(`      Matricule: ${sousDir.matricule}`);
        console.log(`      Direction: ${sousDir.direction_nom} (ID: ${sousDir.id_direction})`);
        console.log(`      Ministère: ${sousDir.ministere_nom} (ID: ${sousDir.id_ministere})`);

        // 2. Tester la requête de login simulée
        console.log('\n2️⃣ Test de la requête de login simulée:');

        const loginQuery = `
            SELECT 
                u.id,
                u.username,
                u.email,
                u.id_role,
                u.id_agent,
                r.nom as role_nom,
                a.prenom,
                a.nom,
                a.matricule,
                a.id_direction,
                a.id_ministere,
                d.libelle as direction_nom,
                m.nom as ministere_nom
            FROM utilisateurs u
            LEFT JOIN roles r ON u.id_role = r.id
            LEFT JOIN agents a ON u.id_agent = a.id
            LEFT JOIN directions d ON a.id_direction = d.id
            LEFT JOIN ministeres m ON a.id_ministere = m.id
            WHERE u.username = $1 AND u.is_active = true
        `;

        const loginResult = await client.query(loginQuery, [sousDir.username]);

        if (loginResult.rows.length > 0) {
            const userData = loginResult.rows[0];
            console.log(`   ✅ Login simulé réussi pour ${userData.username}`);
            console.log(`      Role: ${userData.role_nom}`);
            console.log(`      Agent ID: ${userData.id_agent}`);
            console.log(`      Direction: ${userData.direction_nom} (ID: ${userData.id_direction})`);

            // 3. Simuler la réponse de l'API pour le frontend
            console.log('\n3️⃣ Données que le frontend devrait recevoir:');
            const frontendData = {
                id: userData.id,
                username: userData.username,
                email: userData.email,
                role: userData.role_nom,
                id_agent: userData.id_agent,
                agent: {
                    prenom: userData.prenom,
                    nom: userData.nom,
                    matricule: userData.matricule,
                    id_direction: userData.id_direction,
                    id_ministere: userData.id_ministere,
                    direction_nom: userData.direction_nom,
                    ministere_nom: userData.ministere_nom
                }
            };

            console.log('   📊 Données frontend:');
            console.log(JSON.stringify(frontendData, null, 2));

            // 4. Vérifier les permissions de validation
            console.log('\n4️⃣ Test des permissions de validation:');
            const role = userData.role_nom ? .toLowerCase();
            const authorizedRoles = ['drh', 'chef_service', 'directeur', 'sous_directeur', 'dir_cabinet', 'ministre', 'chef_cabinet', 'directeur_general', 'directeur_central', 'super_admin'];
            const canValidate = authorizedRoles.includes(role);

            console.log(`   Role détecté: ${role}`);
            console.log(`   Peut valider: ${canValidate ? '✅ OUI' : '❌ NON'}`);

            if (canValidate) {
                console.log('   ✅ Le sous-directeur devrait voir l\'onglet "Demandes de Mon Service"');
            } else {
                console.log('   ❌ Le sous-directeur ne devrait pas voir l\'onglet "Demandes de Mon Service"');
            }

            // 5. Test de l'endpoint de récupération des demandes
            console.log('\n5️⃣ Test de l\'endpoint de récupération des demandes:');

            const endpointUrl = `http://localhost:5000/api/demandes/en-attente/${userData.id_agent}?statut=en_attente`;
            console.log(`   URL de l'endpoint: ${endpointUrl}`);

            // Simuler la requête qui serait faite par le frontend
            const demandesQuery = `
                SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                       fa.designation_poste as fonction_actuelle,
                       s.libelle as service_nom, m.nom as ministere_nom,
                       f.libele as fonction_libelle
                FROM demandes d
                LEFT JOIN agents a ON d.id_agent = a.id
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                    SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
                )
                LEFT JOIN fonctions f ON fa.id_fonction = f.id
                WHERE d.status = 'en_attente' 
                AND d.niveau_evolution_demande = 'soumis'
                AND a.id_direction = $1
                AND a.id_ministere = $2
                ORDER BY d.date_creation ASC
            `;

            const demandesResult = await client.query(demandesQuery, [userData.id_direction, userData.id_ministere]);

            console.log(`   📊 Demandes retournées: ${demandesResult.rows.length}`);

            if (demandesResult.rows.length > 0) {
                console.log('   ✅ L\'endpoint devrait retourner des demandes au frontend');
                demandesResult.rows.forEach((demande, index) => {
                    console.log(`      ${index + 1}. Demande ID: ${demande.id} - ${demande.prenom} ${demande.nom} (${demande.type_demande})`);
                });
            } else {
                console.log('   ❌ L\'endpoint ne retourne aucune demande');
            }

        } else {
            console.log(`   ❌ Login simulé échoué pour ${sousDir.username}`);
        }

        // 6. Instructions pour tester dans le frontend
        console.log('\n6️⃣ Instructions pour tester dans le frontend:');
        console.log(`   1. Connectez-vous avec le compte: ${sousDir.username}`);
        console.log('   2. Vérifiez que vous voyez l\'onglet "Demandes de Mon Service"');
        console.log('   3. Cliquez sur cet onglet');
        console.log('   4. Vérifiez que les demandes s\'affichent');
        console.log('   5. Ouvrez les outils de développement (F12)');
        console.log('   6. Vérifiez la console pour les logs de l\'API');
        console.log('   7. Vérifiez l\'onglet Network pour voir les requêtes API');

    } catch (error) {
        console.error('❌ Erreur lors du test:', error.message);
        console.error(error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter le test
testAuthSousDirecteur()
    .then(() => {
        console.log('\n🎉 Test terminé avec succès !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });