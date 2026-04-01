const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ma_rh_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '12345',
    max: 20,
    idleTimeoutMillis: 300000, // 5 minutes
    connectionTimeoutMillis: 10000, // 10 secondes
    acquireTimeoutMillis: 10000, // 10 secondes
    createTimeoutMillis: 10000, // 10 secondes
    destroyTimeoutMillis: 5000, // 5 secondes
    reapIntervalMillis: 1000, // 1 seconde
    createRetryIntervalMillis: 200, // 200ms
});

// Test de connexion
pool.on('connect', () => {
    console.log('✅ Connexion à PostgreSQL établie');
});

pool.on('error', (err) => {
    console.error('❌ Erreur de connexion PostgreSQL:', err);
    // Ne pas terminer le processus, laisser le pool gérer la reconnexion
});

// Gestion des erreurs de connexion
pool.on('remove', () => {
    console.log('🔌 Connexion PostgreSQL fermée');
});

// Fonction pour tester la connexion
const testConnection = async () => {
    try {
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        console.log('✅ Test de connexion PostgreSQL réussi');
        return true;
    } catch (err) {
        console.error('❌ Test de connexion PostgreSQL échoué:', err);
        return false;
    }
};

// Tester la connexion au démarrage
testConnection();

module.exports = pool;