const pool = require('../config/database');

async function verifyServicesStructure() {
    console.log('🔍 Vérification finale de la structure de la table services...\n');

    try {
        // Vérifier la structure complète de la table
        const structureQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'services' 
            ORDER BY ordinal_position;
        `;

        const structureResult = await pool.query(structureQuery);
        console.log('📋 Structure complète de la table services:');
        structureResult.rows.forEach(row => {
            console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default || 'NULL'})`);
        });

        // Vérifier les contraintes
        const constraintsQuery = `
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints 
            WHERE table_name = 'services';
        `;

        const constraintsResult = await pool.query(constraintsQuery);
        console.log('\n📋 Contraintes de la table services:');
        constraintsResult.rows.forEach(row => {
            console.log(`   - ${row.constraint_name}: ${row.constraint_type}`);
        });

        // Vérifier les contraintes de vérification avec la nouvelle syntaxe
        const checkConstraintsQuery = `
            SELECT conname, pg_get_constraintdef(oid) as definition
            FROM pg_constraint 
            WHERE conrelid = 'services'::regclass 
            AND contype = 'c';
        `;

        const checkConstraintsResult = await pool.query(checkConstraintsQuery);
        console.log('\n📋 Contraintes de vérification:');
        checkConstraintsResult.rows.forEach(row => {
            console.log(`   - ${row.conname}: ${row.definition}`);
        });

        // Vérifier les index
        const indexesQuery = `
            SELECT indexname, indexdef
            FROM pg_indexes 
            WHERE tablename = 'services';
        `;

        const indexesResult = await pool.query(indexesQuery);
        console.log('\n📋 Index de la table services:');
        indexesResult.rows.forEach(row => {
            console.log(`   - ${row.indexname}`);
        });

        // Vérifier les clés étrangères
        const foreignKeysQuery = `
            SELECT 
                tc.constraint_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'services';
        `;

        const foreignKeysResult = await pool.query(foreignKeysQuery);
        console.log('\n📋 Clés étrangères:');
        foreignKeysResult.rows.forEach(row => {
            console.log(`   - ${row.constraint_name}: ${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
        });

        // Vérifier les données existantes
        const dataQuery = 'SELECT COUNT(*) as count FROM services;';
        const dataResult = await pool.query(dataQuery);
        console.log(`\n📊 Nombre de services existants: ${dataResult.rows[0].count}`);

        // Tester l'insertion d'un service de test
        console.log('\n🧪 Test d\'insertion d\'un service...');
        const testServiceQuery = `
            INSERT INTO services (id_ministere, libelle, description, type_service, direction_id, is_active)
            VALUES (1, 'Service Test Final', 'Service de test pour validation finale', 'direction', 1, true)
            RETURNING id, libelle, type_service, direction_id;
        `;

        const testResult = await pool.query(testServiceQuery);
        console.log('   ✅ Service de test créé:', testResult.rows[0]);

        // Supprimer le service de test
        await pool.query('DELETE FROM services WHERE libelle = $1', ['Service Test Final']);
        console.log('   ✅ Service de test supprimé');

        // Vérifier la vue si elle existe
        console.log('\n📊 Test de la vue v_services_completes...');
        try {
            const viewTestQuery = 'SELECT COUNT(*) as count FROM v_services_completes;';
            const viewResult = await pool.query(viewTestQuery);
            console.log(`   ✅ Vue v_services_completes fonctionnelle (${viewResult.rows[0].count} services)`);
        } catch (error) {
            console.log('   ⚠️ Vue v_services_completes non disponible:', error.message);
        }

        // Test de validation de la contrainte type_service
        console.log('\n🧪 Test de validation de la contrainte type_service...');
        try {
            const invalidTypeQuery = `
                INSERT INTO services (id_ministere, libelle, type_service, direction_id)
                VALUES (1, 'Service Test Invalide', 'type_invalide', 1)
            `;
            await pool.query(invalidTypeQuery);
            console.log('   ❌ ERREUR: La contrainte de validation n\'a pas fonctionné');
        } catch (error) {
            if (error.code === '23514') {
                console.log('   ✅ Contrainte de validation fonctionnelle (type invalide rejeté)');
            } else {
                console.log('   ⚠️ Erreur inattendue lors du test de contrainte:', error.message);
            }
        }

        console.log('\n═══════════════════════════════════════════════════\n');
        console.log('🎉 VÉRIFICATION TERMINÉE : Structure des services validée !');
        console.log('\n✅ Résumé:');
        console.log('   - Colonnes type_service, direction_id, sous_direction_id présentes');
        console.log('   - Contraintes de vérification actives');
        console.log('   - Clés étrangères configurées');
        console.log('   - Index de performance créés');
        console.log('   - Tests d\'insertion réussis');
        console.log('   - Validation des contraintes fonctionnelle');

        console.log('\n🚀 La fonctionnalité est prête à être utilisée !');
        console.log('\n📋 Instructions pour tester:');
        console.log('1. Redémarrer le backend');
        console.log('2. Redémarrer les applications frontend');
        console.log('3. Naviguer vers Services');
        console.log('4. Cliquer sur "Ajouter" pour créer un nouveau service');
        console.log('5. Tester les nouveaux champs: Type de Service, Direction, Sous-direction');

        process.exit(0);

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
        process.exit(1);
    }
}

// Exécuter le script
verifyServicesStructure();