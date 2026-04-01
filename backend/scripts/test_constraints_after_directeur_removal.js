const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ma_rh_db',
    password: '12345',
    port: 5432,
});

async function testConstraintsAfterDirecteurRemoval() {
    const client = await pool.connect();

    try {
        console.log('🧪 Test des contraintes après suppression du rôle "directeur"...\n');

        // 1. Vérifier les contraintes actuelles
        console.log('1️⃣ Vérification des contraintes actuelles:');

        const constraintsQuery = `
            SELECT 
                conname as constraint_name,
                pg_get_constraintdef(oid) as constraint_definition
            FROM pg_constraint 
            WHERE conrelid = 'workflow_demandes'::regclass
            AND contype = 'c'
            ORDER BY conname
        `;

        const constraintsResult = await client.query(constraintsQuery);

        console.log(`   📊 ${constraintsResult.rows.length} contraintes trouvées:`);
        constraintsResult.rows.forEach((constraint, index) => {
            console.log(`   ${index + 1}. ${constraint.constraint_name}`);
            console.log(`      ${constraint.constraint_definition}`);
        });

        // 2. Tester l'insertion avec des actions autorisées
        console.log('\n2️⃣ Test d\'insertion avec actions autorisées:');

        const testValues = [
            { niveau: 'chef_service', action: 'approuve' },
            { niveau: 'sous_directeur', action: 'approuve' },
            { niveau: 'drh', action: 'approuve' },
            { niveau: 'dir_cabinet', action: 'approuve' },
            { niveau: 'chef_cabinet', action: 'approuve' },
            { niveau: 'directeur_central', action: 'approuve' },
            { niveau: 'directeur_general', action: 'approuve' },
            { niveau: 'ministre', action: 'approuve' }
        ];

        let successCount = 0;
        let failureCount = 0;

        for (const testValue of testValues) {
            try {
                // Test d'insertion (on ne commit pas)
                await client.query('BEGIN');
                const testQuery = `
                    INSERT INTO workflow_demandes (id_demande, niveau_validation, id_validateur, action, commentaire)
                    VALUES (999, $1, $2, $3, 'test')
                `;
                await client.query(testQuery, [testValue.niveau, 999, testValue.action]);
                await client.query('ROLLBACK'); // Annuler la transaction
                console.log(`   ✅ "${testValue.niveau}" avec action "${testValue.action}" - Accepté`);
                successCount++;
            } catch (error) {
                await client.query('ROLLBACK'); // S'assurer qu'on annule
                if (error.code === '23514') { // Contrainte de vérification violée
                    console.log(`   ❌ "${testValue.niveau}" avec action "${testValue.action}" - Rejeté par contrainte`);
                    console.log(`      Erreur: ${error.message}`);
                    failureCount++;
                } else {
                    console.log(`   ⚠️ "${testValue.niveau}" avec action "${testValue.action}" - Erreur: ${error.message}`);
                    failureCount++;
                }
            }
        }

        // 3. Tester que "directeur" est maintenant rejeté
        console.log('\n3️⃣ Test que "directeur" est maintenant rejeté:');

        try {
            await client.query('BEGIN');
            const testDirecteurQuery = `
                INSERT INTO workflow_demandes (id_demande, niveau_validation, id_validateur, action, commentaire)
                VALUES (999, $1, $2, $3, 'test')
            `;
            await client.query(testDirecteurQuery, ['directeur', 999, 'approuve']);
            await client.query('ROLLBACK');
            console.log('   ❌ "directeur" - Accepté (ne devrait pas l\'être)');
        } catch (error) {
            await client.query('ROLLBACK');
            if (error.code === '23514') {
                console.log('   ✅ "directeur" - Rejeté comme attendu');
            } else {
                console.log(`   ⚠️ "directeur" - Erreur: ${error.message}`);
            }
        }

        // 4. Test avec une vraie demande existante
        console.log('\n4️⃣ Test avec une vraie demande existante:');

        try {
            // Récupérer une demande existante
            const demandeQuery = `
                SELECT id FROM demandes 
                WHERE status = 'en_attente' 
                LIMIT 1
            `;
            const demandeResult = await client.query(demandeQuery);

            if (demandeResult.rows.length > 0) {
                const demandeId = demandeResult.rows[0].id;
                console.log(`   Test avec la demande ID: ${demandeId}`);

                // Récupérer l'ID d'un DRH
                const drhQuery = `
                    SELECT a.id
                    FROM agents a
                    JOIN utilisateurs u ON a.id = u.id_agent
                    JOIN roles r ON u.id_role = r.id
                    WHERE LOWER(r.nom) = 'drh'
                    LIMIT 1
                `;
                const drhResult = await client.query(drhQuery);

                if (drhResult.rows.length > 0) {
                    const drhId = drhResult.rows[0].id;
                    console.log(`   Test avec le DRH ID: ${drhId}`);

                    // Test d'insertion dans workflow_demandes avec niveau_validation = 'drh'
                    await client.query('BEGIN');
                    const workflowQuery = `
                        INSERT INTO workflow_demandes (id_demande, niveau_validation, id_validateur, action, commentaire, date_action)
                        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
                    `;
                    await client.query(workflowQuery, [demandeId, 'drh', drhId, 'approuve', 'Test de validation DRH']);
                    await client.query('ROLLBACK'); // Annuler la transaction

                    console.log('   ✅ Insertion dans workflow_demandes réussie avec niveau_validation = "drh"');
                } else {
                    console.log('   ❌ Aucun DRH trouvé');
                }
            } else {
                console.log('   ❌ Aucune demande en attente trouvée');
            }
        } catch (error) {
            await client.query('ROLLBACK');
            console.log(`   ❌ Erreur lors du test: ${error.message}`);
        }

        console.log(`\n📊 Résumé des tests: ${successCount} réussites, ${failureCount} échecs`);

        if (successCount === testValues.length) {
            console.log('   ✅ Tous les niveaux de validation (sans "directeur") sont acceptés !');
        } else {
            console.log('   ❌ Certains niveaux de validation sont encore rejetés');
        }

        console.log('\n🎉 Test des contraintes terminé !');

    } catch (error) {
        console.error('❌ Erreur lors du test:', error.message);
        console.error(error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter le test
testConstraintsAfterDirecteurRemoval()
    .then(() => {
        console.log('\n🎊 Test terminé !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });