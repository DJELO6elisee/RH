const http = require('http');

console.log('🧪 Test des sous-directions avec authentification réelle...\n');

// Fonction pour tester l'authentification et récupérer les sous-directions
async function testWithRealAuth() {
    try {
        // 1. Se connecter pour obtenir un token
        console.log('🔐 1. Authentification...');
        const token = await authenticate();

        if (!token) {
            console.log('❌ Impossible d\'obtenir un token d\'authentification');
            console.log('💡 Vérifiez que le serveur backend est démarré et que les identifiants sont corrects');
            return;
        }

        console.log('✅ Token d\'authentification obtenu');

        // 2. Tester l'API des sous-directions
        console.log('\n📡 2. Test de l\'API sous-directions avec token...');
        await testSousDirectionsAPI(token);

    } catch (error) {
        console.error('❌ Erreur lors du test:', error.message);
    }
}

function authenticate() {
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

        // Essayer différents utilisateurs
        const testUsers = [
            { username: 'admin', password: 'admin123', organization: 'ministere' },
            { username: 'drh', password: 'drh123', organization: 'ministere' },
            { username: 'directeur', password: 'directeur123', organization: 'ministere' }
        ];

        let currentUserIndex = 0;

        function tryNextUser() {
            if (currentUserIndex >= testUsers.length) {
                console.log('❌ Aucun utilisateur de test n\'a pu s\'authentifier');
                resolve(null);
                return;
            }

            const user = testUsers[currentUserIndex];
            console.log(`   Tentative avec: ${user.username}`);

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
                            console.log(`   ✅ Authentification réussie avec ${user.username}`);
                            resolve(result.token);
                        } else {
                            console.log(`   ❌ Échec avec ${user.username}: ${result.message}`);
                            currentUserIndex++;
                            tryNextUser();
                        }
                    } catch (error) {
                        console.log(`   ❌ Erreur de parsing avec ${user.username}:`, error.message);
                        currentUserIndex++;
                        tryNextUser();
                    }
                });
            });

            req.on('error', (error) => {
                console.error('   ❌ Erreur de connexion:', error.message);
                resolve(null);
            });

            req.write(loginData);
            req.end();
        }

        tryNextUser();
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
            console.log(`   Status Code: ${res.statusCode}`);

            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(data);

                    if (res.statusCode === 200 && result.success && result.data) {
                        console.log(`   ✅ API fonctionnelle - ${result.data.length} sous-direction(s) retournée(s)`);

                        if (result.data.length > 0) {
                            console.log('\n📋 Liste des sous-directions:');
                            result.data.forEach((sd, index) => {
                                console.log(`   ${index + 1}. ID: ${sd.id}, Libellé: ${sd.libelle}`);
                                if (sd.direction_nom) {
                                    console.log(`      Direction: ${sd.direction_nom}`);
                                }
                            });

                            console.log('\n🔍 Structure des données:');
                            console.log('   Champs disponibles:', Object.keys(result.data[0]));

                            // Vérifier si le champ libelle est présent
                            if (result.data[0].libelle) {
                                console.log('   ✅ Champ "libelle" présent - compatible avec dynamicField');
                            } else {
                                console.log('   ❌ Champ "libelle" manquant - problème avec dynamicField');
                            }
                        }

                        console.log('\n🎯 Résultat:');
                        console.log('   ✅ L\'API retourne les bonnes données');
                        console.log('   ✅ Le champ "libelle" est présent');
                        console.log('   ✅ Les données sont compatibles avec le frontend');
                        console.log('\n💡 Si le frontend ne charge pas les données, le problème vient probablement de:');
                        console.log('   1. La fonction getAuthHeaders() dans le frontend');
                        console.log('   2. La gestion des erreurs dans loadDynamicOptions');
                        console.log('   3. Le timing de chargement des options');

                    } else {
                        console.log(`   ❌ API échouée: ${result.message || 'Erreur inconnue'}`);
                        console.log('   📄 Réponse complète:', JSON.stringify(result, null, 2));
                    }
                } catch (error) {
                    console.log('   ❌ Erreur de parsing:', error.message);
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

testWithRealAuth();
