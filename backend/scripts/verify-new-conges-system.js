const pool = require('../config/database');
require('dotenv').config();

async function verifyNewCongesSystem() {
    console.log('🔍 Vérification du nouveau système de gestion des congés...\n');

    try {
        // 1. Vérifier les colonnes dans agent_conges
        console.log('1️⃣ Vérification des colonnes dans agent_conges...');
        const agentCongesColumns = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'agent_conges' 
              AND column_name = 'dette_annee_suivante'
        `);
        
        if (agentCongesColumns.rows.length > 0) {
            console.log('   ✅ Colonne dette_annee_suivante existe dans agent_conges');
        } else {
            console.log('   ❌ Colonne dette_annee_suivante N\'EXISTE PAS dans agent_conges');
        }

        // 2. Vérifier les colonnes dans demandes
        console.log('\n2️⃣ Vérification des colonnes dans demandes...');
        const demandesColumns = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'demandes' 
              AND column_name IN ('motif_conge', 'nombre_jours', 'raison_exceptionnelle', 'jours_restants_apres_deduction')
            ORDER BY column_name
        `);

        const requiredColumns = ['motif_conge', 'nombre_jours', 'raison_exceptionnelle', 'jours_restants_apres_deduction'];
        const existingColumns = demandesColumns.rows.map(row => row.column_name);

        requiredColumns.forEach(col => {
            if (existingColumns.includes(col)) {
                console.log(`   ✅ Colonne ${col} existe dans demandes`);
            } else {
                console.log(`   ❌ Colonne ${col} N'EXISTE PAS dans demandes`);
            }
        });

        // 3. Vérifier que les tables existent
        console.log('\n3️⃣ Vérification de l\'existence des tables...');
        const tables = await pool.query(`
            SELECT tablename 
            FROM pg_tables 
            WHERE tablename IN ('agent_conges', 'jours_feries', 'demandes')
            ORDER BY tablename
        `);

        const requiredTables = ['agent_conges', 'jours_feries', 'demandes'];
        const existingTables = tables.rows.map(row => row.tablename);

        requiredTables.forEach(table => {
            if (existingTables.includes(table)) {
                console.log(`   ✅ Table ${table} existe`);
            } else {
                console.log(`   ❌ Table ${table} N'EXISTE PAS`);
            }
        });

        // 4. Vérifier la fonction calculer_jours_ouvres
        console.log('\n4️⃣ Vérification de la fonction calculer_jours_ouvres...');
        const functionCheck = await pool.query(`
            SELECT routine_name 
            FROM information_schema.routines 
            WHERE routine_name = 'calculer_jours_ouvres'
        `);

        if (functionCheck.rows.length > 0) {
            console.log('   ✅ Fonction calculer_jours_ouvres existe');
        } else {
            console.log('   ❌ Fonction calculer_jours_ouvres N\'EXISTE PAS');
        }

        // 5. Tester un enregistrement exemple dans agent_conges
        console.log('\n5️⃣ Test d\'exemple de données...');
        const testConges = await pool.query(`
            SELECT id, id_agent, annee, jours_alloues, jours_pris, jours_restants, 
                   COALESCE(jours_reportes, 0) as jours_reportes,
                   COALESCE(dette_annee_suivante, 0) as dette_annee_suivante
            FROM agent_conges 
            LIMIT 1
        `);

        if (testConges.rows.length > 0) {
            console.log('   ✅ Données de test trouvées dans agent_conges:');
            console.log(`      - Agent ID: ${testConges.rows[0].id_agent}`);
            console.log(`      - Année: ${testConges.rows[0].annee}`);
            console.log(`      - Jours alloués: ${testConges.rows[0].jours_alloues}`);
            console.log(`      - Jours pris: ${testConges.rows[0].jours_pris}`);
            console.log(`      - Jours restants: ${testConges.rows[0].jours_restants}`);
            console.log(`      - Dette année suivante: ${testConges.rows[0].dette_annee_suivante}`);
        } else {
            console.log('   ⚠️ Aucune donnée trouvée dans agent_conges (normal si pas encore initialisé)');
        }

        // 6. Résumé final
        console.log('\n📊 RÉSUMÉ:');
        console.log('─'.repeat(50));
        
        const allGood = 
            agentCongesColumns.rows.length > 0 &&
            existingColumns.includes('motif_conge') &&
            existingColumns.includes('nombre_jours') &&
            existingColumns.includes('raison_exceptionnelle') &&
            existingColumns.includes('jours_restants_apres_deduction') &&
            existingTables.includes('agent_conges') &&
            existingTables.includes('jours_feries') &&
            existingTables.includes('demandes') &&
            functionCheck.rows.length > 0;

        if (allGood) {
            console.log('✅ TOUT EST EN ORDRE !');
            console.log('   Le nouveau système de gestion des congés est prêt.');
            console.log('   Vous pouvez maintenant tester le formulaire de demande d\'absence.');
            console.log('\n📝 Prochaines étapes:');
            console.log('   1. Testez la création d\'une demande d\'absence avec un motif');
            console.log('   2. Vérifiez que la liste déroulante des motifs apparaît');
            console.log('   3. Testez un congé exceptionnel pour vérifier la gestion des dettes');
        } else {
            console.log('⚠️ CERTAINS ÉLÉMENTS MANQUENT');
            console.log('   Veuillez réexécuter les scripts manquants.');
            console.log('\n📝 Scripts à réexécuter:');
            if (agentCongesColumns.rows.length === 0 || !existingColumns.includes('motif_conge')) {
                console.log('   - backend/database/add_all_conges_columns.sql');
            }
            if (!existingTables.includes('agent_conges') || !existingTables.includes('jours_feries')) {
                console.log('   - backend/scripts/init-systeme-conges.js');
            }
            if (functionCheck.rows.length === 0) {
                console.log('   - backend/database/create_function_jours_ouvres.sql');
            }
        }

    } catch (error) {
        console.error('\n❌ ERREUR lors de la vérification:');
        console.error('   Message:', error.message);
        console.error('   Stack:', error.stack);
        
        if (error.message.includes('permission denied')) {
            console.error('\n⚠️ PROBLÈME DE PERMISSIONS');
            console.error('   Exécutez: node scripts/grant-permissions-conges.js');
        }
    } finally {
        await pool.end();
        console.log('\n✅ Vérification terminée.');
    }
}

// Exécuter la vérification
verifyNewCongesSystem().catch(console.error);

