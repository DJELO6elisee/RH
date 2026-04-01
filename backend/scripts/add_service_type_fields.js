const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function addServiceTypeFields() {
    console.log('🔧 Ajout des champs de type de service à la table services...\n');

    try {
        // Lire le fichier SQL
        const sqlPath = path.join(__dirname, '..', 'database', 'add_service_type_fields.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Diviser le contenu en requêtes individuelles
        const queries = sqlContent
            .split(';')
            .map(query => query.trim())
            .filter(query => query.length > 0 && !query.startsWith('--'));

        console.log(`📋 ${queries.length} requêtes SQL à exécuter...\n`);

        // Exécuter chaque requête
        for (let i = 0; i < queries.length; i++) {
            const query = queries[i];
            if (query.trim()) {
                try {
                    console.log(`⚡ Exécution de la requête ${i + 1}/${queries.length}...`);
                    await pool.query(query);
                    console.log(`   ✅ Requête ${i + 1} exécutée avec succès`);
                } catch (error) {
                    if (error.code === '42701') {
                        console.log(`   ⚠️ Colonne déjà existante (requête ${i + 1})`);
                    } else if (error.code === '42P07') {
                        console.log(`   ⚠️ Contrainte déjà existante (requête ${i + 1})`);
                    } else if (error.code === '42710') {
                        console.log(`   ⚠️ Index déjà existant (requête ${i + 1})`);
                    } else {
                        console.log(`   ❌ Erreur requête ${i + 1}:`, error.message);
                        throw error;
                    }
                }
            }
        }

        // Vérifier la structure de la table
        console.log('\n📊 Vérification de la structure de la table services...');
        const structureQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'services' 
            ORDER BY ordinal_position;
        `;

        const structureResult = await pool.query(structureQuery);
        console.log('   📋 Colonnes de la table services:');
        structureResult.rows.forEach(row => {
            console.log(`      - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });

        // Vérifier les contraintes
        console.log('\n📊 Vérification des contraintes...');
        const constraintsQuery = `
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints 
            WHERE table_name = 'services';
        `;

        const constraintsResult = await pool.query(constraintsQuery);
        console.log('   📋 Contraintes de la table services:');
        constraintsResult.rows.forEach(row => {
            console.log(`      - ${row.constraint_name}: ${row.constraint_type}`);
        });

        // Tester la vue
        console.log('\n📊 Test de la vue v_services_completes...');
        const viewTestQuery = 'SELECT COUNT(*) as count FROM v_services_completes;';
        const viewResult = await pool.query(viewTestQuery);
        console.log(`   ✅ Vue v_services_completes fonctionnelle (${viewResult.rows[0].count} services)`);

        console.log('\n═══════════════════════════════════════════════════\n');
        console.log('🎉 SUCCÈS : Champs de type de service ajoutés !');
        console.log('\n✅ Résumé:');
        console.log('   - Colonne type_service ajoutée');
        console.log('   - Colonne direction_id ajoutée');
        console.log('   - Colonne sous_direction_id ajoutée');
        console.log('   - Contraintes de clés étrangères ajoutées');
        console.log('   - Contrainte de vérification ajoutée');
        console.log('   - Index de performance créés');
        console.log('   - Vue v_services_completes mise à jour');

        console.log('\n🚀 Instructions pour tester:');
        console.log('1. Redémarrer le backend');
        console.log('2. Redémarrer les applications frontend');
        console.log('3. Naviguer vers Services');
        console.log('4. Cliquer sur "Ajouter" pour créer un nouveau service');
        console.log('5. Vérifier les nouveaux champs: Type de Service, Direction, Sous-direction');

        process.exit(0);

    } catch (error) {
        console.error('❌ Erreur lors de l\'ajout des champs:', error);
        process.exit(1);
    }
}

// Exécuter le script
addServiceTypeFields();