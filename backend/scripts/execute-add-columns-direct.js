const pool = require('../config/database');
require('dotenv').config();

async function addColumnsDirectly() {
    console.log('🚀 Ajout direct des colonnes dans la base de données...\n');

    try {
        // 1. Ajouter dette_annee_suivante dans agent_conges
        console.log('1️⃣ Ajout de la colonne dette_annee_suivante dans agent_conges...');
        try {
            await pool.query(`
                ALTER TABLE agent_conges 
                ADD COLUMN IF NOT EXISTS dette_annee_suivante INTEGER DEFAULT 0
            `);
            console.log('   ✅ Colonne dette_annee_suivante ajoutée (ou existe déjà)');
        } catch (error) {
            if (error.message.includes('already exists') || error.message.includes('duplicate')) {
                console.log('   ✅ Colonne dette_annee_suivante existe déjà');
            } else {
                throw error;
            }
        }

        // 2. Ajouter les colonnes dans demandes
        console.log('\n2️⃣ Ajout des colonnes dans demandes...');
        
        // motif_conge
        try {
            await pool.query(`
                ALTER TABLE demandes 
                ADD COLUMN IF NOT EXISTS motif_conge VARCHAR(100)
            `);
            console.log('   ✅ Colonne motif_conge ajoutée (ou existe déjà)');
        } catch (error) {
            if (error.message.includes('already exists') || error.message.includes('duplicate')) {
                console.log('   ✅ Colonne motif_conge existe déjà');
            } else {
                console.error('   ❌ Erreur:', error.message);
            }
        }

        // nombre_jours
        try {
            await pool.query(`
                ALTER TABLE demandes 
                ADD COLUMN IF NOT EXISTS nombre_jours INTEGER
            `);
            console.log('   ✅ Colonne nombre_jours ajoutée (ou existe déjà)');
        } catch (error) {
            if (error.message.includes('already exists') || error.message.includes('duplicate')) {
                console.log('   ✅ Colonne nombre_jours existe déjà');
            } else {
                console.error('   ❌ Erreur:', error.message);
            }
        }

        // raison_exceptionnelle
        try {
            await pool.query(`
                ALTER TABLE demandes 
                ADD COLUMN IF NOT EXISTS raison_exceptionnelle TEXT
            `);
            console.log('   ✅ Colonne raison_exceptionnelle ajoutée (ou existe déjà)');
        } catch (error) {
            if (error.message.includes('already exists') || error.message.includes('duplicate')) {
                console.log('   ✅ Colonne raison_exceptionnelle existe déjà');
            } else {
                console.error('   ❌ Erreur:', error.message);
            }
        }

        // jours_restants_apres_deduction
        try {
            await pool.query(`
                ALTER TABLE demandes 
                ADD COLUMN IF NOT EXISTS jours_restants_apres_deduction INTEGER
            `);
            console.log('   ✅ Colonne jours_restants_apres_deduction ajoutée (ou existe déjà)');
        } catch (error) {
            if (error.message.includes('already exists') || error.message.includes('duplicate')) {
                console.log('   ✅ Colonne jours_restants_apres_deduction existe déjà');
            } else {
                console.error('   ❌ Erreur:', error.message);
            }
        }

        // 3. Ajouter les commentaires
        console.log('\n3️⃣ Ajout des commentaires...');
        try {
            await pool.query(`
                COMMENT ON COLUMN agent_conges.dette_annee_suivante IS 'Nombre de jours dus à l''année suivante (pour congés exceptionnels)'
            `);
            await pool.query(`
                COMMENT ON COLUMN demandes.motif_conge IS 'Motif du congé: congé annuel, congé de paternité, congé de maternité, congé partiel, congé exceptionnel'
            `);
            await pool.query(`
                COMMENT ON COLUMN demandes.nombre_jours IS 'Nombre de jours de congé demandés (jours ouvrés)'
            `);
            await pool.query(`
                COMMENT ON COLUMN demandes.raison_exceptionnelle IS 'Raison justifiant le congé exceptionnel (si motif = congé exceptionnel)'
            `);
            await pool.query(`
                COMMENT ON COLUMN demandes.jours_restants_apres_deduction IS 'Jours restants après déduction de ce congé (peut être négatif pour congés exceptionnels)'
            `);
            console.log('   ✅ Commentaires ajoutés');
        } catch (error) {
            console.warn('   ⚠️ Erreur lors de l\'ajout des commentaires (non bloquant):', error.message);
        }

        // 4. Vérification finale
        console.log('\n4️⃣ Vérification finale...');
        const verification = await pool.query(`
            SELECT 
                table_name,
                column_name, 
                data_type
            FROM information_schema.columns 
            WHERE (table_name = 'agent_conges' AND column_name = 'dette_annee_suivante')
               OR (table_name = 'demandes' AND column_name IN ('motif_conge', 'nombre_jours', 'raison_exceptionnelle', 'jours_restants_apres_deduction'))
            ORDER BY table_name, column_name
        `);

        if (verification.rows.length >= 5) {
            console.log('\n✅ TOUTES LES COLONNES ONT ÉTÉ AJOUTÉES AVEC SUCCÈS !');
            console.log('\n📊 Colonnes ajoutées :');
            verification.rows.forEach(row => {
                console.log(`   - ${row.table_name}.${row.column_name} (${row.data_type})`);
            });
            console.log('\n🎉 Le nouveau système de gestion des congés est prêt !');
            console.log('   Vous pouvez maintenant tester le formulaire de demande d\'absence.');
        } else {
            console.log('\n⚠️ CERTAINES COLONNES MANQUENT ENCORE');
            console.log(`   Trouvé ${verification.rows.length} colonne(s) sur 5 attendues`);
            verification.rows.forEach(row => {
                console.log(`   - ${row.table_name}.${row.column_name}`);
            });
        }

    } catch (error) {
        console.error('\n❌ ERREUR lors de l\'ajout des colonnes:');
        console.error('   Message:', error.message);
        console.error('   Code:', error.code);
        console.error('   Détail:', error.detail);
        
        if (error.message.includes('permission denied')) {
            console.error('\n⚠️ PROBLÈME DE PERMISSIONS');
            console.error('   L\'utilisateur n\'a pas les permissions pour modifier les tables.');
            console.error('   Solution : Exécutez le script avec un utilisateur admin ou utilisez phpPgAdmin avec un compte admin.');
        }
        
        process.exit(1);
    } finally {
        await pool.end();
        console.log('\n✅ Opération terminée.');
    }
}

// Exécuter
addColumnsDirectly().catch(console.error);

