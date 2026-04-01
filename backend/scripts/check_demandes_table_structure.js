const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ma_rh_db',
    password: '12345',
    port: 5432,
});

async function checkDemandesTableStructure() {
    const client = await pool.connect();

    try {
        console.log('🔍 Vérification de la structure de la table demandes...\n');

        // Vérifier les colonnes de la table demandes
        const columnsQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'demandes'
            ORDER BY ordinal_position
        `;

        const columnsResult = await client.query(columnsQuery);

        console.log(`📊 Structure de la table demandes (${columnsResult.rows.length} colonnes):`);
        console.log('');

        columnsResult.rows.forEach((col, index) => {
            console.log(`${index + 1}. ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
            if (col.column_default) {
                console.log(`   Default: ${col.column_default}`);
            }
        });

        console.log('\n🔍 Colonnes liées aux validateurs:');

        const validatorColumns = columnsResult.rows.filter(col =>
            col.column_name.includes('validateur') ||
            col.column_name.includes('statut_') ||
            col.column_name.includes('date_validation_') ||
            col.column_name.includes('commentaire_')
        );

        if (validatorColumns.length > 0) {
            validatorColumns.forEach(col => {
                console.log(`   - ${col.column_name} (${col.data_type})`);
            });
        } else {
            console.log('   Aucune colonne de validateur trouvée');
        }

        console.log('\n🔍 Colonnes liées aux rôles spécifiques:');

        const roleColumns = columnsResult.rows.filter(col =>
            col.column_name.includes('drh') ||
            col.column_name.includes('directeur') ||
            col.column_name.includes('ministre') ||
            col.column_name.includes('chef')
        );

        if (roleColumns.length > 0) {
            roleColumns.forEach(col => {
                console.log(`   - ${col.column_name} (${col.data_type})`);
            });
        } else {
            console.log('   Aucune colonne spécifique aux rôles trouvée');
        }

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error.message);
        console.error(error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter la vérification
checkDemandesTableStructure()
    .then(() => {
        console.log('\n🎊 Vérification terminée !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });