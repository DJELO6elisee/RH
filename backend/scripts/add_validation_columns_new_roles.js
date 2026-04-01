const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function addValidationColumns() {
    const client = await pool.connect();

    try {
        console.log('🔄 Ajout des colonnes de validation pour les nouveaux rôles...\n');

        await client.query('BEGIN');

        // ========================================
        // 1. COLONNES POUR LE SOUS-DIRECTEUR
        // ========================================
        console.log('📝 Ajout des colonnes pour le Sous-Directeur...');

        await client.query(`
            ALTER TABLE demandes ADD COLUMN IF NOT EXISTS statut_sous_directeur VARCHAR(50) DEFAULT NULL
        `);

        await client.query(`
            ALTER TABLE demandes ADD COLUMN IF NOT EXISTS date_validation_sous_directeur TIMESTAMP DEFAULT NULL
        `);

        await client.query(`
            ALTER TABLE demandes ADD COLUMN IF NOT EXISTS commentaire_sous_directeur TEXT DEFAULT NULL
        `);

        await client.query(`
            ALTER TABLE demandes ADD COLUMN IF NOT EXISTS id_validateur_sous_directeur INTEGER REFERENCES agents(id) ON DELETE SET NULL
        `);

        console.log('✅ Colonnes Sous-Directeur ajoutées');

        // ========================================
        // 2. COLONNES POUR LE DIRECTEUR
        // ========================================
        console.log('📝 Ajout des colonnes pour le Directeur...');

        await client.query(`
            ALTER TABLE demandes ADD COLUMN IF NOT EXISTS statut_directeur VARCHAR(50) DEFAULT NULL
        `);

        await client.query(`
            ALTER TABLE demandes ADD COLUMN IF NOT EXISTS date_validation_directeur TIMESTAMP DEFAULT NULL
        `);

        await client.query(`
            ALTER TABLE demandes ADD COLUMN IF NOT EXISTS commentaire_directeur TEXT DEFAULT NULL
        `);

        await client.query(`
            ALTER TABLE demandes ADD COLUMN IF NOT EXISTS id_validateur_directeur INTEGER REFERENCES agents(id) ON DELETE SET NULL
        `);

        console.log('✅ Colonnes Directeur ajoutées');

        // ========================================
        // 3. COLONNES POUR LE DIRECTEUR DE CABINET
        // ========================================
        console.log('📝 Ajout des colonnes pour le Directeur de Cabinet...');

        await client.query(`
            ALTER TABLE demandes ADD COLUMN IF NOT EXISTS statut_dir_cabinet VARCHAR(50) DEFAULT NULL
        `);

        await client.query(`
            ALTER TABLE demandes ADD COLUMN IF NOT EXISTS date_validation_dir_cabinet TIMESTAMP DEFAULT NULL
        `);

        await client.query(`
            ALTER TABLE demandes ADD COLUMN IF NOT EXISTS commentaire_dir_cabinet TEXT DEFAULT NULL
        `);

        await client.query(`
            ALTER TABLE demandes ADD COLUMN IF NOT EXISTS id_validateur_dir_cabinet INTEGER REFERENCES agents(id) ON DELETE SET NULL
        `);

        console.log('✅ Colonnes Directeur de Cabinet ajoutées');

        // ========================================
        // 4. INDEXES POUR OPTIMISER LES PERFORMANCES
        // ========================================
        console.log('📝 Ajout des index pour optimisation...');

        // Index sur les statuts
        await client.query(`CREATE INDEX IF NOT EXISTS idx_demandes_statut_sous_directeur ON demandes(statut_sous_directeur)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_demandes_statut_directeur ON demandes(statut_directeur)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_demandes_statut_dir_cabinet ON demandes(statut_dir_cabinet)`);

        // Index sur les dates
        await client.query(`CREATE INDEX IF NOT EXISTS idx_demandes_date_validation_sous_directeur ON demandes(date_validation_sous_directeur)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_demandes_date_validation_directeur ON demandes(date_validation_directeur)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_demandes_date_validation_dir_cabinet ON demandes(date_validation_dir_cabinet)`);

        // Index sur les validateurs
        await client.query(`CREATE INDEX IF NOT EXISTS idx_demandes_id_validateur_sous_directeur ON demandes(id_validateur_sous_directeur)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_demandes_id_validateur_directeur ON demandes(id_validateur_directeur)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_demandes_id_validateur_dir_cabinet ON demandes(id_validateur_dir_cabinet)`);

        console.log('✅ Index ajoutés');

        // Commit de la transaction
        await client.query('COMMIT');

        // ========================================
        // 5. VÉRIFICATION
        // ========================================
        console.log('\n📋 Vérification des colonnes ajoutées...\n');

        const result = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'demandes'
            AND (
                column_name LIKE '%sous_directeur%' 
                OR column_name LIKE '%directeur%'
                OR column_name LIKE '%dir_cabinet%'
            )
            ORDER BY column_name
        `);

        console.table(result.rows);

        console.log('\n✅ Migration terminée avec succès !');
        console.log('\n📊 Résumé:');
        console.log('   - Colonnes Sous-Directeur: 4');
        console.log('   - Colonnes Directeur: 4');
        console.log('   - Colonnes Directeur de Cabinet: 4');
        console.log('   - Index créés: 9');
        console.log('   - Total: 12 colonnes + 9 index\n');

        console.log('📋 Prochaine étape:');
        console.log('   Mettre à jour la logique de validation dans DemandesController.js\n');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erreur lors de la migration:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter la migration
console.log('='.repeat(60));
console.log('🚀 MIGRATION: Ajout des colonnes de validation');
console.log('='.repeat(60));
console.log('');

addValidationColumns()
    .then(() => {
        console.log('='.repeat(60));
        console.log('✅ Migration terminée');
        console.log('='.repeat(60));
        process.exit(0);
    })
    .catch((error) => {
        console.error('='.repeat(60));
        console.error('❌ Échec de la migration');
        console.error('='.repeat(60));
        console.error(error);
        process.exit(1);
    });