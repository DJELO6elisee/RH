const http = require('http');

console.log('🧪 Test des sous-directions sans authentification (pour debug)...\n');

// Test direct de l'API pour voir la structure de la réponse
function testAPIResponse() {
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

        const req = http.request(options, (res) => {
            console.log(`📊 Status Code: ${res.statusCode}`);
            console.log(`📋 Content-Type: ${res.headers['content-type']}`);

            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log('\n📄 Réponse de l\'API:');
                try {
                    const result = JSON.parse(data);
                    console.log(JSON.stringify(result, null, 2));

                    if (result.success === false && result.message) {
                        console.log(`\n🔍 Analyse de l'erreur:`);
                        console.log(`   - Message: ${result.message}`);
                        console.log(`   - Type d'erreur: Authentification requise`);
                        console.log(`   - Solution: L'API fonctionne mais nécessite un token valide`);
                    }
                } catch (error) {
                    console.log('❌ Erreur de parsing JSON:', error.message);
                    console.log('📄 Données brutes:', data);
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

// Test de l'endpoint de base pour vérifier la connectivité
function testBaseEndpoint() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            console.log(`🌐 Serveur backend - Status: ${res.statusCode}`);
            resolve();
        });

        req.on('error', (error) => {
            console.error('❌ Serveur backend inaccessible:', error.message);
            resolve();
        });

        req.end();
    });
}

async function runTests() {
    try {
        console.log('🌐 1. Test de connectivité du serveur...');
        await testBaseEndpoint();

        console.log('\n📡 2. Test de l\'API sous-directions (sans auth)...');
        await testAPIResponse();

        console.log('\n💡 3. Recommandations pour résoudre le problème:');
        console.log('   a) Vérifier que l\'utilisateur frontend est bien authentifié');
        console.log('   b) Vérifier que le token est correctement passé dans les headers');
        console.log('   c) Vérifier les logs de la console du navigateur');
        console.log('   d) Vérifier que la fonction getAuthHeaders() retourne le bon token');

        console.log('\n🔧 4. Pour tester en frontend:');
        console.log('   1. Ouvrir la console du navigateur (F12)');
        console.log('   2. Naviguer vers Services → Ajouter');
        console.log('   3. Sélectionner "Service de Sous-direction"');
        console.log('   4. Vérifier les logs de la fonction loadDynamicOptions');
        console.log('   5. Vérifier les requêtes réseau dans l\'onglet Network');

    } catch (error) {
        console.error('❌ Erreur lors des tests:', error.message);
    }
}

runTests();
