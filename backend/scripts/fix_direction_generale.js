const fs = require('fs');
const path = require('path');
const db = require('../config/database');

/**
 * Script pour diagnostiquer et corriger les assignations de directions générales
 */

async function diagnosticDirectionGenerale() {
    console.log('🔍 DIAGNOSTIC DES DIRECTIONS GÉNÉRALES\n');
    console.log('═══════════════════════════════════════════════\n');
    
    try {
        // 1. Statistiques globales
        const statsQuery = `
            SELECT 
                COUNT(*) as total_agents,
                COUNT(CASE WHEN id_direction_generale IS NOT NULL THEN 1 END) as avec_dg,
                COUNT(CASE WHEN id_direction_generale IS NULL THEN 1 END) as sans_dg,
                COUNT(CASE WHEN id_direction IS NOT NULL THEN 1 END) as avec_direction,
                COUNT(CASE WHEN id_sous_direction IS NOT NULL THEN 1 END) as avec_sous_direction,
                COUNT(CASE WHEN id_service IS NOT NULL THEN 1 END) as avec_service,
                COUNT(CASE WHEN id_direction IS NOT NULL AND id_direction_generale IS NULL THEN 1 END) as direction_sans_dg,
                COUNT(CASE WHEN id_sous_direction IS NOT NULL AND id_direction_generale IS NULL THEN 1 END) as sous_direction_sans_dg,
                COUNT(CASE WHEN id_service IS NOT NULL AND id_direction_generale IS NULL THEN 1 END) as service_sans_dg
            FROM agents
            WHERE statut_emploi NOT IN ('licencie', 'demission')
        `;
        
        const statsResult = await db.query(statsQuery);
        const stats = statsResult.rows[0];
        
        console.log('📊 STATISTIQUES GLOBALES:');
        console.log('─────────────────────────────────────────────');
        console.log(`  Total agents actifs        : ${stats.total_agents}`);
        console.log(`  Avec Direction Générale    : ${stats.avec_dg} (${((stats.avec_dg / stats.total_agents) * 100).toFixed(1)}%)`);
        console.log(`  Sans Direction Générale    : ${stats.sans_dg} (${((stats.sans_dg / stats.total_agents) * 100).toFixed(1)}%)`);
        console.log('');
        console.log(`  Avec Direction             : ${stats.avec_direction}`);
        console.log(`  Avec Sous-Direction        : ${stats.avec_sous_direction}`);
        console.log(`  Avec Service               : ${stats.avec_service}`);
        console.log('');
        console.log('🚨 PROBLÈMES IDENTIFIÉS:');
        console.log(`  Direction sans DG          : ${stats.direction_sans_dg} agents`);
        console.log(`  Sous-Direction sans DG     : ${stats.sous_direction_sans_dg} agents`);
        console.log(`  Service sans DG            : ${stats.service_sans_dg} agents`);
        console.log('');
        
        // 2. Répartition par direction générale
        const dgQuery = `
            SELECT 
                COALESCE(dg.libelle, 'SANS DIRECTION GÉNÉRALE') as dg_nom,
                COUNT(a.id) as nb_agents,
                ROUND(COUNT(a.id)::DECIMAL * 100 / (
                    SELECT COUNT(*) FROM agents WHERE statut_emploi NOT IN ('licencie', 'demission')
                ), 2) as pourcentage
            FROM agents a
            LEFT JOIN direction_generale dg ON a.id_direction_generale = dg.id
            WHERE a.statut_emploi NOT IN ('licencie', 'demission')
            GROUP BY dg.id, dg.libelle
            ORDER BY nb_agents DESC
        `;
        
        const dgResult = await db.query(dgQuery);
        
        console.log('📊 RÉPARTITION PAR DIRECTION GÉNÉRALE:');
        console.log('─────────────────────────────────────────────');
        dgResult.rows.forEach(row => {
            const nom = row.dg_nom.padEnd(45);
            const nb = row.nb_agents.toString().padStart(4);
            const pct = row.pourcentage.toString().padStart(6);
            console.log(`  ${nom} : ${nb} agents (${pct}%)`);
        });
        console.log('');
        
        // 3. Lister quelques agents sans DG pour debug
        if (parseInt(stats.sans_dg) > 0) {
            const agentsSansDGQuery = `
                SELECT 
                    a.matricule,
                    a.nom,
                    a.prenom,
                    d.libelle as direction_libelle,
                    sd.libelle as sous_direction_libelle,
                    s.libelle as service_libelle
                FROM agents a
                LEFT JOIN directions d ON a.id_direction = d.id
                LEFT JOIN sous_directions sd ON a.id_sous_direction = sd.id
                LEFT JOIN services s ON a.id_service = s.id
                WHERE a.id_direction_generale IS NULL
                AND a.statut_emploi NOT IN ('licencie', 'demission')
                LIMIT 10
            `;
            
            const agentsSansDGResult = await db.query(agentsSansDGQuery);
            
            console.log('🔍 ÉCHANTILLON D\'AGENTS SANS DIRECTION GÉNÉRALE (10 premiers):');
            console.log('─────────────────────────────────────────────');
            agentsSansDGResult.rows.forEach((agent, index) => {
                console.log(`  ${index + 1}. ${agent.matricule} - ${agent.nom} ${agent.prenom}`);
                console.log(`     Direction: ${agent.direction_libelle || 'N/A'}`);
                console.log(`     Sous-Dir: ${agent.sous_direction_libelle || 'N/A'}`);
                console.log(`     Service: ${agent.service_libelle || 'N/A'}`);
            });
            console.log('');
        }
        
        console.log('═══════════════════════════════════════════════\n');
        
        return stats;
        
    } catch (error) {
        console.error('❌ Erreur lors du diagnostic:', error);
        throw error;
    }
}

async function applyFix() {
    console.log('🔧 APPLICATION DE LA CORRECTION\n');
    
    try {
        // Lire le fichier SQL
        const sqlFilePath = path.join(__dirname, '../../FIX_ASSIGNATION_DIRECTION_GENERALE.sql');
        
        if (!fs.existsSync(sqlFilePath)) {
            throw new Error(`Le fichier SQL n'existe pas : ${sqlFilePath}`);
        }
        
        console.log('📖 Lecture du fichier SQL...');
        const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
        
        // Exécuter le script SQL
        console.log('⚙️  Exécution du script SQL...\n');
        await db.query(sqlScript);
        
        console.log('\n✅ Script SQL exécuté avec succès !\n');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'application de la correction:', error);
        throw error;
    }
}

async function main() {
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║   CORRECTION DES DIRECTIONS GÉNÉRALES         ║');
    console.log('╚═══════════════════════════════════════════════╝\n');
    
    try {
        // Étape 1: Diagnostic initial
        console.log('📋 ÉTAPE 1: Diagnostic initial\n');
        const statsBefore = await diagnosticDirectionGenerale();
        
        // Si tous les agents ont déjà une DG, pas besoin de continuer
        if (parseInt(statsBefore.sans_dg) === 0) {
            console.log('🎉 Tous les agents ont déjà une direction générale !');
            console.log('   Aucune correction nécessaire.\n');
            return;
        }
        
        // Demander confirmation (en mode automatique, on applique directement)
        console.log(`⚠️  ${statsBefore.sans_dg} agents n'ont pas de direction générale`);
        console.log('   Application de la correction automatique...\n');
        
        // Étape 2: Appliquer la correction
        console.log('📋 ÉTAPE 2: Application de la correction\n');
        await applyFix();
        
        // Étape 3: Diagnostic final
        console.log('\n📋 ÉTAPE 3: Vérification après correction\n');
        const statsAfter = await diagnosticDirectionGenerale();
        
        // Résumé
        console.log('═══════════════════════════════════════════════');
        console.log('RÉSUMÉ DES CORRECTIONS');
        console.log('═══════════════════════════════════════════════\n');
        console.log(`  Avant correction  : ${statsBefore.sans_dg} agents sans DG`);
        console.log(`  Après correction  : ${statsAfter.sans_dg} agents sans DG`);
        console.log(`  Agents corrigés   : ${parseInt(statsBefore.sans_dg) - parseInt(statsAfter.sans_dg)} agents`);
        console.log('');
        
        if (parseInt(statsAfter.sans_dg) === 0) {
            console.log('🎉 SUCCÈS ! Tous les agents ont maintenant une direction générale !');
        } else {
            console.log(`⚠️  ${statsAfter.sans_dg} agents restent sans direction générale`);
            console.log('   Ces agents n\'ont probablement aucune affectation hiérarchique');
        }
        
        console.log('\n═══════════════════════════════════════════════');
        console.log('💡 PROCHAINES ÉTAPES:');
        console.log('═══════════════════════════════════════════════\n');
        console.log('  1. Redémarrez votre application Node.js');
        console.log('  2. Testez la génération des états hiérarchiques');
        console.log('  3. Vérifiez que tous les agents apparaissent dans le fichier Excel\n');
        
    } catch (error) {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    } finally {
        await db.end();
    }
}

// Exécuter le script
if (require.main === module) {
    main()
        .then(() => {
            console.log('✅ Script terminé avec succès\n');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Erreur:', error);
            process.exit(1);
        });
}

module.exports = { diagnosticDirectionGenerale, applyFix };




















