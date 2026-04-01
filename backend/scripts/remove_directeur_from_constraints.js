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

async function removeDirecteurFromConstraints() {
    const client = await pool.connect();

    try {
        console.log('🔧 Suppression du rôle "directeur" des contraintes de base de données...\n');

        // 1. Lire le fichier SQL
        const sqlFile = path.join(__dirname, '../database/remove_directeur_from_constraints.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');

        console.log('1️⃣ Exécution du script SQL de suppression du rôle "directeur"...');

        // 2. Exécuter le script SQL
        await client.query(sqlContent);

        console.log('   ✅ Script SQL exécuté avec succès');

        // 3. Vérifier les nouvelles contraintes
        console.log('\n2️⃣ Vérification des nouvelles contraintes:');

        const checkConstraintsQuery = `
            SELECT 
                conname as constraint_name,
                pg_get_constraintdef(oid) as constraint_definition
            FROM pg_constraint 
            WHERE conname IN ('workflow_demandes_niveau_validation_check', 'demandes_niveau_evolution_demande_check')
            ORDER BY conname
        `;

        const constraintsResult = await client.query(checkConstraintsQuery);

        console.log(`   📊 ${constraintsResult.rows.length} contraintes mises à jour:`);
        constraintsResult.rows.forEach((constraint, index) => {
            console.log(`   ${index + 1}. ${constraint.constraint_name}`);
            console.log(`      ${constraint.constraint_definition}`);
        });

        // 4. Tester l'insertion avec les nouveaux niveaux autorisés
        console.log('\n3️⃣ Test d\'insertion avec les niveaux autorisés (sans "directeur"):');

        const testValues = [
            'chef_service',
            'sous_directeur',
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

        // 5. Tester que "directeur" est maintenant rejeté
        console.log('\n4️⃣ Test que "directeur" est maintenant rejeté:');

        try {
            await client.query('BEGIN');
            const testDirecteurQuery = `
                INSERT INTO workflow_demandes (id_demande, niveau_validation, id_validateur, action, commentaire)
                VALUES (999, $1, 999, 'test', 'test')
            `;
            await client.query(testDirecteurQuery, ['directeur']);
            await client.query('ROLLBACK');
            console.log('   ❌ "directeur" - Accepté (ne devrait pas l\'être)');
        } catch (error) {
            await client.query('ROLLBACK');
            if (error.code === '23514') {
                console.log('   ✅ "directeur" - Rejeté comme attendu (contrainte mise à jour)');
            } else {
                console.log(`   ⚠️ "directeur" - Erreur: ${error.message}`);
            }
        }

        console.log(`\n📊 Résumé des tests: ${successCount} réussites, ${failureCount} échecs`);

        if (successCount === testValues.length) {
            console.log('   ✅ Tous les niveaux de validation (sans "directeur") sont acceptés !');
        } else {
            console.log('   ❌ Certains niveaux de validation sont encore rejetés');
        }

        console.log('\n🎉 Suppression du rôle "directeur" terminée !');

    } catch (error) {
        console.error('❌ Erreur lors de la suppression du rôle "directeur":', error.message);
        console.error(error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter la suppression
removeDirecteurFromConstraints()
    .then(() => {
        console.log('\n🎊 Suppression terminée !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });