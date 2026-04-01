const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ma_rh_db',
    password: '12345',
    port: 5432,
});

async function testDRHDemandesValidation() {
    const client = await pool.connect();

    try {
        console.log('🧪 Test de la correction DRH pour voir les demandes validées par le sous-directeur...\n');

        // 1. Trouver un DRH
        console.log('1️⃣ Recherche d\'un DRH...');

        const drhQuery = `
            SELECT a.id, a.prenom, a.nom, a.matricule, a.id_ministere
            FROM agents a
            JOIN utilisateurs u ON a.id = u.id_agent
            JOIN roles r ON u.id_role = r.id
            WHERE LOWER(r.nom) = 'drh'
            LIMIT 1
        `;

        const drhResult = await client.query(drhQuery);

        if (drhResult.rows.length === 0) {
            console.log('   ❌ Aucun DRH trouvé');
            return;
        }

        const drh = drhResult.rows[0];
        console.log(`   ✅ DRH trouvé: ${drh.prenom} ${drh.nom} (ID: ${drh.id}, Ministère: ${drh.id_ministere})`);

        // 2. Vérifier les demandes avec niveau_evolution_demande = 'valide_par_sous_directeur'
        console.log('\n2️⃣ Vérification des demandes valide_par_sous_directeur...');

        const demandesQuery = `
            SELECT d.id, d.type_demande, d.description, d.status, d.niveau_evolution_demande, d.phase,
                   a.prenom, a.nom, a.matricule, a.id_ministere
            FROM demandes d
            LEFT JOIN agents a ON d.id_agent = a.id
            WHERE d.status = 'en_attente' 
            AND d.niveau_evolution_demande = 'valide_par_sous_directeur'
            AND a.id_ministere = $1
            ORDER BY d.date_creation DESC
            LIMIT 10
        `;

        const demandesResult = await client.query(demandesQuery, [drh.id_ministere]);

        console.log(`   📊 ${demandesResult.rows.length} demandes trouvées avec niveau 'valide_par_sous_directeur' dans le ministère ${drh.id_ministere}:`);

        if (demandesResult.rows.length > 0) {
            demandesResult.rows.forEach((demande, index) => {
                console.log(`   ${index + 1}. ID: ${demande.id} - ${demande.prenom} ${demande.nom} (${demande.matricule})`);
                console.log(`      Type: ${demande.type_demande}, Description: ${demande.description}`);
                console.log(`      Statut: ${demande.status}, Niveau: ${demande.niveau_evolution_demande}, Phase: ${demande.phase || 'N/A'}`);
            });
        } else {
            console.log('   ⚠️ Aucune demande avec niveau "valide_par_sous_directeur" trouvée');
        }

        // 3. Simuler la logique du DRH (comme dans getDemandesEnAttente)
        console.log('\n3️⃣ Test de la logique DRH (simulation de getDemandesEnAttente)...');

        const drhLogicQuery = `
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
            AND (d.niveau_evolution_demande = 'valide_par_sous_directeur' 
                 OR d.niveau_evolution_demande = 'valide_par_superieur' 
                 OR d.niveau_evolution_demande = 'valide_par_directeur' 
                 OR d.niveau_evolution_demande = 'retour_ministre')
            AND a.id_ministere = $1
            ORDER BY d.date_creation ASC
        `;

        const drhLogicResult = await client.query(drhLogicQuery, [drh.id_ministere]);

        console.log(`   📊 ${drhLogicResult.rows.length} demandes trouvées par la logique DRH:`);

        if (drhLogicResult.rows.length > 0) {
            drhLogicResult.rows.forEach((demande, index) => {
                console.log(`   ${index + 1}. ID: ${demande.id} - ${demande.prenom} ${demande.nom} (${demande.matricule})`);
                console.log(`      Type: ${demande.type_demande}, Description: ${demande.description}`);
                console.log(`      Statut: ${demande.status}, Niveau: ${demande.niveau_evolution_demande}, Phase: ${demande.phase || 'N/A'}`);
            });
        } else {
            console.log('   ❌ Aucune demande trouvée par la logique DRH');
        }

        // 4. Vérifier les demandes de chef de service
        console.log('\n4️⃣ Vérification des demandes de chef de service...');

        const chefServiceQuery = `
            SELECT d.id, d.type_demande, d.description, d.status, d.niveau_evolution_demande,
                   a.prenom, a.nom, a.matricule, r.nom as role_nom
            FROM demandes d
            LEFT JOIN agents a ON d.id_agent = a.id
            LEFT JOIN utilisateurs u ON a.id = u.id_agent
            LEFT JOIN roles r ON u.id_role = r.id
            WHERE d.status = 'en_attente' 
            AND LOWER(r.nom) = 'chef_service'
            AND a.id_ministere = $1
            ORDER BY d.date_creation DESC
            LIMIT 5
        `;

        const chefServiceResult = await client.query(chefServiceQuery, [drh.id_ministere]);

        console.log(`   📊 ${chefServiceResult.rows.length} demandes de chef de service trouvées:`);

        if (chefServiceResult.rows.length > 0) {
            chefServiceResult.rows.forEach((demande, index) => {
                console.log(`   ${index + 1}. ID: ${demande.id} - ${demande.prenom} ${demande.nom} (${demande.matricule})`);
                console.log(`      Type: ${demande.type_demande}, Description: ${demande.description}`);
                console.log(`      Statut: ${demande.status}, Niveau: ${demande.niveau_evolution_demande}, Rôle: ${demande.role_nom}`);
            });
        } else {
            console.log('   ⚠️ Aucune demande de chef de service trouvée');
        }

        // 5. Test de l'endpoint API (simulation)
        console.log('\n5️⃣ Simulation de l\'endpoint API /api/demandes/en-attente/{id_drh}...');

        // Simuler l'appel à l'endpoint
        const endpointQuery = `
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
            AND (d.niveau_evolution_demande = 'valide_par_sous_directeur' 
                 OR d.niveau_evolution_demande = 'valide_par_superieur' 
                 OR d.niveau_evolution_demande = 'valide_par_directeur' 
                 OR d.niveau_evolution_demande = 'retour_ministre')
            AND a.id_ministere = $1
            ORDER BY d.date_creation ASC
        `;

        const endpointResult = await client.query(endpointQuery, [drh.id_ministere]);

        console.log(`   📊 ${endpointResult.rows.length} demandes retournées par l'endpoint API:`);

        if (endpointResult.rows.length > 0) {
            endpointResult.rows.forEach((demande, index) => {
                console.log(`   ${index + 1}. ID: ${demande.id} - ${demande.prenom} ${demande.nom}`);
                console.log(`      Type: ${demande.type_demande}, Niveau: ${demande.niveau_evolution_demande}`);
            });

            console.log('\n   ✅ SUCCÈS : Le DRH peut maintenant voir les demandes validées par le sous-directeur !');
        } else {
            console.log('\n   ❌ ÉCHEC : Le DRH ne voit toujours aucune demande');
        }

        console.log('\n🎉 Test terminé !');

    } catch (error) {
        console.error('❌ Erreur lors du test:', error.message);
        console.error(error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter le test
testDRHDemandesValidation()
    .then(() => {
        console.log('\n🎊 Test terminé !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });