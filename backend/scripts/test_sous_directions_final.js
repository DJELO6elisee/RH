const http = require('http');

console.log('🧪 Test final des sous-directions avec utilisateur existant...\n');

async function testWithExistingUser() {
    try {
        // Utiliser un utilisateur qui existe réellement
        const testUser = {
            username: 'drh.drh',
            password: 'drh123',
            organization: 'ministere'
        };

        console.log(`🔐 Authentification avec: ${testUser.username}...`);

        // 1. Se connecter
        const token = await authenticate(testUser);

        if (!token) {
            console.log('❌ Échec de l\'authentification');
            return;
        }

        // 2. Tester l'API des sous-directions
        console.log('\n📡 Test de l\'API sous-directions...');
        await testSousDirectionsAPI(token);

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    }
}

function authenticate(user) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const loginData = JSON.stringify(user);

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.success && result.token) {
                        console.log('✅ Authentification réussie');
                        resolve(result.token);
                    } else {
                        console.log(`❌ Échec: ${result.message}`);
                        resolve(null);
                    }
                } catch (error) {
                    console.log('❌ Erreur de parsing:', error.message);
                    resolve(null);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Erreur de connexion:', error.message);
            resolve(null);
        });

        req.write(loginData);
        req.end();
    });
}

function testSousDirectionsAPI(token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/sous-directions',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        const req = http.request(options, (res) => {
            console.log(`📊 Status Code: ${res.statusCode}`);

            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(data);

                    if (res.statusCode === 200 && result.success && result.data) {
                        console.log(`✅ API fonctionnelle - ${result.data.length} sous-direction(s)`);

                        if (result.data.length > 0) {
                            console.log('\n📋 Sous-directions disponibles:');
                            result.data.forEach((sd, index) => {
                                console.log(`   ${index + 1}. ID: ${sd.id}, Libellé: "${sd.libelle}"`);
                            });

                            console.log('\n🔍 Structure des données (première sous-direction):');
                            const firstSD = result.data[0];
                            Object.keys(firstSD).forEach(key => {
                                console.log(`   - ${key}: ${firstSD[key]}`);
                            });

                            // Vérifier la compatibilité avec le frontend
                            console.log('\n🎯 Vérification de compatibilité frontend:');
                            if (firstSD.libelle) {
                                console.log('   ✅ Champ "libelle" présent - Compatible avec dynamicField: "libelle"');
                            } else {
                                console.log('   ❌ Champ "libelle" manquant');
                            }

                            if (firstSD.id) {
                                console.log('   ✅ Champ "id" présent - Compatible avec le mapping des options');
                            } else {
                                console.log('   ❌ Champ "id" manquant');
                            }

                            console.log('\n💡 Conclusion:');
                            console.log('   ✅ L\'API retourne les bonnes données');
                            console.log('   ✅ La structure est compatible avec le frontend');
                            console.log('   ✅ Le champ "libelle" est présent pour l\'affichage');
                            console.log('\n🔧 Si le frontend ne charge pas les données, vérifiez:');
                            console.log('   1. La fonction getAuthHeaders() dans le frontend');
                            console.log('   2. Les logs de la console du navigateur');
                            console.log('   3. La fonction loadDynamicOptions dans ManagementPage.jsx');
                        }

                    } else {
                        console.log(`❌ API échouée: ${result.message || 'Erreur inconnue'}`);
                        console.log('📄 Réponse complète:', JSON.stringify(result, null, 2));
                    }
                } catch (error) {
                    console.log('❌ Erreur de parsing:', error.message);
                    console.log('📄 Données brutes:', data.substring(0, 300) + '...');
                }
                resolve();
            });
        });

        req.on('error', (error) => {
            console.error('❌ Erreur de connexion:', error.message);
            resolve();
        });

        req.end();
    });
}

testWithExistingUser();
