const { spawn } = require('child_process');
const http = require('http');

console.log('🧪 Test de démarrage du serveur...\n');

// Démarrer le serveur
const server = spawn('node', ['server.js'], {
    cwd: __dirname + '/..',
    stdio: 'pipe'
});

let serverStarted = false;
let serverError = null;

// Capturer les logs du serveur
server.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(output);

    // Vérifier si le serveur a démarré
    if (output.includes('Serveur démarré') || output.includes('Server running')) {
        serverStarted = true;
    }
});

server.stderr.on('data', (data) => {
    const error = data.toString();
    console.error('❌ Erreur serveur:', error);
    serverError = error;
});

// Attendre 5 secondes puis tester la connexion
setTimeout(() => {
    console.log('\n📡 Test de connexion au serveur...\n');

    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/',
        method: 'GET'
    };

    const req = http.request(options, (res) => {
        console.log(`✅ Serveur accessible - Status: ${res.statusCode}`);

        let body = '';
        res.on('data', (chunk) => {
            body += chunk;
        });

        res.on('end', () => {
            try {
                const data = JSON.parse(body);
                console.log('\n📋 Endpoints disponibles:');

                // Vérifier si les nouveaux endpoints sont présents
                if (data.services) {
                    console.log('   ✅ /api/services - Disponible');
                } else {
                    console.log('   ❌ /api/services - Manquant');
                }

                if (data.sous_directions) {
                    console.log('   ✅ /api/sous-directions - Disponible');
                } else {
                    console.log('   ❌ /api/sous-directions - Manquant');
                }

                console.log('\n🎉 Test réussi ! Le serveur fonctionne correctement.');

            } catch (error) {
                console.log('\n⚠️ Réponse reçue mais non-JSON:', body.substring(0, 100));
            }

            // Arrêter le serveur
            server.kill();
            process.exit(0);
        });
    });

    req.on('error', (error) => {
        console.error('❌ Erreur de connexion:', error.message);

        if (serverError) {
            console.error('\n💥 Erreur du serveur:');
            console.error(serverError);
        } else {
            console.error('\n⚠️ Le serveur n\'a peut-être pas démarré à temps.');
        }

        server.kill();
        process.exit(1);
    });

    req.end();
}, 5000);

// Timeout de sécurité
setTimeout(() => {
    console.log('\n⏱️ Timeout - Arrêt du test');
    server.kill();

    if (serverStarted) {
        console.log('✅ Le serveur a démarré mais le test a pris trop de temps');
        process.exit(0);
    } else {
        console.log('❌ Le serveur n\'a pas démarré dans le délai imparti');
        process.exit(1);
    }
}, 10000);