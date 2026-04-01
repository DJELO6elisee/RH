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

async function addNewRoles() {
    const client = await pool.connect();

    try {
        console.log('🔄 Ajout des nouveaux rôles...');

        // Lire le fichier SQL
        const sqlPath = path.join(__dirname, '..', 'database', 'add_roles_chef_cabinet_dg_dc.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Exécuter le script SQL
        await client.query(sqlContent);

        console.log('✅ Nouveaux rôles ajoutés avec succès !');

        // Vérifier les rôles ajoutés
        const result = await client.query(`
            SELECT id, nom, description, permissions, created_at 
            FROM roles 
            WHERE nom IN ('chef_cabinet', 'directeur_general', 'directeur_central')
            ORDER BY created_at DESC
        `);

        console.log('\n📋 Rôles créés :');
        result.rows.forEach(role => {
            console.log(`- ${role.nom} (ID: ${role.id})`);
            console.log(`  Description: ${role.description}`);
            console.log(`  Permissions: ${JSON.stringify(role.permissions)}`);
            console.log('');
        });

        // Vérifier tous les rôles disponibles
        const allRoles = await client.query('SELECT nom FROM roles ORDER BY nom');
        console.log('🎯 Tous les rôles disponibles :');
        allRoles.rows.forEach((role, index) => {
            console.log(`${index + 1}. ${role.nom}`);
        });

    } catch (error) {
        console.error('❌ Erreur lors de l\'ajout des rôles:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Exécuter le script
addNewRoles()
    .then(() => {
        console.log('\n🎉 Script terminé avec succès !');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erreur fatale:', error);
        process.exit(1);
    });