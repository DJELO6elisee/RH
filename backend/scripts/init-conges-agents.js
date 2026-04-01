const pool = require('../config/database');

/**
 * Script pour initialiser les congés de l'année en cours pour tous les agents actifs
 * Tous les agents recevront 30 jours de congés pour l'année en cours
 */
async function initCongesAgents() {
    try {
        console.log('🚀 Début de l\'initialisation des congés pour tous les agents...');
        
        const anneeCourante = new Date().getFullYear();
        console.log(`📅 Année en cours: ${anneeCourante}`);
        
        // Récupérer tous les agents actifs qui n'ont pas encore de congés pour l'année en cours
        const query = `
            INSERT INTO agent_conges (
                id_agent,
                annee,
                jours_pris,
                jours_alloues,
                jours_restants,
                jours_reportes,
                created_at,
                updated_at
            )
            SELECT 
                a.id,
                $1 as annee,
                0 as jours_pris,
                30 as jours_alloues,
                30 as jours_restants,
                0 as jours_reportes,
                CURRENT_TIMESTAMP as created_at,
                CURRENT_TIMESTAMP as updated_at
            FROM agents a
            WHERE (a.retire IS NULL OR a.retire = false)
              AND a.id NOT IN (
                  SELECT id_agent 
                  FROM agent_conges 
                  WHERE annee = $1
              )
            ON CONFLICT (id_agent, annee) DO NOTHING
            RETURNING id;
        `;
        
        const result = await pool.query(query, [anneeCourante]);
        const nombreAgentsInitialises = result.rowCount;
        
        console.log(`✅ ${nombreAgentsInitialises} agent(s) initialisé(s) avec 30 jours de congés pour l'année ${anneeCourante}`);
        
        // Vérification : Afficher le nombre total d'agents avec des congés
        const checkQuery = `
            SELECT 
                COUNT(*) as nombre_agents_avec_conges,
                SUM(jours_alloues) as total_jours_alloues,
                SUM(jours_pris) as total_jours_pris,
                SUM(jours_restants) as total_jours_restants
            FROM agent_conges
            WHERE annee = $1
        `;
        
        const checkResult = await pool.query(checkQuery, [anneeCourante]);
        const stats = checkResult.rows[0];
        
        console.log('\n📊 Statistiques des congés:');
        console.log(`   - Nombre d'agents avec congés: ${stats.nombre_agents_avec_conges}`);
        console.log(`   - Total jours alloués: ${stats.total_jours_alloues}`);
        console.log(`   - Total jours pris: ${stats.total_jours_pris || 0}`);
        console.log(`   - Total jours restants: ${stats.total_jours_restants}`);
        
        console.log('\n✅ Initialisation terminée avec succès!');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation des congés:', error);
        process.exit(1);
    }
}

// Exécuter le script si appelé directement
if (require.main === module) {
    initCongesAgents();
}

module.exports = initCongesAgents;

