#!/usr/bin/env node

/**
 * Script de diagnostic pour vérifier l'accessibilité du serveur
 * Usage: node diagnostic-accessibilite.js
 */

const http = require('http');
const net = require('net');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

const PORT = process.env.PORT || 5000;
const HOST = 'localhost';

console.log('🔍 Diagnostic d\'accessibilité du serveur\n');
console.log(`Port configuré: ${PORT}`);
console.log(`Host testé: ${HOST}\n`);

// 1. Vérifier si le port est écouté
async function checkPortListening() {
    console.log('1️⃣  Vérification si le port est écouté...');
    
    return new Promise((resolve) => {
        const server = net.createServer();
        
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log('   ✅ Le port est déjà utilisé (serveur probablement démarré)');
                resolve(true);
            } else {
                console.log(`   ❌ Erreur: ${err.message}`);
                resolve(false);
            }
        });
        
        server.once('listening', () => {
            server.close();
            console.log('   ⚠️  Le port est libre (serveur non démarré)');
            resolve(false);
        });
        
        server.listen(PORT, HOST);
    });
}

// 2. Vérifier si on peut se connecter au serveur
async function checkServerConnection() {
    console.log('\n2️⃣  Vérification de la connexion au serveur...');
    
    return new Promise((resolve) => {
        const socket = net.createConnection(PORT, HOST, () => {
            console.log('   ✅ Connexion réussie au serveur');
            socket.end();
            resolve(true);
        });
        
        socket.on('error', (err) => {
            if (err.code === 'ECONNREFUSED') {
                console.log('   ❌ Connexion refusée (serveur non démarré ou inaccessible)');
            } else if (err.code === 'ETIMEDOUT') {
                console.log('   ❌ Timeout de connexion (firewall ou réseau)');
            } else {
                console.log(`   ❌ Erreur de connexion: ${err.message}`);
            }
            resolve(false);
        });
        
        socket.setTimeout(3000);
        socket.on('timeout', () => {
            console.log('   ❌ Timeout de connexion');
            socket.destroy();
            resolve(false);
        });
    });
}

// 3. Vérifier si le serveur répond aux requêtes HTTP
async function checkHttpResponse() {
    console.log('\n3️⃣  Vérification de la réponse HTTP...');
    
    return new Promise((resolve) => {
        const options = {
            hostname: HOST,
            port: PORT,
            path: '/health',
            method: 'GET',
            timeout: 5000
        };
        
        const req = http.request(options, (res) => {
            console.log(`   ✅ Serveur répond avec le statut: ${res.statusCode}`);
            console.log(`   📋 Headers reçus:`, res.headers);
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    console.log('   📄 Réponse JSON:', JSON.stringify(json, null, 2));
                } catch (e) {
                    console.log('   📄 Réponse:', data.substring(0, 200));
                }
                resolve(true);
            });
        });
        
        req.on('error', (err) => {
            if (err.code === 'ECONNREFUSED') {
                console.log('   ❌ Connexion refusée');
            } else if (err.code === 'ETIMEDOUT') {
                console.log('   ❌ Timeout');
            } else {
                console.log(`   ❌ Erreur: ${err.message}`);
            }
            resolve(false);
        });
        
        req.on('timeout', () => {
            console.log('   ❌ Timeout de la requête');
            req.destroy();
            resolve(false);
        });
        
        req.end();
    });
}

// 4. Vérifier les processus Node.js en cours
async function checkNodeProcesses() {
    console.log('\n4️⃣  Vérification des processus Node.js...');
    
    try {
        const { stdout } = await execPromise('ps aux | grep node | grep -v grep || echo ""');
        if (stdout.trim()) {
            console.log('   📋 Processus Node.js trouvés:');
            stdout.split('\n').forEach((line, index) => {
                if (line.trim()) {
                    console.log(`      ${index + 1}. ${line.substring(0, 100)}`);
                }
            });
        } else {
            console.log('   ⚠️  Aucun processus Node.js trouvé');
        }
    } catch (error) {
        console.log('   ⚠️  Impossible de vérifier les processus (commande non disponible sur ce système)');
    }
}

// 5. Vérifier PM2 (si disponible)
async function checkPM2() {
    console.log('\n5️⃣  Vérification de PM2...');
    
    try {
        const { stdout } = await execPromise('pm2 list 2>/dev/null || echo "PM2 non disponible"');
        if (stdout.includes('PM2 non disponible') || stdout.includes('command not found')) {
            console.log('   ℹ️  PM2 n\'est pas installé ou non disponible');
        } else {
            console.log('   📋 État PM2:');
            console.log(stdout);
        }
    } catch (error) {
        console.log('   ℹ️  PM2 n\'est pas installé ou non disponible');
    }
}

// 6. Vérifier les ports ouverts
async function checkOpenPorts() {
    console.log('\n6️⃣  Vérification des ports ouverts...');
    
    try {
        // Linux/Mac
        const { stdout } = await execPromise(`netstat -tuln 2>/dev/null | grep :${PORT} || ss -tuln 2>/dev/null | grep :${PORT} || echo ""`);
        if (stdout.trim()) {
            console.log(`   ✅ Port ${PORT} trouvé dans les ports ouverts:`);
            stdout.split('\n').forEach((line) => {
                if (line.trim()) {
                    console.log(`      ${line}`);
                }
            });
        } else {
            console.log(`   ⚠️  Port ${PORT} non trouvé dans les ports ouverts`);
            console.log('   💡 Cela peut être normal si le serveur écoute seulement sur localhost');
        }
    } catch (error) {
        console.log('   ⚠️  Impossible de vérifier les ports (commande non disponible)');
    }
}

// Fonction principale
async function runDiagnostic() {
    const portListening = await checkPortListening();
    const serverConnection = await checkServerConnection();
    const httpResponse = await checkHttpResponse();
    
    await checkNodeProcesses();
    await checkPM2();
    await checkOpenPorts();
    
    // Résumé
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ DU DIAGNOSTIC');
    console.log('='.repeat(60));
    console.log(`Port écouté: ${portListening ? '✅ Oui' : '❌ Non'}`);
    console.log(`Connexion possible: ${serverConnection ? '✅ Oui' : '❌ Non'}`);
    console.log(`Réponse HTTP: ${httpResponse ? '✅ Oui' : '❌ Non'}`);
    
    console.log('\n💡 RECOMMANDATIONS:');
    
    if (!portListening) {
        console.log('   - Le serveur ne semble pas démarré');
        console.log('   - Action: Démarrer le serveur avec "node server.js" ou "pm2 start server.js"');
    } else if (!serverConnection) {
        console.log('   - Le serveur écoute mais la connexion est refusée');
        console.log('   - Possible cause: Firewall, configuration réseau, ou serveur écoute sur localhost seulement');
        console.log('   - Action: Vérifier que le serveur écoute sur 0.0.0.0 en production');
    } else if (!httpResponse) {
        console.log('   - La connexion fonctionne mais le serveur ne répond pas aux requêtes HTTP');
        console.log('   - Possible cause: Le serveur plante après le démarrage');
        console.log('   - Action: Vérifier les logs du serveur pour les erreurs');
    } else {
        console.log('   ✅ Le serveur semble fonctionner correctement !');
        console.log('   - Si vous avez toujours des problèmes CORS, vérifiez:');
        console.log('     1. La configuration du proxy (Nginx)');
        console.log('     2. Les logs du serveur pour les requêtes OPTIONS');
        console.log('     3. La configuration CORS dans server.js');
    }
    
    console.log('\n');
}

// Exécuter le diagnostic
runDiagnostic().catch(console.error);



