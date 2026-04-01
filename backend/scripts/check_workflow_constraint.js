const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ma_rh_db',
    password: '12345',
    port: 5432,
});

async function checkWorkflowConstraint() {
    const client = await pool.connect();

    try {
        console.log('🔍 Vérification de la contrainte workflow_demandes_niveau_validation_check...\n');

        // 1. Récupérer la définition de la contrainte
        console.log('1️⃣ Définition actuelle de la contrainte:');
        const constraintQuery = `
            SELECT 
                conname as constraint_name,
                pg_get_constraintdef(oid) as constraint_definition
            FROM pg_constraint 
            WHERE conname = 'workflow_demandes_niveau_validation_check'
            AND conrelid = 'workflow_demandes'::regclass
        `;

        const constraintResult = await client.query(constraintQuery);

        if (constraintResult.rows.length > 0) {
            const constraint = constraintResult.rows[0];
            console.log(`   Nom de la contrainte: ${constraint.constraint_name}`);
            console.log(`   Définition: ${constraint.constraint_definition}`);
        } else {
            console.log('   ❌ Contrainte non trouvée');
            return;
        }

        // 2. Vérifier la structure de la table workflow_demandes
        console.log('\n2️⃣ Structure de la table workflow_demandes:');
        const tableStructureQuery = `
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = 'workflow_demandes'
            ORDER BY ordinal_position
        `;

        const tableStructureResult = await client.query(tableStructureQuery);

        console.log('   Colonnes de la table:');
        tableStructureResult.rows.forEach((column, index) => {
            console.log(`   ${index + 1}. ${column.column_name} (${column.data_type}) - Nullable: ${column.is_nullable}`);
        });

        // 3. Vérifier les valeurs actuelles dans la colonne niveau_validation
        console.log('\n3️⃣ Valeurs actuelles dans niveau_validation:');
        const valuesQuery = `
            SELECT 
                niveau_validation,
                COUNT(*) as nombre_occurrences
            FROM workflow_demandes 
            GROUP BY niveau_validation
            ORDER BY niveau_validation
        `;

        const valuesResult = await client.query(valuesQuery);

        if (valuesResult.rows.length > 0) {
            console.log('   Valeurs existantes:');
            valuesResult.rows.forEach((value, index) => {
                console.log(`   ${index + 1}. "${value.niveau_validation}": ${value.nombre_occurrences} occurrences`);
            });
        } else {
            console.log('   Aucune donnée dans la table');
        }

        // 4. Tester l'insertion avec différents niveaux de validation
        console.log('\n4️⃣ Test d\'insertion avec différents niveaux:');

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
            } catch (error) {
                await client.query('ROLLBACK'); // S'assurer qu'on annule
                if (error.code === '23514') { // Contrainte de vérification violée
                    console.log(`   ❌ "${testValue}" - Rejeté par la contrainte`);
                } else {
                    console.log(`   ⚠️ "${testValue}" - Erreur: ${error.message}`);
                }
            }
        }

        // 5. Recommandations
        console.log('\n5️⃣ Recommandations:');
        console.log('   1. Supprimer la contrainte actuelle');
        console.log('   2. Créer une nouvelle contrainte avec tous les rôles');
        console.log('   3. Inclure: chef_service, sous_directeur, directeur, drh, dir_cabinet, chef_cabinet, directeur_central, directeur_general, ministre');

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error.message);
        console.error(error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter la vérification
checkWorkflowConstraint()
    .then(() => {
        console.log('\n🎉 Vérification terminée !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });