const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ma_rh_db',
    password: '12345',
    port: 5432,
});

async function fixChefServiceDemandesNiveau() {
    const client = await pool.connect();

    try {
        console.log('🔧 Correction du niveau des demandes de chef de service...\n');

        // 1. Identifier les demandes de chef de service avec le mauvais niveau
        console.log('1️⃣ Identification des demandes à corriger:');
        const demandesACorrigerQuery = `
            SELECT 
                d.id,
                d.type_demande,
                d.description,
                d.status,
                d.niveau_evolution_demande,
                a.prenom,
                a.nom,
                a.matricule,
                r.nom as role_agent
            FROM demandes d
            JOIN agents a ON d.id_agent = a.id
            JOIN utilisateurs u ON a.id = u.id_agent
            JOIN roles r ON u.id_role = r.id
            WHERE LOWER(r.nom) = 'chef_service'
            AND d.status = 'en_attente'
            AND d.niveau_evolution_demande IN ('valide_par_chef_service', 'valide_par_superieur')
            ORDER BY d.date_creation DESC
        `;

        const demandesACorrigerResult = await client.query(demandesACorrigerQuery);

        if (demandesACorrigerResult.rows.length === 0) {
            console.log('   ✅ Aucune demande à corriger trouvée');
            return;
        }

        console.log(`   📊 Demandes trouvées: ${demandesACorrigerResult.rows.length}`);
        demandesACorrigerResult.rows.forEach((demande, index) => {
            console.log(`   ${index + 1}. Demande ID: ${demande.id} - ${demande.prenom} ${demande.nom}`);
            console.log(`      Type: ${demande.type_demande}, Niveau actuel: ${demande.niveau_evolution_demande}`);
        });

        // 2. Corriger les demandes
        console.log('\n2️⃣ Correction des demandes:');
        let corrigees = 0;

        for (const demande of demandesACorrigerResult.rows) {
            try {
                const updateQuery = `
                    UPDATE demandes 
                    SET niveau_evolution_demande = 'soumis'
                    WHERE id = $1
                `;

                await client.query(updateQuery, [demande.id]);
                corrigees++;
                console.log(`   ✅ Demande ID ${demande.id} corrigée: ${demande.niveau_evolution_demande} → soumis`);

            } catch (error) {
                console.error(`   ❌ Erreur lors de la correction de la demande ${demande.id}:`, error.message);
            }
        }

        console.log(`\n📊 Résumé: ${corrigees}/${demandesACorrigerResult.rows.length} demandes corrigées`);

        // 3. Vérifier la correction
        console.log('\n3️⃣ Vérification de la correction:');
        const verificationQuery = `
            SELECT 
                d.id,
                d.type_demande,
                d.niveau_evolution_demande,
                a.prenom,
                a.nom
            FROM demandes d
            JOIN agents a ON d.id_agent = a.id
            JOIN utilisateurs u ON a.id = u.id_agent
            JOIN roles r ON u.id_role = r.id
            WHERE LOWER(r.nom) = 'chef_service'
            AND d.status = 'en_attente'
            AND d.niveau_evolution_demande = 'soumis'
            ORDER BY d.date_creation DESC
        `;

        const verificationResult = await client.query(verificationQuery);

        if (verificationResult.rows.length > 0) {
            console.log(`   ✅ ${verificationResult.rows.length} demandes de chef de service avec niveau 'soumis':`);
            verificationResult.rows.forEach((demande, index) => {
                console.log(`      ${index + 1}. Demande ID: ${demande.id} - ${demande.prenom} ${demande.nom} (${demande.type_demande})`);
            });
        } else {
            console.log('   ❌ Aucune demande de chef de service avec niveau "soumis" trouvée');
        }

        // 4. Test de la logique de récupération pour un sous-directeur
        console.log('\n4️⃣ Test de la logique de récupération pour un sous-directeur:');

        const sousDirecteurQuery = `
            SELECT 
                a.id,
                a.prenom,
                a.nom,
                a.id_direction,
                a.id_ministere
            FROM agents a
            JOIN utilisateurs u ON a.id = u.id_agent
            JOIN roles r ON u.id_role = r.id
            WHERE LOWER(r.nom) = 'sous_directeur'
            LIMIT 1
        `;

        const sousDirecteurResult = await client.query(sousDirecteurQuery);

        if (sousDirecteurResult.rows.length > 0) {
            const sousDir = sousDirecteurResult.rows[0];
            console.log(`   Test avec sous-directeur: ${sousDir.prenom} ${sousDir.nom}`);

            const testQuery = `
                SELECT 
                    d.id,
                    d.type_demande,
                    d.description,
                    d.niveau_evolution_demande,
                    a.prenom,
                    a.nom,
                    a.matricule,
                    r.nom as role_agent
                FROM demandes d
                LEFT JOIN agents a ON d.id_agent = a.id
                LEFT JOIN utilisateurs u ON a.id = u.id_agent
                LEFT JOIN roles r ON u.id_role = r.id
                WHERE d.status = 'en_attente' 
                AND d.niveau_evolution_demande = 'soumis'
                AND a.id_direction = $1
                AND a.id_ministere = $2
                ORDER BY d.date_creation ASC
            `;

            const testResult = await client.query(testQuery, [sousDir.id_direction, sousDir.id_ministere]);

            console.log(`   📊 Demandes trouvées pour ce sous-directeur: ${testResult.rows.length}`);

            if (testResult.rows.length > 0) {
                testResult.rows.forEach((demande, index) => {
                    console.log(`      ${index + 1}. Demande ID: ${demande.id} - ${demande.prenom} ${demande.nom} (${demande.role_agent})`);
                    console.log(`         Type: ${demande.type_demande}, Niveau: ${demande.niveau_evolution_demande}`);
                });
                console.log('   ✅ Le sous-directeur peut maintenant voir les demandes des chefs de service !');
            } else {
                console.log('   ❌ Aucune demande trouvée pour ce sous-directeur');
            }
        } else {
            console.log('   ❌ Aucun sous-directeur trouvé');
        }

        console.log('\n🎉 Correction terminée avec succès !');
        console.log('\n📝 Prochaines étapes:');
        console.log('   1. Testez la création d\'une nouvelle demande d\'absence avec un chef de service');
        console.log('   2. Vérifiez que le sous-directeur voit bien la demande dans son dashboard');
        console.log('   3. Testez la validation de la demande par le sous-directeur');

    } catch (error) {
        console.error('❌ Erreur lors de la correction:', error.message);
        console.error(error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter la correction
fixChefServiceDemandesNiveau()
    .then(() => {
        console.log('\n🎊 Correction terminée !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });