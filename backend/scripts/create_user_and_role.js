const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ma_rh_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '12345',
});

async function createUserAndRole() {
    try {
        console.log('🔧 Création du rôle et de l\'utilisateur DRH...\n');

        // 1. Créer le rôle DRH
        console.log('📝 Création du rôle DRH...');
        const roleResult = await pool.query(`
            INSERT INTO roles (id, nom, description, permissions, created_at, updated_at)
            VALUES (2, 'DRH', 'Directeur des Ressources Humaines', 
                   '["read", "write", "delete", "manage_agents", "manage_grades", "manage_services", "manage_fonctions", "view_reports", "manage_organization"]', 
                   NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                nom = EXCLUDED.nom,
                description = EXCLUDED.description,
                permissions = EXCLUDED.permissions,
                updated_at = NOW()
            RETURNING *
        `);
        console.log('✅ Rôle DRH créé/mis à jour:', roleResult.rows[0]);

        // 2. Créer le compte utilisateur
        console.log('\n👤 Création du compte utilisateur...');
        const userResult = await pool.query(`
            INSERT INTO utilisateurs (id, username, email, password_hash, id_role, id_agent, is_active, created_at, updated_at)
            VALUES (2, 'drh.mrh', 'drh@mrh.gov.ci', 
                   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
                   2, 1, true, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                username = EXCLUDED.username,
                email = EXCLUDED.email,
                updated_at = NOW()
            RETURNING *
        `);
        console.log('✅ Utilisateur DRH créé/mis à jour:', userResult.rows[0]);

        // 3. Vérification finale
        console.log('\n🔍 Vérification finale...');
        const finalCheck = await pool.query(`
            SELECT 
                u.id, u.username, u.email, r.nom as role, u.is_active,
                a.nom || ' ' || a.prenom as agent_nom
            FROM utilisateurs u
            LEFT JOIN roles r ON u.id_role = r.id
            LEFT JOIN agents a ON u.id_agent = a.id
            WHERE u.id = 2
        `);

        if (finalCheck.rows.length > 0) {
            console.log('✅ DRH créé avec succès!');
            console.log('📋 Informations de connexion:');
            console.log('   Nom d\'utilisateur: drh.mrh');
            console.log('   Mot de passe: password');
            console.log('   Email: drh@mrh.gov.ci');
            console.log('   Ministère: Ministère des Ressources Humaines');
            console.log('   Rôle: DRH');
            console.log('\n🎯 Prêt pour les tests!');
        } else {
            console.log('❌ Problème lors de la création');
        }

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        await pool.end();
        console.log('\n🔌 Connexion fermée');
    }
}

createUserAndRole();