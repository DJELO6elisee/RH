const db = require('../config/database');

/**
 * Script pour vérifier que les noms de colonnes dans la base de données
 * correspondent aux noms utilisés dans les contrôleurs
 */

async function verifyColumnNames() {
    console.log('🔍 Vérification des noms de colonnes...\n');
    
    try {
        // Vérifier les colonnes de la table services
        console.log('📋 Table SERVICES :');
        console.log('─────────────────────────────────────────────');
        
        const servicesQuery = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'services'
            AND column_name IN ('id_direction', 'id_sous_direction', 'direction_id', 'sous_direction_id')
            ORDER BY column_name;
        `;
        
        const servicesResult = await db.query(servicesQuery);
        
        if (servicesResult.rows.length > 0) {
            servicesResult.rows.forEach(col => {
                const isCorrect = col.column_name.startsWith('id_');
                const icon = isCorrect ? '✅' : '⚠️ ';
                console.log(`  ${icon} ${col.column_name.padEnd(25)} | Type: ${col.data_type}`);
            });
        } else {
            console.log('  ❌ Aucune colonne trouvée');
        }
        console.log('');
        
        // Vérifier les colonnes de la table sous_directions
        console.log('📋 Table SOUS_DIRECTIONS :');
        console.log('─────────────────────────────────────────────');
        
        const sousDirectionsQuery = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'sous_directions'
            AND column_name IN ('id_direction', 'direction_id')
            ORDER BY column_name;
        `;
        
        const sousDirectionsResult = await db.query(sousDirectionsQuery);
        
        if (sousDirectionsResult.rows.length > 0) {
            sousDirectionsResult.rows.forEach(col => {
                const isCorrect = col.column_name === 'id_direction';
                const icon = isCorrect ? '✅' : '⚠️ ';
                console.log(`  ${icon} ${col.column_name.padEnd(25)} | Type: ${col.data_type}`);
            });
        } else {
            console.log('  ❌ Aucune colonne trouvée');
        }
        console.log('');
        
        // Vérifier que les contrôleurs utilisent les bons noms
        console.log('📝 Vérification des contrôleurs :');
        console.log('─────────────────────────────────────────────');
        
        const fs = require('fs');
        const path = require('path');
        
        // Vérifier ServicesController.js
        const servicesControllerPath = path.join(__dirname, '../controllers/ServicesController.js');
        const servicesControllerContent = fs.readFileSync(servicesControllerPath, 'utf8');
        
        const hasOldServicesNaming = servicesControllerContent.includes('s.direction_id') || 
                                     servicesControllerContent.includes('s.sous_direction_id');
        const hasNewServicesNaming = servicesControllerContent.includes('s.id_direction') || 
                                     servicesControllerContent.includes('s.id_sous_direction');
        
        console.log(`  ServicesController.js :`);
        console.log(`    ${hasOldServicesNaming ? '❌' : '✅'} Ancien nommage (s.direction_id)       : ${hasOldServicesNaming ? 'TROUVÉ (à corriger)' : 'Non trouvé'}`);
        console.log(`    ${hasNewServicesNaming ? '✅' : '❌'} Nouveau nommage (s.id_direction)     : ${hasNewServicesNaming ? 'TROUVÉ (correct)' : 'Non trouvé'}`);
        console.log('');
        
        // Vérifier SousDirectionsController.js
        const sousDirectionsControllerPath = path.join(__dirname, '../controllers/SousDirectionsController.js');
        const sousDirectionsControllerContent = fs.readFileSync(sousDirectionsControllerPath, 'utf8');
        
        const hasOldSousDirectionsNaming = sousDirectionsControllerContent.includes('sd.direction_id =');
        const hasNewSousDirectionsNaming = sousDirectionsControllerContent.includes('sd.id_direction');
        
        console.log(`  SousDirectionsController.js :`);
        console.log(`    ${hasOldSousDirectionsNaming ? '❌' : '✅'} Ancien nommage (sd.direction_id)     : ${hasOldSousDirectionsNaming ? 'TROUVÉ (à corriger)' : 'Non trouvé'}`);
        console.log(`    ${hasNewSousDirectionsNaming ? '✅' : '❌'} Nouveau nommage (sd.id_direction)   : ${hasNewSousDirectionsNaming ? 'TROUVÉ (correct)' : 'Non trouvé'}`);
        console.log('');
        
        // Résumé
        console.log('═════════════════════════════════════════════');
        console.log('RÉSUMÉ');
        console.log('═════════════════════════════════════════════');
        
        const servicesHasCorrectColumns = servicesResult.rows.some(r => r.column_name === 'id_direction');
        const sousDirectionsHasCorrectColumns = sousDirectionsResult.rows.some(r => r.column_name === 'id_direction');
        const controllersAreCorrect = !hasOldServicesNaming && !hasOldSousDirectionsNaming && 
                                      hasNewServicesNaming && hasNewSousDirectionsNaming;
        
        console.log(`  Base de données (services)        : ${servicesHasCorrectColumns ? '✅ Colonnes correctes (id_direction)' : '⚠️  À vérifier'}`);
        console.log(`  Base de données (sous_directions) : ${sousDirectionsHasCorrectColumns ? '✅ Colonnes correctes (id_direction)' : '⚠️  À vérifier'}`);
        console.log(`  Contrôleurs                       : ${controllersAreCorrect ? '✅ Nommage correct' : '⚠️  À corriger'}`);
        console.log('═════════════════════════════════════════════\n');
        
        if (servicesHasCorrectColumns && sousDirectionsHasCorrectColumns && controllersAreCorrect) {
            console.log('🎉 Tout est correct ! Les erreurs devraient être résolues.\n');
            console.log('💡 N\'oubliez pas de redémarrer votre application Node.js !\n');
        } else {
            console.log('⚠️  Des incohérences ont été détectées.\n');
            console.log('📋 Actions recommandées :');
            
            if (!servicesHasCorrectColumns || !sousDirectionsHasCorrectColumns) {
                console.log('   1. Vérifiez que les colonnes existent dans votre base de données');
                console.log('   2. Les colonnes devraient s\'appeler "id_direction" et non "direction_id"');
            }
            
            if (!controllersAreCorrect) {
                console.log('   3. Les contrôleurs utilisent encore l\'ancien nommage');
                console.log('   4. Relancez les corrections pour mettre à jour les contrôleurs');
            }
            console.log('');
        }
        
    } catch (error) {
        console.error('\n❌ Erreur lors de la vérification :', error.message);
        console.error('\n📋 Détails :');
        console.error(error);
        process.exit(1);
    } finally {
        await db.end();
    }
}

// Exécuter le script
if (require.main === module) {
    verifyColumnNames()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Erreur fatale :', error);
            process.exit(1);
        });
}

module.exports = { verifyColumnNames };




















