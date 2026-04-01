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

async function createServicesSousDirectionsTables() {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Création des tables services et sous_directions...\n');
        
        // Lire le fichier SQL
        const sqlFilePath = path.join(__dirname, '..', 'database', 'create_services_sous_directions_tables_simple.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
        
        console.log('📄 Fichier SQL lu avec succès');
        console.log(`📏 Taille du fichier: ${sqlContent.length} caractères\n`);
        
        // Exécuter le script SQL
        console.log('⚡ Exécution du script SQL...');
        await client.query(sqlContent);
        
        console.log('✅ Script SQL exécuté avec succès !\n');
        
        // Vérifier la création des tables
        console.log('🔍 Vérification de la création des tables...\n');
        
        // 1. Vérifier la table services
        const servicesCheckQuery = `
            SELECT 
                table_name,
                column_name,
                data_type,
                is_nullable
            FROM information_schema.columns
            WHERE table_name = 'services'
            ORDER BY ordinal_position
        `;
        
        const servicesResult = await client.query(servicesCheckQuery);
        
        console.log('1️⃣ Table services créée:');
        servicesResult.rows.forEach((col, index) => {
            console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
        });
        
        // 2. Vérifier la table sous_directions
        const sousDirectionsCheckQuery = `
            SELECT 
                table_name,
                column_name,
                data_type,
                is_nullable
            FROM information_schema.columns
            WHERE table_name = 'sous_directions'
            ORDER BY ordinal_position
        `;
        
        const sousDirectionsResult = await client.query(sousDirectionsCheckQuery);
        
        console.log('\n2️⃣ Table sous_directions créée:');
        sousDirectionsResult.rows.forEach((col, index) => {
            console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
        });
        
        // 3. Vérifier les nouvelles colonnes dans agents
        const agentsNewColumnsQuery = `
            SELECT 
                column_name,
                data_type,
                is_nullable
            FROM information_schema.columns
            WHERE table_name = 'agents'
            AND column_name IN ('id_sous_direction', 'id_service')
            ORDER BY column_name
        `;
        
        const agentsNewColumnsResult = await client.query(agentsNewColumnsQuery);
        
        console.log('\n3️⃣ Nouvelles colonnes ajoutées à la table agents:');
        if (agentsNewColumnsResult.rows.length > 0) {
            agentsNewColumnsResult.rows.forEach((col, index) => {
                console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
            });
        } else {
            console.log('   ⚠️ Aucune nouvelle colonne trouvée');
        }
        
        // 4. Vérifier les contraintes de clés étrangères
        const fkQuery = `
            SELECT 
                tc.constraint_name,
                tc.table_name,
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
            AND tc.table_name IN ('services', 'sous_directions', 'agents')
            AND (kcu.column_name LIKE '%service%' OR kcu.column_name LIKE '%sous_direction%')
            ORDER BY tc.table_name, kcu.column_name
        `;
        
        const fkResult = await client.query(fkQuery);
        
        console.log('\n4️⃣ Contraintes de clés étrangères créées:');
        if (fkResult.rows.length > 0) {
            fkResult.rows.forEach((fk, index) => {
                console.log(`   ${index + 1}. ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
            });
        } else {
            console.log('   ⚠️ Aucune contrainte de clé étrangère trouvée');
        }
        
        // 5. Vérifier les données de test
        const testDataQuery = `
            SELECT 
                'services' as table_name,
                COUNT(*) as count
            FROM services
            UNION ALL
            SELECT 
                'sous_directions' as table_name,
                COUNT(*) as count
            FROM sous_directions
        `;
        
        const testDataResult = await client.query(testDataQuery);
        
        console.log('\n5️⃣ Données de test insérées:');
        testDataResult.rows.forEach((row, index) => {
            console.log(`   ${index + 1}. ${row.table_name}: ${row.count} enregistrements`);
        });
        
        // 6. Vérifier les vues créées
        const viewsQuery = `
            SELECT table_name
            FROM information_schema.views
            WHERE table_schema = 'public'
            AND table_name LIKE 'v_%'
            ORDER BY table_name
        `;
        
        const viewsResult = await client.query(viewsQuery);
        
        console.log('\n6️⃣ Vues créées:');
        if (viewsResult.rows.length > 0) {
            viewsResult.rows.forEach((view, index) => {
                console.log(`   ${index + 1}. ${view.table_name}`);
            });
        } else {
            console.log('   ⚠️ Aucune vue trouvée');
        }
        
        // 7. Test des vues
        console.log('\n7️⃣ Test des vues:');
        
        try {
            const testViewQuery = `SELECT COUNT(*) as count FROM v_services_complets`;
            const testViewResult = await client.query(testViewQuery);
            console.log(`   ✅ v_services_complets: ${testViewResult.rows[0].count} enregistrements`);
        } catch (error) {
            console.log(`   ❌ Erreur avec v_services_complets: ${error.message}`);
        }
        
        try {
            const testViewQuery2 = `SELECT COUNT(*) as count FROM v_sous_directions_completes`;
            const testViewResult2 = await client.query(testViewQuery2);
            console.log(`   ✅ v_sous_directions_completes: ${testViewResult2.rows[0].count} enregistrements`);
        } catch (error) {
            console.log(`   ❌ Erreur avec v_sous_directions_completes: ${error.message}`);
        }
        
        try {
            const testViewQuery3 = `SELECT COUNT(*) as count FROM v_agents_complets`;
            const testViewResult3 = await client.query(testViewQuery3);
            console.log(`   ✅ v_agents_complets: ${testViewResult3.rows[0].count} enregistrements`);
        } catch (error) {
            console.log(`   ❌ Erreur avec v_agents_complets: ${error.message}`);
        }
        
        console.log('\n🎉 Création des tables terminée avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors de la création des tables:', error.message);
        console.error('Détails:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter la création
createServicesSousDirectionsTables()
    .then(() => {
        console.log('\n🎊 Processus terminé avec succès !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });
