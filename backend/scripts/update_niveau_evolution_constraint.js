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

async function updateConstraint() {
    const client = await pool.connect();

    try {
        console.log('🔧 Mise à jour de la contrainte niveau_evolution_demande...');

        // Lire le fichier SQL
        const sqlPath = path.join(__dirname, '../database/update_niveau_evolution_constraint.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Exécuter le script SQL
        await client.query(sqlContent);

        console.log('✅ Contrainte mise à jour avec succès !');

        // Vérifier la nouvelle contrainte
        console.log('\n📋 Vérification de la contrainte...');
        const checkQuery = `
            SELECT conname, pg_get_constraintdef(oid) as definition
            FROM pg_constraint
            WHERE conname = 'demandes_niveau_evolution_demande_check'
        `;

        const checkResult = await client.query(checkQuery);

        if (checkResult.rows.length > 0) {
            console.log('✅ Contrainte trouvée :');
            console.log(`   Nom: ${checkResult.rows[0].conname}`);
            console.log(`   Définition: ${checkResult.rows[0].definition.substring(0, 200)}...`);
        }

        // Lister tous les niveaux possibles
        console.log('\n📊 Niveaux de validation autorisés :');
        const niveaux = [
            'soumis',
            'valide_par_superieur',
            'valide_par_chef_service',
            'valide_par_sous_directeur',
            'valide_par_directeur',
            'valide_par_drh',
            'valide_par_dir_cabinet',
            'valide_par_chef_cabinet',
            'valide_par_directeur_central',
            'valide_par_directeur_general',
            'valide_par_ministre',
            'retour_ministre',
            'retour_directeur_general',
            'retour_directeur_central',
            'retour_chef_cabinet',
            'retour_dir_cabinet',
            'retour_drh',
            'retour_directeur',
            'retour_sous_directeur',
            'retour_chef_service',
            'finalise',
            'rejete'
        ];

        niveaux.forEach((niveau, index) => {
            console.log(`${index + 1}. ${niveau}`);
        });

    } catch (error) {
        console.error('❌ Erreur lors de la mise à jour:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter le script
updateConstraint()
    .then(() => {
        console.log('\n🎉 Script terminé avec succès !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });