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

async function addDirectionIdToSousDirections() {
    const client = await pool.connect();

    try {
        console.log('🔧 Ajout de la colonne direction_id à la table sous_directions...\n');

        // Lire le script SQL
        const sqlPath = path.join(__dirname, '..', 'database', 'add_direction_id_to_sous_directions_simple.sql');
        const sqlScript = fs.readFileSync(sqlPath, 'utf8');

        // Exécuter le script SQL
        console.log('1️⃣ Exécution du script SQL...');
        await client.query(sqlScript);
        console.log('   ✅ Script SQL exécuté avec succès');

        // Vérifier la structure de la table
        console.log('\n2️⃣ Vérification de la structure de la table...');
        const structureQuery = `
            SELECT 
                column_name, 
                data_type, 
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = 'sous_directions' 
            ORDER BY ordinal_position
        `;

        const structureResult = await client.query(structureQuery);
        console.log('   📋 Structure de la table sous_directions:');
        structureResult.rows.forEach((col, index) => {
            console.log(`      ${index + 1}. ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
        });

        // Vérifier les contraintes
        console.log('\n3️⃣ Vérification des contraintes...');
        const constraintsQuery = `
            SELECT 
                tc.constraint_name,
                tc.constraint_type,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            LEFT JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.table_name = 'sous_directions'
            ORDER BY tc.constraint_type, tc.constraint_name
        `;

        const constraintsResult = await client.query(constraintsQuery);
        console.log('   🔗 Contraintes de la table sous_directions:');
        constraintsResult.rows.forEach((constraint, index) => {
            if (constraint.constraint_type === 'FOREIGN KEY') {
                console.log(`      ${index + 1}. ${constraint.constraint_name}: ${constraint.column_name} → ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
            } else {
                console.log(`      ${index + 1}. ${constraint.constraint_name} (${constraint.constraint_type})`);
            }
        });

        // Vérifier les données existantes
        console.log('\n4️⃣ Vérification des données existantes...');
        const dataQuery = `
            SELECT 
                sd.id,
                sd.libelle,
                sd.direction_id,
                d.libelle as direction_nom
            FROM sous_directions sd
            LEFT JOIN directions d ON sd.direction_id = d.id
            ORDER BY sd.id
        `;

        const dataResult = await client.query(dataQuery);
        console.log(`   📊 ${dataResult.rows.length} sous-directions trouvées:`);
        dataResult.rows.forEach((row, index) => {
            console.log(`      ${index + 1}. ${row.libelle} → Direction: ${row.direction_nom || 'Non assignée'}`);
        });

        // Vérifier la vue
        console.log('\n5️⃣ Vérification de la vue v_sous_directions_completes...');
        const viewQuery = `
            SELECT 
                COUNT(*) as count,
                COUNT(direction_nom) as avec_direction
            FROM v_sous_directions_completes
        `;

        const viewResult = await client.query(viewQuery);
        const viewStats = viewResult.rows[0];
        console.log(`   👁️ Vue v_sous_directions_completes:`);
        console.log(`      - Total: ${viewStats.count}`);
        console.log(`      - Avec direction: ${viewStats.avec_direction}`);

        // Test de la vue avec un exemple
        console.log('\n6️⃣ Test de la vue avec un exemple...');
        const exampleQuery = `
            SELECT 
                libelle,
                ministere_nom,
                direction_nom,
                sous_directeur_nom
            FROM v_sous_directions_completes
            LIMIT 3
        `;

        const exampleResult = await client.query(exampleQuery);
        console.log('   📋 Exemples de données de la vue:');
        exampleResult.rows.forEach((row, index) => {
            console.log(`      ${index + 1}. ${row.libelle}`);
            console.log(`         Ministère: ${row.ministere_nom}`);
            console.log(`         Direction: ${row.direction_nom || 'Non assignée'}`);
            console.log(`         Sous-directeur: ${row.sous_directeur_nom || 'Non assigné'}`);
        });

        console.log('\n🎉 Modification terminée avec succès !');

        // Résumé
        console.log('\n📋 RÉSUMÉ DES MODIFICATIONS:');
        console.log('✅ Colonne direction_id ajoutée');
        console.log('✅ Contrainte de clé étrangère créée');
        console.log('✅ Index de performance ajouté');
        console.log('✅ Vue v_sous_directions_completes mise à jour');
        console.log('✅ Données existantes mises à jour');

    } catch (error) {
        console.error('❌ Erreur lors de la modification:', error.message);
        console.error(error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter la modification
addDirectionIdToSousDirections()
    .then(() => {
        console.log('\n🎊 Modification terminée !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });