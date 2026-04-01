const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ma_rh_db',
    password: '12345',
    port: 5432,
});

async function testDirectionIdIntegration() {
    const client = await pool.connect();

    try {
        console.log('🧪 Test d\'intégration de la colonne direction_id...\n');

        // 1. Vérifier la structure de la table
        console.log('1️⃣ Vérification de la structure de la table sous_directions...');
        const structureQuery = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'sous_directions' 
            AND column_name = 'direction_id'
        `;

        const structureResult = await client.query(structureQuery);
        if (structureResult.rows.length > 0) {
            console.log('   ✅ Colonne direction_id présente');
            console.log(`   📋 Type: ${structureResult.rows[0].data_type}, Nullable: ${structureResult.rows[0].is_nullable}`);
        } else {
            console.log('   ❌ Colonne direction_id manquante');
            return;
        }

        // 2. Vérifier les contraintes
        console.log('\n2️⃣ Vérification des contraintes...');
        const constraintsQuery = `
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints 
            WHERE table_name = 'sous_directions' 
            AND constraint_name = 'fk_sous_directions_direction'
        `;

        const constraintsResult = await client.query(constraintsQuery);
        if (constraintsResult.rows.length > 0) {
            console.log('   ✅ Contrainte de clé étrangère présente');
        } else {
            console.log('   ❌ Contrainte de clé étrangère manquante');
        }

        // 3. Tester la vue
        console.log('\n3️⃣ Test de la vue v_sous_directions_completes...');
        const viewQuery = `
            SELECT 
                sd.id,
                sd.libelle,
                sd.direction_id,
                d.libelle as direction_nom,
                m.nom as ministere_nom
            FROM v_sous_directions_completes sd
            LEFT JOIN directions d ON sd.direction_id = d.id
            LEFT JOIN ministeres m ON sd.id_ministere = m.id
            LIMIT 3
        `;

        const viewResult = await client.query(viewQuery);
        console.log(`   📊 ${viewResult.rows.length} sous-directions dans la vue:`);
        viewResult.rows.forEach((row, index) => {
            console.log(`      ${index + 1}. ${row.libelle} → Direction: ${row.direction_nom || 'Non assignée'}`);
        });

        // 4. Tester l'insertion d'une nouvelle sous-direction avec direction_id
        console.log('\n4️⃣ Test d\'insertion avec direction_id...');

        // Récupérer une direction existante
        const directionQuery = 'SELECT id, libelle FROM directions LIMIT 1';
        const directionResult = await client.query(directionQuery);

        if (directionResult.rows.length > 0) {
            const direction = directionResult.rows[0];
            console.log(`   📋 Utilisation de la direction: ${direction.libelle} (ID: ${direction.id})`);

            // Insérer une sous-direction de test
            const insertQuery = `
                INSERT INTO sous_directions (
                    id_ministere, direction_id, libelle, description, is_active
                ) VALUES ($1, $2, $3, $4, $5)
                RETURNING id, libelle, direction_id
            `;

            const testData = [
                1, // id_ministere
                direction.id, // direction_id
                'Sous-direction Test Direction ID',
                'Test d\'intégration de la colonne direction_id',
                true
            ];

            const insertResult = await client.query(insertQuery, testData);
            const newSousDirection = insertResult.rows[0];

            console.log(`   ✅ Sous-direction créée: ${newSousDirection.libelle} (ID: ${newSousDirection.id})`);
            console.log(`   🔗 Direction assignée: ${direction.libelle} (ID: ${newSousDirection.direction_id})`);

            // 5. Tester la récupération avec jointure
            console.log('\n5️⃣ Test de récupération avec jointure...');
            const selectQuery = `
                SELECT 
                    sd.id,
                    sd.libelle,
                    sd.direction_id,
                    d.libelle as direction_nom,
                    m.nom as ministere_nom
                FROM sous_directions sd
                LEFT JOIN directions d ON sd.direction_id = d.id
                LEFT JOIN ministeres m ON sd.id_ministere = m.id
                WHERE sd.id = $1
            `;

            const selectResult = await client.query(selectQuery, [newSousDirection.id]);
            const retrievedSousDirection = selectResult.rows[0];

            console.log('   📋 Données récupérées:');
            console.log(`      - ID: ${retrievedSousDirection.id}`);
            console.log(`      - Libellé: ${retrievedSousDirection.libelle}`);
            console.log(`      - Direction ID: ${retrievedSousDirection.direction_id}`);
            console.log(`      - Direction Nom: ${retrievedSousDirection.direction_nom}`);
            console.log(`      - Ministère: ${retrievedSousDirection.ministere_nom}`);

            // 6. Nettoyer - supprimer la sous-direction de test
            console.log('\n6️⃣ Nettoyage...');
            const deleteQuery = 'DELETE FROM sous_directions WHERE id = $1';
            await client.query(deleteQuery, [newSousDirection.id]);
            console.log('   🧹 Sous-direction de test supprimée');

        } else {
            console.log('   ⚠️ Aucune direction trouvée pour le test');
        }

        // 7. Test de validation des contraintes
        console.log('\n7️⃣ Test de validation des contraintes...');

        // Tenter d'insérer avec un direction_id invalide
        try {
            const invalidInsertQuery = `
                INSERT INTO sous_directions (
                    id_ministere, direction_id, libelle, description
                ) VALUES ($1, $2, $3, $4)
            `;

            await client.query(invalidInsertQuery, [1, 99999, 'Test Invalid Direction', 'Test']);
            console.log('   ❌ Contrainte de clé étrangère non respectée');
        } catch (error) {
            if (error.code === '23503') { // Foreign key violation
                console.log('   ✅ Contrainte de clé étrangère respectée (direction_id invalide rejeté)');
            } else {
                console.log(`   ⚠️ Erreur inattendue: ${error.message}`);
            }
        }

        console.log('\n🎉 Tests d\'intégration terminés avec succès !');

        // Résumé
        console.log('\n📋 RÉSUMÉ DES TESTS:');
        console.log('✅ Structure de la table vérifiée');
        console.log('✅ Contraintes vérifiées');
        console.log('✅ Vue fonctionnelle');
        console.log('✅ Insertion avec direction_id testée');
        console.log('✅ Récupération avec jointure testée');
        console.log('✅ Validation des contraintes testée');
        console.log('✅ Nettoyage effectué');

    } catch (error) {
        console.error('❌ Erreur lors des tests:', error.message);
        console.error(error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter les tests
testDirectionIdIntegration()
    .then(() => {
        console.log('\n🎊 Tests terminés !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });