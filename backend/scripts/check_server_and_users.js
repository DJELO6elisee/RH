const http = require('http');
const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'ma_rh_db',
    password: process.env.DB_PASSWORD || '12345',
    port: process.env.DB_PORT || 5432,
});

console.log('🔍 Vérification du serveur et des utilisateurs...\n');

async function checkServerAndUsers() {
    try {
        // 1. Vérifier si le serveur backend répond
        console.log('🌐 1. Vérification du serveur backend...');
        await checkServerStatus();

        // 2. Vérifier les utilisateurs en base
        console.log('\n👥 2. Vérification des utilisateurs en base...');
        await checkUsers();

        // 3. Vérifier les utilisateurs avec leurs rôles
        console.log('\n🎭 3. Vérification des utilisateurs et rôles...');
        await checkUsersWithRoles();

    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error.message);
    } finally {
        await pool.end();
    }
}

function checkServerStatus() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/',
            method: 'GET',
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            console.log(`   ✅ Serveur backend accessible - Status: ${res.statusCode}`);
            resolve();
        });

        req.on('error', (error) => {
            console.log(`   ❌ Serveur backend inaccessible: ${error.message}`);
            console.log('   💡 Vérifiez que le serveur est démarré avec: npm start');
            resolve();
        });

        req.on('timeout', () => {
            console.log('   ⏰ Timeout - Serveur backend non accessible');
            req.destroy();
            resolve();
        });

        req.end();
    });
}

async function checkUsers() {
    try {
        const result = await pool.query(`
            SELECT 
                username, 
                email,
                created_at
            FROM utilisateurs 
            ORDER BY username ASC
        `);

        if (result.rows.length > 0) {
            console.log(`   ✅ ${result.rows.length} utilisateur(s) trouvé(s) :`);
            result.rows.forEach(user => {
                console.log(`   - Username: ${user.username}, Email: ${user.email}`);
            });
        } else {
            console.log('   ⚠️ Aucun utilisateur trouvé en base de données');
        }
    } catch (error) {
        console.error('   ❌ Erreur lors de la récupération des utilisateurs:', error.message);
    }
}

async function checkUsersWithRoles() {
    try {
        const result = await pool.query(`
            SELECT 
                u.username,
                u.email,
                r.nom as role_nom,
                a.prenom,
                a.nom as agent_nom,
                m.nom as ministere_nom
            FROM utilisateurs u
            LEFT JOIN roles r ON u.id_role = r.id
            LEFT JOIN agents a ON u.id_agent = a.id
            LEFT JOIN ministeres m ON a.id_ministere = m.id
            ORDER BY u.username ASC
        `);

        if (result.rows.length > 0) {
            console.log(`   ✅ ${result.rows.length} utilisateur(s) avec rôles :`);
            result.rows.forEach(user => {
                const agentName = user.agent_nom ? `${user.prenom} ${user.agent_nom}` : 'Non assigné';
                const ministere = user.ministere_nom || 'Non assigné';
                console.log(`   - ${user.username} (${user.role_nom}) - Agent: ${agentName} - Ministère: ${ministere}`);
            });

            console.log('\n💡 Utilisateurs de test recommandés:');
            const testUsers = result.rows.filter(user => ['admin', 'drh', 'directeur', 'sous_directeur', 'dir_cabinet'].includes(user.username));

            if (testUsers.length > 0) {
                testUsers.forEach(user => {
                    console.log(`   - ${user.username} (${user.role_nom})`);
                });
            } else {
                console.log('   ⚠️ Aucun utilisateur de test standard trouvé');
            }
        } else {
            console.log('   ⚠️ Aucun utilisateur avec rôles trouvé');
        }
    } catch (error) {
        console.error('   ❌ Erreur lors de la récupération des utilisateurs avec rôles:', error.message);
    }
}

checkServerAndUsers();
