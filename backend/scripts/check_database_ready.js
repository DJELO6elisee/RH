/**
 * Script de vérification de la base de données
 * Vérifie que toutes les tables nécessaires existent et sont prêtes pour l'import
 */

const db = require('../config/database');

/**
 * Vérifie si une table existe
 */
async function checkTableExists(tableName) {
    try {
        const result = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = $1
            );
        `, [tableName]);

        return result.rows[0].exists;
    } catch (error) {
        console.error(`Erreur lors de la vérification de la table ${tableName}:`, error.message);
        return false;
    }
}

/**
 * Compte les enregistrements dans une table
 */
async function countRecords(tableName) {
    try {
        const result = await db.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        return parseInt(result.rows[0].count);
    } catch (error) {
        console.error(`Erreur lors du comptage dans ${tableName}:`, error.message);
        return 0;
    }
}

/**
 * Vérifie si le ministère du Tourisme existe
 */
async function checkMinistere() {
    try {
        const result = await db.query(`
            SELECT id, nom, code FROM ministeres 
            WHERE UPPER(nom) LIKE '%TOURISME%'
            LIMIT 1
        `);

        if (result.rows.length > 0) {
            return {
                exists: true,
                data: result.rows[0]
            };
        }

        return { exists: false };
    } catch (error) {
        console.error('Erreur lors de la vérification du ministère:', error.message);
        return { exists: false };
    }
}

/**
 * Fonction principale de vérification
 */
async function checkDatabase() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔍 VÉRIFICATION DE LA BASE DE DONNÉES');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const checks = [];

    // 1. Vérifier les tables principales
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ 1. TABLES PRINCIPALES                                        │');
    console.log('└─────────────────────────────────────────────────────────────┘\n');

    const requiredTables = [
        'agents',
        'ministeres',
        'directions',
        'services',
        'localites',
        'positions',
        'emplois',
        'echelons',
        'fonction_agents'
    ];

    for (const table of requiredTables) {
        const exists = await checkTableExists(table);
        const count = exists ? await countRecords(table) : 0;

        if (exists) {
            console.log(`✅ ${table.padEnd(25)} existe (${count} enregistrements)`);
            checks.push({ table, status: 'ok', count });
        } else {
            console.log(`❌ ${table.padEnd(25)} MANQUANTE`);
            checks.push({ table, status: 'missing', count: 0 });
        }
    }

    // 2. Vérifier le ministère du Tourisme
    console.log('\n┌─────────────────────────────────────────────────────────────┐');
    console.log('│ 2. MINISTÈRE DU TOURISME                                     │');
    console.log('└─────────────────────────────────────────────────────────────┘\n');

    const ministereCheck = await checkMinistere();

    if (ministereCheck.exists) {
        console.log(`✅ Ministère trouvé:`);
        console.log(`   ID: ${ministereCheck.data.id}`);
        console.log(`   Nom: ${ministereCheck.data.nom}`);
        console.log(`   Code: ${ministereCheck.data.code || 'N/A'}\n`);
        checks.push({ item: 'ministere', status: 'ok' });
    } else {
        console.log(`❌ Ministère du Tourisme NON TROUVÉ`);
        console.log(`   Créez-le avec:`);
        console.log(`   INSERT INTO ministeres (nom, code) VALUES ('MINISTERE DU TOURISME ET DES LOISIRS', 'MTL');\n`);
        checks.push({ item: 'ministere', status: 'missing' });
    }

    // 3. Vérifier les données de référence importantes
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ 3. DONNÉES DE RÉFÉRENCE                                      │');
    console.log('└─────────────────────────────────────────────────────────────┘\n');

    const agentsCount = await countRecords('agents');
    const directionsCount = await countRecords('directions');
    const servicesCount = await countRecords('services');

    console.log(`📊 Agents existants: ${agentsCount}`);
    console.log(`📊 Directions existantes: ${directionsCount}`);
    console.log(`📊 Services existants: ${servicesCount}\n`);

    // 4. Résumé et recommandations
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ 4. RÉSUMÉ                                                    │');
    console.log('└─────────────────────────────────────────────────────────────┘\n');

    const missingTables = checks.filter(c => c.status === 'missing');

    if (missingTables.length === 0) {
        console.log('✅ Toutes les tables nécessaires sont présentes\n');

        if (agentsCount > 0) {
            console.log('⚠️  ATTENTION: La table agents contient déjà des données');
            console.log(`   ${agentsCount} agents présents`);
            console.log('   Le script d\'import ignorera les matricules déjà existants\n');
        } else {
            console.log('ℹ️  La table agents est vide, prête pour l\'import\n');
        }

        console.log('┌─────────────────────────────────────────────────────────────┐');
        console.log('│ 5. PROCHAINES ÉTAPES                                         │');
        console.log('└─────────────────────────────────────────────────────────────┘\n');

        console.log('1️⃣  Prévisualisez le mapping des colonnes:');
        console.log('   node scripts/preview_csv_mapping.js\n');

        console.log('2️⃣  Lancez l\'import (recommandé):');
        console.log('   node scripts/import_agents_advanced.js\n');

        console.log('3️⃣  OU utilisez l\'import basique:');
        console.log('   node scripts/import_agents_from_csv.js\n');

        console.log('⚠️  RECOMMANDATION: Faites une sauvegarde avant l\'import:');
        console.log('   pg_dump -U postgres -d votre_base > backup_$(date +%Y%m%d).sql\n');

        return true;
    } else {
        console.log('❌ Des tables sont manquantes:\n');
        missingTables.forEach(check => {
            console.log(`   - ${check.table || check.item}`);
        });

        console.log('\n💡 SOLUTION:');
        console.log('   Exécutez le script SQL de création de la base de données:');
        console.log('   psql -U postgres -d votre_base < ma_rh_db.sql\n');

        return false;
    }

    console.log('═══════════════════════════════════════════════════════════════\n');
}

// Exécution du script
if (require.main === module) {
    checkDatabase()
        .then((ready) => {
            if (ready) {
                console.log('🎉 Base de données PRÊTE pour l\'import !');
                process.exit(0);
            } else {
                console.log('⚠️  Base de données NON PRÊTE - Corrigez les erreurs ci-dessus');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('💥 Erreur fatale:', error);
            process.exit(1);
        });
}

module.exports = { checkDatabase };
