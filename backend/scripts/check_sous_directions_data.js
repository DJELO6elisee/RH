const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'ma_rh_db',
    password: process.env.DB_PASSWORD || '12345',
    port: process.env.DB_PORT || 5432,
});

async function checkSousDirectionsData() {
    console.log('🧪 Vérification des données dans la table sous_directions...\n');

    try {
        // Vérifier d'abord si la table existe
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'sous_directions'
            );
        `);

        if (!tableExists.rows[0].exists) {
            console.log('❌ La table sous_directions n\'existe pas dans la base de données.');
            console.log('   Vous devez d\'abord créer cette table.');
            return;
        }

        // Récupérer les données
        const result = await pool.query(`
            SELECT 
                id, 
                libelle, 
                id_ministere,
                direction_id,
                sous_directeur_id,
                is_active
            FROM sous_directions 
            ORDER BY libelle ASC
        `);

        if (result.rows.length > 0) {
            console.log(`✅ ${result.rows.length} sous-direction(s) trouvée(s) :`);
            console.log('┌────┬─────────────────────────────────┬──────────────┬──────────────┬─────────────────┬──────────┐');
            console.log('│ ID │ Libellé                         │ Ministère ID │ Direction ID │ Sous-directeur  │ Actif    │');
            console.log('├────┼─────────────────────────────────┼──────────────┼──────────────┼─────────────────┼──────────┤');

            result.rows.forEach(sd => {
                const libelle = sd.libelle.length > 30 ? sd.libelle.substring(0, 27) + '...' : sd.libelle;
                const sousDirecteur = sd.sous_directeur_id ? `ID: ${sd.sous_directeur_id}` : 'Non assigné';
                console.log(`│ ${sd.id.toString().padStart(2)} │ ${libelle.padEnd(31)} │ ${sd.id_ministere?.toString().padStart(10) || 'N/A'.padStart(10)} │ ${sd.direction_id?.toString().padStart(10) || 'N/A'.padStart(10)} │ ${sousDirecteur.padEnd(15)} │ ${sd.is_active ? 'Oui' : 'Non'.padStart(6)} │`);
            });
            console.log('└────┴─────────────────────────────────┴──────────────┴──────────────┴─────────────────┴──────────┘');
        } else {
            console.log('⚠️ Aucune sous-direction trouvée dans la base de données.');
            console.log('   La liste sera vide dans le formulaire.');
            console.log('\n💡 Pour ajouter des sous-directions de test, vous pouvez :');
            console.log('   1. Utiliser l\'interface de gestion des sous-directions');
            console.log('   2. Exécuter des requêtes SQL directes');
        }

        // Vérifier aussi les directions pour comprendre la structure
        console.log('\n🔍 Vérification des directions disponibles...');
        const directionsResult = await pool.query(`
            SELECT id, libelle, id_ministere 
            FROM directions 
            ORDER BY libelle ASC
        `);

        if (directionsResult.rows.length > 0) {
            console.log(`✅ ${directionsResult.rows.length} direction(s) disponible(s) :`);
            directionsResult.rows.forEach(d => {
                console.log(`   - ID: ${d.id}, Libellé: ${d.libelle} (Ministère: ${d.id_ministere})`);
            });
        } else {
            console.log('⚠️ Aucune direction trouvée.');
        }

    } catch (error) {
        console.error('❌ Erreur lors de la vérification des données :', error.message);
        console.error('   Détails :', error);
    } finally {
        await pool.end();
    }
}

checkSousDirectionsData();
