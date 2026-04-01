const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration de la base de données
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ma_rh_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '12345',
});

async function runScript(scriptPath) {
    try {
        console.log('🔄 Connexion à la base de données...');

        // Lire le fichier SQL
        const sqlScript = fs.readFileSync(scriptPath, 'utf8');

        // Exécuter le script
        console.log(`📄 Exécution du script: ${path.basename(scriptPath)}`);
        const result = await pool.query(sqlScript);

        console.log('✅ Script exécuté avec succès!');

        // Afficher les résultats s'il y en a
        if (result.rows && result.rows.length > 0) {
            console.log('\n📊 Résultats:');
            result.rows.forEach((row, index) => {
                console.log(`${index + 1}.`, row);
            });
        }

        // Afficher le nombre de lignes affectées
        if (result.rowCount !== undefined) {
            console.log(`\n📈 Lignes affectées: ${result.rowCount}`);
        }

    } catch (error) {
        console.error('❌ Erreur lors de l\'exécution du script:', error.message);
        console.error('Détails:', error);
    } finally {
        await pool.end();
        console.log('🔌 Connexion fermée');
    }
}

// Fonction pour lister les scripts disponibles
function listScripts() {
    const scriptsDir = path.join(__dirname);
    const scripts = fs.readdirSync(scriptsDir)
        .filter(file => file.endsWith('.sql'))
        .map(file => ({
            name: file,
            path: path.join(scriptsDir, file)
        }));

    console.log('\n📋 Scripts SQL disponibles:');
    scripts.forEach((script, index) => {
        console.log(`${index + 1}. ${script.name}`);
    });

    return scripts;
}

// Fonction principale
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('🚀 Exécuteur de scripts SQL pour DRH');
        console.log('Usage: node run_drh_script.js [script_name]');
        console.log('       node run_drh_script.js list (pour lister les scripts)');

        const scripts = listScripts();
        console.log('\n💡 Exemple: node run_drh_script.js create_drh_simple.sql');
        return;
    }

    if (args[0] === 'list') {
        listScripts();
        return;
    }

    const scriptName = args[0];
    const scriptPath = path.join(__dirname, scriptName);

    if (!fs.existsSync(scriptPath)) {
        console.error(`❌ Script non trouvé: ${scriptName}`);
        console.log('💡 Utilisez "node run_drh_script.js list" pour voir les scripts disponibles');
        return;
    }

    await runScript(scriptPath);
}

// Exécuter le script
main().catch(console.error);