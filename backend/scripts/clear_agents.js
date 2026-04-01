const db = require('../config/database');

async function clearAgents() {
    console.log('🔄  Mise à jour des agents pour ajouter les catégories...');
    console.log('ℹ️  Les agents existants seront mis à jour avec id_categorie = NULL');
    console.log('ℹ️  Relancez l\'import pour remplir les catégories');

    try {
        await db.query('BEGIN');

        // Mettre id_categorie à NULL pour tous les agents
        const result = await db.query('UPDATE agents SET id_categorie = NULL');

        await db.query('COMMIT');

        console.log(`✅ ${result.rowCount} agents mis à jour avec succès`);
        console.log('ℹ️  Vous pouvez maintenant relancer l\'import');

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('❌ Erreur lors de la mise à jour:', error.message);
    } finally {
        await db.end();
    }
}

clearAgents();