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

console.log('🧪 Test complet du flux sous-directions...\n');

async function testCompleteFlow() {
    try {
        // 1. Vérifier les données en base
        console.log('📊 1. Vérification des données en base de données...');
        const dbResult = await pool.query(`
            SELECT 
                id, 
                libelle, 
                id_ministere,
                direction_id,
                is_active
            FROM sous_directions 
            WHERE is_active = true
            ORDER BY libelle ASC
        `);

        if (dbResult.rows.length > 0) {
            console.log(`✅ ${dbResult.rows.length} sous-direction(s) active(s) en base :`);
            dbResult.rows.forEach(sd => {
                console.log(`   - ID: ${sd.id}, Libellé: ${sd.libelle} (Ministère: ${sd.id_ministere}, Direction: ${sd.direction_id})`);
            });
        } else {
            console.log('⚠️ Aucune sous-direction active en base de données.');
            return;
        }

        // 2. Vérifier l'API sans authentification
        console.log('\n📡 2. Test de l\'API sans authentification...');
        await testAPI(false);

        // 3. Simuler une authentification et tester l'API
        console.log('\n🔐 3. Test de l\'API avec authentification simulée...');
        await testAPIWithAuth();

        // 4. Vérifier la structure de la réponse API
        console.log('\n🔍 4. Vérification de la structure de la réponse API...');
        await testAPIStructure();

    } catch (error) {
        console.error('❌ Erreur lors du test complet:', error.message);
    } finally {
        await pool.end();
    }
}

function testAPI(withAuth = false) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/sous-directions',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (withAuth) {
            // Simuler un token d'authentification (ceci ne fonctionnera pas réellement)
            options.headers['Authorization'] = 'Bearer fake-token-for-test';
        }

        const req = http.request(options, (res) => {
            console.log(`   Status Code: ${res.statusCode}`);

            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    if (res.statusCode === 200 && jsonData.success && jsonData.data) {
                        console.log(`   ✅ API fonctionnelle - ${jsonData.data.length} sous-direction(s) retournée(s)`);
                        if (jsonData.data.length > 0) {
                            console.log('   📋 Première sous-direction:', jsonData.data[0]);
                        }
                    } else {
                        console.log(`   ⚠️ Réponse non conforme: ${jsonData.message || 'Erreur inconnue'}`);
                    }
                } catch (error) {
                    console.log('   ❌ Erreur de parsing JSON:', error.message);
                    console.log('   📄 Données brutes:', data.substring(0, 200) + '...');
                }
                resolve();
            });
        });

        req.on('error', (error) => {
            console.error('   ❌ Erreur de connexion:', error.message);
            resolve();
        });

        req.end();
    });
}

function testAPIWithAuth() {
    return new Promise((resolve, reject) => {
        // D'abord, essayer de se connecter pour obtenir un vrai token
        const loginOptions = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const loginData = JSON.stringify({
            username: 'admin',
            password: 'admin123',
            organization: 'ministere'
        });

        const loginReq = http.request(loginOptions, (loginRes) => {
            let loginResponse = '';

            loginRes.on('data', (chunk) => {
                loginResponse += chunk;
            });

            loginRes.on('end', () => {
                try {
                    const loginJson = JSON.parse(loginResponse);
                    if (loginJson.success && loginJson.token) {
                        console.log('   ✅ Authentification réussie, token obtenu');

                        // Maintenant tester l'API avec le vrai token
                        const apiOptions = {
                            hostname: 'localhost',
                            port: 5000,
                            path: '/api/sous-directions',
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${loginJson.token}`
                            }
                        };

                        const apiReq = http.request(apiOptions, (apiRes) => {
                            let apiData = '';

                            apiRes.on('data', (chunk) => {
                                apiData += chunk;
                            });

                            apiRes.on('end', () => {
                                try {
                                    const apiJson = JSON.parse(apiData);
                                    if (apiRes.statusCode === 200 && apiJson.success && apiJson.data) {
                                        console.log(`   ✅ API avec authentification fonctionnelle - ${apiJson.data.length} sous-direction(s)`);
                                        if (apiJson.data.length > 0) {
                                            console.log('   📋 Structure des données:', Object.keys(apiJson.data[0]));
                                        }
                                    } else {
                                        console.log(`   ⚠️ API avec auth échouée: ${apiJson.message || 'Erreur inconnue'}`);
                                    }
                                } catch (error) {
                                    console.log('   ❌ Erreur de parsing API:', error.message);
                                }
                                resolve();
                            });
                        });

                        apiReq.on('error', (error) => {
                            console.error('   ❌ Erreur API avec auth:', error.message);
                            resolve();
                        });

                        apiReq.end();
                    } else {
                        console.log('   ⚠️ Échec de l\'authentification:', loginJson.message || 'Erreur inconnue');
                        resolve();
                    }
                } catch (error) {
                    console.log('   ❌ Erreur de parsing login:', error.message);
                    resolve();
                }
            });
        });

        loginReq.on('error', (error) => {
            console.error('   ❌ Erreur de connexion login:', error.message);
            resolve();
        });

        loginReq.write(loginData);
        loginReq.end();
    });
}

function testAPIStructure() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/sous-directions',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer fake-token' // Ceci échouera mais on peut voir la structure
            }
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log(`   Status Code: ${res.statusCode}`);
                console.log(`   Headers: ${JSON.stringify(res.headers, null, 2)}`);
                console.log(`   Response: ${data}`);
                resolve();
            });
        });

        req.on('error', (error) => {
            console.error('   ❌ Erreur:', error.message);
            resolve();
        });

        req.end();
    });
}

testCompleteFlow();
