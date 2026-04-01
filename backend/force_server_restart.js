const pool = require('./config/database');

/**
 * Script pour forcer la libération de toutes les connexions pool
 * et redémarrer proprement le serveur
 */

(async () => {
    try {
        console.log('\n🔄 Nettoyage des connexions pool...\n');
        
        // Terminer toutes les connexions actives
        await pool.end();
        
        console.log('✅ Toutes les connexions pool ont été fermées.');
        console.log('\n⚠️  INSTRUCTIONS:');
        console.log('=====================================');
        console.log('1. Arrêtez le serveur backend (Ctrl+C dans le terminal du serveur)');
        console.log('2. Redémarrez-le avec: npm start ou node server.js');
        console.log('3. Rafraîchissez votre navigateur (Ctrl+F5)');
        console.log('=====================================\n');
        
        process.exit(0);
        
    } catch(e) {
        console.error('❌ Erreur:', e);
        process.exit(1);
    }
})();


















