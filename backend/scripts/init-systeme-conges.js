const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function initSystemeConges() {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Initialisation du système de gestion des congés...\n');

        // Étape 1: Créer la table agent_conges
        console.log('📋 Étape 1/5: Création de la table agent_conges...');
        const createCongesTablePath = path.resolve(__dirname, '../database/create_conges_table.sql');
        const createCongesTableScript = fs.readFileSync(createCongesTablePath, 'utf8');
        await client.query(createCongesTableScript);
        console.log('✅ Table agent_conges créée avec succès\n');

        // Étape 2: Créer la table jours_feries
        console.log('📋 Étape 2/5: Création de la table jours_feries...');
        const createJoursFeriesPath = path.resolve(__dirname, '../database/create_jours_feries_table.sql');
        const createJoursFeriesScript = fs.readFileSync(createJoursFeriesPath, 'utf8');
        await client.query(createJoursFeriesScript);
        console.log('✅ Table jours_feries créée avec succès\n');

        // Étape 3: Créer la fonction calculer_jours_ouvres
        console.log('📋 Étape 3/5: Création de la fonction calculer_jours_ouvres...');
        const createFunctionPath = path.resolve(__dirname, '../database/create_function_jours_ouvres.sql');
        const createFunctionScript = fs.readFileSync(createFunctionPath, 'utf8');
        await client.query(createFunctionScript);
        console.log('✅ Fonction calculer_jours_ouvres créée avec succès\n');

        // Étape 4: Initialiser les jours fériés
        console.log('📋 Étape 4/5: Initialisation des jours fériés de Côte d\'Ivoire...');
        const initJoursFeriesPath = path.resolve(__dirname, '../database/init_jours_feries_ci.sql');
        const initJoursFeriesScript = fs.readFileSync(initJoursFeriesPath, 'utf8');
        await client.query(initJoursFeriesScript);
        console.log('✅ Jours fériés initialisés avec succès\n');

        // Étape 5: Initialiser les congés de tous les agents
        console.log('📋 Étape 5/5: Initialisation des congés de tous les agents...');
        const initCongesAgentsPath = path.resolve(__dirname, '../database/init_conges_agents.sql');
        const initCongesAgentsScript = fs.readFileSync(initCongesAgentsPath, 'utf8');
        await client.query(initCongesAgentsScript);
        
        // Afficher le résumé
        const summaryQuery = `
            SELECT
                annee,
                COUNT(id_agent) AS nombre_agents,
                SUM(jours_alloues) AS total_jours_alloues,
                SUM(jours_restants) AS total_jours_restants
            FROM agent_conges
            WHERE annee = EXTRACT(YEAR FROM CURRENT_DATE)
            GROUP BY annee;
        `;
        const summary = await client.query(summaryQuery);
        console.log('✅ Congés des agents initialisés avec succès\n');
        console.log('📊 Résumé des congés initialisés pour l\'année en cours:');
        console.table(summary.rows);

        console.log('\n✨ Initialisation du système de gestion des congés terminée avec succès!');
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation du système de gestion des congés:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

initSystemeConges();

