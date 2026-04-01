const db = require('../config/database');

async function updateAgentsMinistere() {
    console.log('🔄 Mise à jour du ministère des agents...');
    console.log('ℹ️  Tous les agents seront associés au ministère ID = 1\n');

    try {
        await db.query('BEGIN');

        // Vérifier d'abord si le ministère ID 1 existe
        const ministereCheck = await db.query('SELECT id, nom FROM ministeres WHERE id = 1');

        if (ministereCheck.rows.length === 0) {
            console.error('❌ Le ministère avec l\'ID 1 n\'existe pas dans la base de données');
            await db.query('ROLLBACK');
            return;
        }

        console.log(`✅ Ministère trouvé: ${ministereCheck.rows[0].nom}\n`);

        // Mettre à jour tous les agents
        const result = await db.query(
            'UPDATE agents SET id_ministere = 1 WHERE id_ministere IS NULL OR id_ministere != 1 RETURNING id, matricule, nom, prenom'
        );

        await db.query('COMMIT');

        console.log(`✅ ${result.rowCount} agent(s) mis à jour avec succès\n`);

        // Afficher quelques exemples
        if (result.rows.length > 0) {
            console.log('📋 Exemples d\'agents mis à jour:');
            result.rows.slice(0, 5).forEach(agent => {
                console.log(`   - ${agent.matricule}: ${agent.nom} ${agent.prenom}`);
            });
            if (result.rows.length > 5) {
                console.log(`   ... et ${result.rows.length - 5} autres\n`);
            }
        }

        // Vérifier le total
        const totalResult = await db.query(
            'SELECT COUNT(*) as total FROM agents WHERE id_ministere = 1'
        );

        console.log(`\n📊 Total d'agents appartenant au ministère ID 1: ${totalResult.rows[0].total}`);

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('❌ Erreur lors de la mise à jour:', error.message);
    } finally {
        await db.end();
    }
}

// Test de connexion puis exécution
(async() => {
    try {
        const client = await db.connect();
        await client.query('SELECT NOW()');
        client.release();
        console.log('✅ Test de connexion PostgreSQL réussi\n');

        await updateAgentsMinistere();
    } catch (error) {
        console.error('❌ Erreur de connexion:', error);
        process.exit(1);
    }
})();
