const http = require('http');

console.log('🧪 Test de l\'API sous-directions...\n');

// Test de l'API sans authentification d'abord
const testOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/sous-directions',
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
};

console.log('📡 Test de l\'endpoint /api/sous-directions...');

const req = http.request(testOptions, (res) => {
    console.log(`📊 Status Code: ${res.statusCode}`);
    console.log(`📋 Headers:`, res.headers);

    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('\n📄 Réponse de l\'API:');
        try {
            const jsonData = JSON.parse(data);
            console.log(JSON.stringify(jsonData, null, 2));

            if (jsonData.success && jsonData.data) {
                console.log(`\n✅ API fonctionnelle - ${jsonData.data.length} sous-direction(s) retournée(s)`);
                if (jsonData.data.length > 0) {
                    console.log('\n📋 Liste des sous-directions:');
                    jsonData.data.forEach((sd, index) => {
                        console.log(`   ${index + 1}. ID: ${sd.id}, Libellé: ${sd.libelle}`);
                    });
                }
            } else {
                console.log('⚠️ Réponse API non conforme ou vide');
            }
        } catch (error) {
            console.log('❌ Erreur de parsing JSON:', error.message);
            console.log('📄 Données brutes:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Erreur de connexion à l\'API:', error.message);
    console.log('\n💡 Vérifications à faire:');
    console.log('   1. Le serveur backend est-il démarré ? (npm start dans le dossier backend)');
    console.log('   2. Le port 5000 est-il libre ?');
    console.log('   3. Y a-t-il des erreurs dans les logs du serveur ?');
});

req.end();
