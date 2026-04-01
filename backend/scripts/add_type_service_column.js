const pool = require('../config/database');

async function addTypeServiceColumn() {
    console.log('🔧 Ajout de la colonne type_service à la table services...\n');

    try {
        // Ajouter la colonne type_service
        console.log('⚡ Ajout de la colonne type_service...');
        await pool.query(`
            ALTER TABLE services 
            ADD COLUMN IF NOT EXISTS type_service VARCHAR(50) DEFAULT 'direction'
        `);
        console.log('   ✅ Colonne type_service ajoutée');

        // Ajouter la contrainte de vérification
        console.log('⚡ Ajout de la contrainte de vérification...');
        try {
            await pool.query(`
                ALTER TABLE services 
                ADD CONSTRAINT check_type_service 
                CHECK (type_service IN ('direction', 'sous_direction'))
            `);
            console.log('   ✅ Contrainte de vérification ajoutée');
        } catch (error) {
            if (error.code === '42710') {
                console.log('   ⚠️ Contrainte déjà existante');
            } else {
                throw error;
            }
        }

        // Ajouter l'index
        console.log('⚡ Ajout de l\'index...');
        try {
            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_services_type_service 
                ON services(type_service)
            `);
            console.log('   ✅ Index ajouté');
        } catch (error) {
            if (error.code === '42P07') {
                console.log('   ⚠️ Index déjà existant');
            } else {
                throw error;
            }
        }

        // Mettre à jour les services existants
        console.log('⚡ Mise à jour des services existants...');
        const updateResult = await pool.query(`
            UPDATE services 
            SET type_service = 'direction' 
            WHERE type_service IS NULL
        `);
        console.log(`   ✅ ${updateResult.rowCount} services mis à jour`);

        // Vérifier la structure finale
        console.log('\n📊 Vérification de la structure finale...');
        const structureQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'services' AND column_name IN ('type_service', 'direction_id', 'sous_direction_id')
            ORDER BY column_name;
        `;

        const structureResult = await pool.query(structureQuery);
        console.log('   📋 Colonnes ajoutées:');
        structureResult.rows.forEach(row => {
            console.log(`      - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default || 'NULL'})`);
        });

        // Tester l'insertion d'un service de test
        console.log('\n🧪 Test d\'insertion d\'un service...');
        const testServiceQuery = `
            INSERT INTO services (id_ministere, libelle, description, type_service, direction_id, is_active)
            VALUES (1, 'Service Test', 'Service de test pour validation', 'direction', 1, true)
            RETURNING id, libelle, type_service, direction_id;
        `;

        const testResult = await pool.query(testServiceQuery);
        console.log('   ✅ Service de test créé:', testResult.rows[0]);

        // Supprimer le service de test
        await pool.query('DELETE FROM services WHERE libelle = $1', ['Service Test']);
        console.log('   ✅ Service de test supprimé');

        console.log('\n═══════════════════════════════════════════════════\n');
        console.log('🎉 SUCCÈS : Colonne type_service ajoutée !');
        console.log('\n✅ Résumé:');
        console.log('   - Colonne type_service ajoutée avec valeur par défaut "direction"');
        console.log('   - Contrainte de vérification ajoutée');
        console.log('   - Index de performance créé');
        console.log('   - Services existants mis à jour');
        console.log('   - Test d\'insertion réussi');

        console.log('\n🚀 Instructions pour tester:');
        console.log('1. Redémarrer le backend');
        console.log('2. Redémarrer les applications frontend');
        console.log('3. Naviguer vers Services');
        console.log('4. Cliquer sur "Ajouter" pour créer un nouveau service');
        console.log('5. Vérifier les nouveaux champs: Type de Service, Direction, Sous-direction');

        process.exit(0);

    } catch (error) {
        console.error('❌ Erreur lors de l\'ajout de la colonne:', error);
        process.exit(1);
    }
}

// Exécuter le script
addTypeServiceColumn();