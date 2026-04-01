const pool = require('../config/database');

async function checkServicesStructure() {
    console.log('🔍 Vérification de la structure de la table services...\n');

    try {
        // Vérifier la structure de la table
        const structureQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'services' 
            ORDER BY ordinal_position;
        `;

        const structureResult = await pool.query(structureQuery);
        console.log('📋 Colonnes actuelles de la table services:');
        structureResult.rows.forEach(row => {
            console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default || 'NULL'})`);
        });

        // Vérifier les contraintes
        const constraintsQuery = `
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints 
            WHERE table_name = 'services';
        `;

        const constraintsResult = await pool.query(constraintsQuery);
        console.log('\n📋 Contraintes actuelles de la table services:');
        constraintsResult.rows.forEach(row => {
            console.log(`   - ${row.constraint_name}: ${row.constraint_type}`);
        });

        // Vérifier les index
        const indexesQuery = `
            SELECT indexname, indexdef
            FROM pg_indexes 
            WHERE tablename = 'services';
        `;

        const indexesResult = await pool.query(indexesQuery);
        console.log('\n📋 Index actuels de la table services:');
        indexesResult.rows.forEach(row => {
            console.log(`   - ${row.indexname}`);
        });

        // Vérifier les données existantes
        const dataQuery = 'SELECT COUNT(*) as count FROM services;';
        const dataResult = await pool.query(dataQuery);
        console.log(`\n📊 Nombre de services existants: ${dataResult.rows[0].count}`);

        if (dataResult.rows[0].count > 0) {
            const sampleQuery = 'SELECT * FROM services LIMIT 3;';
            const sampleResult = await pool.query(sampleQuery);
            console.log('\n📋 Exemple de données existantes:');
            sampleResult.rows.forEach((row, index) => {
                console.log(`   Service ${index + 1}:`, row);
            });
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
        process.exit(1);
    }
}

// Exécuter le script
checkServicesStructure();