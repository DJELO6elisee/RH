/**
 * Script pour générer le hash bcrypt d'un mot de passe
 * Usage: node generate_password_hash.js [password]
 */

const bcrypt = require('bcrypt');

const password = process.argv[2] || 'CEI2024'; // Mot de passe par défaut


async function generateHash() {
    try {
        const saltRounds = 10;
        const hash = await bcrypt.hash(password, saltRounds);
        
        console.log('='.repeat(60));
        console.log('HASH BCRYPT GÉNÉRÉ');
        console.log('='.repeat(60));
        console.log(`Mot de passe: ${password}`);
        console.log(`Hash: ${hash}`);
        console.log('='.repeat(60));
        console.log('\nCopiez ce hash dans le script SQL:');
        console.log(`hashed_password := '${hash}';`);
        console.log('\n');
    } catch (error) {
        console.error('Erreur lors de la génération du hash:', error);
        process.exit(1);
    }
}

generateHash();

