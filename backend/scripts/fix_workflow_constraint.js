const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ma_rh_db',
    password: '12345',
    port: 5432,
});

async function fixWorkflowConstraint() {
    const client = await pool.connect();

    try {
        console.log('🔧 Correction de la contrainte workflow_demandes_niveau_validation_check...\n');

        // 1. Lire le fichier SQL
        const sqlFile = path.join(__dirname, '../database/fix_workflow_constraint.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');

        console.log('1️⃣ Exécution du script SQL de correction...');

        // 2. Exécuter le script SQL
        await client.query(sqlContent);

        console.log('   ✅ Script SQL exécuté avec succès');

        // 3. Vérifier la nouvelle contrainte
        console.log('\n2️⃣ Vérification de la nouvelle contrainte:');
        const checkConstraintQuery = `
            SELECT 
                conname as constraint_name,
                pg_get_constraintdef(oid) as constraint_definition
            FROM pg_constraint 
            WHERE conname = 'workflow_demandes_niveau_validation_check'
            AND conrelid = 'workflow_demandes'::regclass
        `;

        const constraintResult = await client.query(checkConstraintQuery);

        if (constraintResult.rows.length > 0) {
            const constraint = constraintResult.rows[0];
            console.log(`   ✅ Contrainte mise à jour: ${constraint.constraint_name}`);
            console.log(`   Définition: ${constraint.constraint_definition}`);
        } else {
            console.log('   ❌ Contrainte non trouvée');
            return;
        }

        // 4. Tester l'insertion avec tous les niveaux de validation
        console.log('\n3️⃣ Test d\'insertion avec tous les niveaux de validation:');

        const testValues = [
            'chef_service',
            'sous_directeur',
            'directeur',
            'drh',
            'dir_cabinet',
            'chef_cabinet',
            'directeur_central',
            'directeur_general',
            'ministre'
        ];

        let successCount = 0;
        let failureCount = 0;

        for (const testValue of testValues) {
            try {
                // Test d'insertion (on ne commit pas)
                await client.query('BEGIN');
                const testQuery = `
                    INSERT INTO workflow_demandes (id_demande, niveau_validation, id_validateur, action, commentaire)
                    VALUES (999, $1, 999, 'test', 'test')
                `;
                await client.query(testQuery, [testValue]);
                await client.query('ROLLBACK'); // Annuler la transaction
                console.log(`   ✅ "${testValue}" - Accepté par la contrainte`);
                successCount++;
            } catch (error) {
                await client.query('ROLLBACK'); // S'assurer qu'on annule
                if (error.code === '23514') { // Contrainte de vérification violée
                    console.log(`   ❌ "${testValue}" - Rejeté par la contrainte`);
                    failureCount++;
                } else {
                    console.log(`   ⚠️ "${testValue}" - Erreur: ${error.message}`);
                    failureCount++;
                }
            }
        }

        console.log(`\n📊 Résumé des tests: ${successCount} réussites, ${failureCount} échecs`);

        if (successCount === testValues.length) {
            console.log('   ✅ Tous les niveaux de validation sont maintenant acceptés !');
        } else {
            console.log('   ❌ Certains niveaux de validation sont encore rejetés');
        }

        // 5. Tester avec une vraie validation de sous-directeur
        console.log('\n4️⃣ Test avec une vraie validation de sous-directeur:');

        try {
            // Récupérer une demande existante
            const demandeQuery = `
                SELECT id FROM demandes 
                WHERE status = 'en_attente' 
                AND niveau_evolution_demande = 'soumis'
                LIMIT 1
            `;
            const demandeResult = await client.query(demandeQuery);

            if (demandeResult.rows.length > 0) {
                const demandeId = demandeResult.rows[0].id;
                console.log(`   Test avec la demande ID: ${demandeId}`);

                // Récupérer l'ID d'un sous-directeur
                const sousDirecteurQuery = `
                    SELECT a.id
                    FROM agents a
                    JOIN utilisateurs u ON a.id = u.id_agent
                    JOIN roles r ON u.id_role = r.id
                    WHERE LOWER(r.nom) = 'sous_directeur'
                    LIMIT 1
                `;
                const sousDirecteurResult = await client.query(sousDirecteurQuery);

                if (sousDirecteurResult.rows.length > 0) {
                    const sousDirecteurId = sousDirecteurResult.rows[0].id;
                    console.log(`   Test avec le sous-directeur ID: ${sousDirecteurId}`);

                    // Test d'insertion dans workflow_demandes
                    await client.query('BEGIN');
                    const workflowQuery = `
                        INSERT INTO workflow_demandes (id_demande, niveau_validation, id_validateur, action, commentaire, date_action)
                        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
                    `;
                    await client.query(workflowQuery, [demandeId, 'sous_directeur', sousDirecteurId, 'approuve', 'Test de validation']);
                    await client.query('ROLLBACK'); // Annuler la transaction

                    console.log('   ✅ Insertion dans workflow_demandes réussie avec niveau_validation = "sous_directeur"');
                } else {
                    console.log('   ❌ Aucun sous-directeur trouvé');
                }
            } else {
                console.log('   ❌ Aucune demande en attente trouvée');
            }
        } catch (error) {
            await client.query('ROLLBACK');
            console.log(`   ❌ Erreur lors du test: ${error.message}`);
        }

        console.log('\n🎉 Correction de la contrainte terminée !');

    } catch (error) {
        console.error('❌ Erreur lors de la correction:', error.message);
        console.error(error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter la correction
fixWorkflowConstraint()
    .then(() => {
        console.log('\n🎊 Correction terminée !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });