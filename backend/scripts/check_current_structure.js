const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ma_rh_db',
    password: '12345',
    port: 5432,
});

async function checkCurrentStructure() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Vérification de la structure actuelle...\n');
        
        // 1. Vérifier la structure de la table agents
        console.log('1️⃣ Structure de la table agents:');
        const agentsColumnsQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'agents'
            ORDER BY ordinal_position
        `;
        
        const agentsColumnsResult = await client.query(agentsColumnsQuery);
        
        agentsColumnsResult.rows.forEach((col, index) => {
            console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
        });
        
        // 2. Vérifier la structure de la table directions
        console.log('\n2️⃣ Structure de la table directions:');
        const directionsColumnsQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'directions'
            ORDER BY ordinal_position
        `;
        
        const directionsColumnsResult = await client.query(directionsColumnsQuery);
        
        directionsColumnsResult.rows.forEach((col, index) => {
            console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
        });
        
        // 3. Vérifier la structure de la table ministeres
        console.log('\n3️⃣ Structure de la table ministeres:');
        const ministeresColumnsQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'ministeres'
            ORDER BY ordinal_position
        `;
        
        const ministeresColumnsResult = await client.query(ministeresColumnsQuery);
        
        ministeresColumnsResult.rows.forEach((col, index) => {
            console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
        });
        
        // 4. Vérifier la structure de la table entites_administratives
        console.log('\n4️⃣ Structure de la table entites_administratives:');
        const entitesColumnsQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'entites_administratives'
            ORDER BY ordinal_position
        `;
        
        const entitesColumnsResult = await client.query(entitesColumnsQuery);
        
        if (entitesColumnsResult.rows.length > 0) {
            entitesColumnsResult.rows.forEach((col, index) => {
                console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
            });
        } else {
            console.log('   ⚠️ Table entites_administratives non trouvée');
        }
        
        // 5. Vérifier les contraintes de clés étrangères sur agents
        console.log('\n5️⃣ Contraintes de clés étrangères sur la table agents:');
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
            AND tc.table_name='agents'
        `;
        
        const fkResult = await client.query(fkQuery);
        
        if (fkResult.rows.length > 0) {
            fkResult.rows.forEach((fk, index) => {
                console.log(`   ${index + 1}. ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
            });
        } else {
            console.log('   Aucune contrainte de clé étrangère trouvée');
        }
        
        // 6. Vérifier les données existantes
        console.log('\n6️⃣ Données existantes:');
        
        const agentsCountQuery = `SELECT COUNT(*) as count FROM agents`;
        const agentsCountResult = await client.query(agentsCountQuery);
        console.log(`   - Agents: ${agentsCountResult.rows[0].count}`);
        
        const directionsCountQuery = `SELECT COUNT(*) as count FROM directions`;
        const directionsCountResult = await client.query(directionsCountQuery);
        console.log(`   - Directions: ${directionsCountResult.rows[0].count}`);
        
        const ministeresCountQuery = `SELECT COUNT(*) as count FROM ministeres`;
        const ministeresCountResult = await client.query(ministeresCountQuery);
        console.log(`   - Ministères: ${ministeresCountResult.rows[0].count}`);
        
        if (entitesColumnsResult.rows.length > 0) {
            const entitesCountQuery = `SELECT COUNT(*) as count FROM entites_administratives`;
            const entitesCountResult = await client.query(entitesCountQuery);
            console.log(`   - Entités administratives: ${entitesCountResult.rows[0].count}`);
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
checkCurrentStructure()
    .then(() => {
        console.log('\n🎊 Vérification terminée !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });
