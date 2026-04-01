const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ma_rh_db',
    password: '12345',
    port: 5432,
});

async function checkDocumentsTable() {
    const client = await pool.connect();

    try {
        console.log('🔍 Recherche des tables de documents...\n');

        // Chercher toutes les tables qui contiennent "document" dans le nom
        const tablesQuery = `
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE '%document%'
            ORDER BY table_name
        `;

        const tablesResult = await client.query(tablesQuery);

        console.log(`📊 Tables contenant "document" trouvées:`);

        if (tablesResult.rows.length > 0) {
            tablesResult.rows.forEach((table, index) => {
                console.log(`${index + 1}. ${table.table_name}`);
            });

            // Pour chaque table trouvée, afficher sa structure
            for (const table of tablesResult.rows) {
                console.log(`\n🔍 Structure de la table "${table.table_name}":`);

                const columnsQuery = `
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = $1
                    ORDER BY ordinal_position
                `;

                const columnsResult = await client.query(columnsQuery, [table.table_name]);

                columnsResult.rows.forEach((col, index) => {
                    console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
                });
            }
        } else {
            console.log('   Aucune table contenant "document" trouvée');
        }

        // Chercher aussi les tables qui pourraient contenir des fichiers ou des attestations
        console.log('\n🔍 Recherche d\'autres tables liées aux fichiers...\n');

        const otherTablesQuery = `
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND (table_name LIKE '%attestation%' OR table_name LIKE '%fichier%' OR table_name LIKE '%file%' OR table_name LIKE '%pdf%')
            ORDER BY table_name
        `;

        const otherTablesResult = await client.query(otherTablesQuery);

        if (otherTablesResult.rows.length > 0) {
            console.log(`📊 Autres tables trouvées:`);
            otherTablesResult.rows.forEach((table, index) => {
                console.log(`${index + 1}. ${table.table_name}`);
            });
        } else {
            console.log('   Aucune autre table liée aux fichiers trouvée');
        }

        // Lister toutes les tables pour avoir une vue d'ensemble
        console.log('\n🔍 Toutes les tables de la base de données:\n');

        const allTablesQuery = `
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        `;

        const allTablesResult = await client.query(allTablesQuery);

        console.log(`📊 ${allTablesResult.rows.length} tables trouvées:`);

        allTablesResult.rows.forEach((table, index) => {
            console.log(`${index + 1}. ${table.table_name}`);
        });

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error.message);
        console.error(error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter la vérification
checkDocumentsTable()
    .then(() => {
        console.log('\n🎊 Vérification terminée !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });