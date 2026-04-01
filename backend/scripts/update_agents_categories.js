const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const db = require('../config/database');

const CSV_FILE_PATH = path.join(__dirname, '../../Liste-du-Personel-_1_.csv');

/**
 * Récupère ou crée une catégorie
 */
async function getOrCreateCategorie(libelle) {
    if (!libelle || libelle.trim() === '') return null;

    try {
        const result = await db.query(
            'SELECT id FROM categories WHERE UPPER(libele) = UPPER($1) LIMIT 1', [libelle.trim()]
        );

        if (result.rows.length > 0) {
            return result.rows[0].id;
        }

        const insertResult = await db.query(
            'INSERT INTO categories (libele) VALUES ($1) RETURNING id', [libelle.trim()]
        );

        return insertResult.rows[0].id;
    } catch (error) {
        console.error(`Erreur catégorie "${libelle}":`, error.message);
        return null;
    }
}

/**
 * Fonction principale
 */
async function updateAgentsCategories() {
    console.log('📂 Fichier CSV:', CSV_FILE_PATH);
    console.log('\n🚀 Mise à jour des catégories des agents...\n');

    const rows = [];

    return new Promise((resolve, reject) => {
        fs.createReadStream(CSV_FILE_PATH)
            .pipe(csv())
            .on('data', (row) => rows.push(row))
            .on('end', async() => {
                console.log(`📋 ${rows.length} lignes lues du fichier CSV\n`);
                console.log('⏳ Traitement en cours...\n');

                let updated = 0;
                let skipped = 0;
                let errors = 0;

                for (const row of rows) {
                    // Ignorer les lignes de séparation et vides
                    if (!row.Matricule ||
                        row.Matricule.trim() === '' ||
                        row.Matricule.startsWith('DIR / SER') ||
                        row.Matricule.includes('sous/total') ||
                        row.Matricule.includes('total general')) {
                        skipped++;
                        continue;
                    }

                    const matricule = row.Matricule.trim();
                    const categorie = row['Categorie'];

                    if (!categorie || categorie.trim() === '') {
                        skipped++;
                        continue;
                    }

                    try {
                        // Récupérer l'ID de la catégorie
                        const id_categorie = await getOrCreateCategorie(categorie);

                        if (id_categorie) {
                            // Mettre à jour l'agent
                            const result = await db.query(
                                'UPDATE agents SET id_categorie = $1 WHERE matricule = $2', [id_categorie, matricule]
                            );

                            if (result.rowCount > 0) {
                                updated++;
                                console.log(`✅ ${matricule} - Catégorie: ${categorie}`);
                            } else {
                                skipped++;
                            }
                        }
                    } catch (error) {
                        errors++;
                        console.error(`❌ Erreur ${matricule}:`, error.message);
                    }
                }

                console.log('\n📊 RÉSUMÉ:');
                console.log('═══════════════════════════════════');
                console.log(`✅ Agents mis à jour: ${updated}`);
                console.log(`⏭️  Lignes ignorées: ${skipped}`);
                console.log(`❌ Erreurs: ${errors}`);
                console.log('═══════════════════════════════════\n');
                console.log('🎉 Mise à jour terminée !\n');

                await db.end();
                resolve();
            })
            .on('error', reject);
    });
}

// Test de connexion puis exécution
(async() => {
    try {
        const client = await db.connect();
        await client.query('SELECT NOW()');
        client.release();
        console.log('✅ Test de connexion PostgreSQL réussi\n');

        await updateAgentsCategories();
    } catch (error) {
        console.error('❌ Erreur:', error);
        process.exit(1);
    }
})();
