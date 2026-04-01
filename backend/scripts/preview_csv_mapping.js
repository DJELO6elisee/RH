/**
 * Script de prévisualisation du mapping CSV
 * Affiche comment les colonnes CSV seront mappées vers la base de données
 */

const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// Mapping complet des colonnes
const COLUMN_MAPPING = {
    'Matricule': {
        table: 'agents',
        column: 'matricule',
        type: 'string',
        required: true,
        description: 'Identifiant unique de l\'agent'
    },
    'Nom et Prénom': {
        table: 'agents',
        column: 'nom + prenom',
        type: 'string',
        required: true,
        description: 'Séparé en nom et prénom automatiquement'
    },
    'Sexe': {
        table: 'agents',
        column: 'sexe',
        type: 'char(1)',
        required: false,
        description: 'M ou F'
    },
    'Date nais.': {
        table: 'agents',
        column: 'date_de_naissance',
        type: 'date',
        required: true,
        description: 'Format M/D/YYYY converti en YYYY-MM-DD'
    },
    '1ère PS': {
        table: 'agents',
        column: 'date_embauche',
        type: 'date',
        required: false,
        description: 'Date de première prise de service'
    },
    'PS Min.': {
        table: 'agents',
        column: 'date_prise_service_au_ministere',
        type: 'date',
        required: false,
        description: 'Date de prise de service au ministère'
    },
    'PS Dir.': {
        table: 'agents',
        column: 'date_prise_service_dans_la_direction',
        type: 'date',
        required: false,
        description: 'Date de prise de service dans la direction'
    },
    'Localité': {
        table: 'localites → agents',
        column: 'id_localite',
        type: 'integer',
        required: false,
        description: 'Créé automatiquement si inexistant'
    },
    'Direction': {
        table: 'directions → agents',
        column: 'id_direction',
        type: 'integer',
        required: false,
        description: 'Créé automatiquement si inexistant'
    },
    'Service': {
        table: 'services → agents',
        column: 'id_service',
        type: 'integer',
        required: false,
        description: 'Recherché dans la base (non créé)'
    },
    'Position': {
        table: 'positions → agents',
        column: 'id_position',
        type: 'integer',
        required: false,
        description: 'Créé automatiquement si inexistant'
    },
    'Emploi': {
        table: 'emplois → agents',
        column: 'id_emploi',
        type: 'integer',
        required: false,
        description: 'Créé automatiquement si inexistant'
    },
    'Echelon': {
        table: 'echelons → agents',
        column: 'id_echelon',
        type: 'integer',
        required: false,
        description: 'Parsé et créé si inexistant'
    },
    'fonction': {
        table: 'agents + fonction_agents',
        column: 'fonction_actuelle + designation_poste',
        type: 'string',
        required: false,
        description: 'Stocké dans agents et fonction_agents'
    },
    'N° tel. bureau': {
        table: 'agents',
        column: 'telephone1',
        type: 'string',
        required: false,
        description: 'Téléphone principal'
    },
    'N° tel. domicile': {
        table: 'agents',
        column: 'telephone2',
        type: 'string',
        required: false,
        description: 'Téléphone secondaire'
    },
    'N° tel. cellulaire': {
        table: 'agents',
        column: 'telephone1 (si bureau vide)',
        type: 'string',
        required: false,
        description: 'Utilisé comme téléphone principal si bureau vide'
    },
    'Adresse mail': {
        table: 'agents',
        column: 'email',
        type: 'string',
        required: false,
        description: 'Adresse email'
    },
};

/**
 * Analyse le fichier CSV et affiche un aperçu
 */
function previewCSV(csvFilePath) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 PRÉVISUALISATION DU MAPPING CSV → BASE DE DONNÉES');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`📂 Fichier: ${csvFilePath}\n`);

    const results = [];
    let headerRow = null;

    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('headers', (headers) => {
            headerRow = headers;
        })
        .on('data', (row) => {
            results.push(row);
        })
        .on('end', () => {
            console.log('┌─────────────────────────────────────────────────────────────┐');
            console.log('│ 1. COLONNES DU FICHIER CSV                                   │');
            console.log('└─────────────────────────────────────────────────────────────┘\n');

            console.log(`Total de colonnes: ${headerRow.length}\n`);

            // Afficher toutes les colonnes
            headerRow.forEach((header, index) => {
                const mapping = COLUMN_MAPPING[header];
                if (mapping) {
                    console.log(`✅ ${index + 1}. ${header}`);
                    console.log(`   → ${mapping.table}.${mapping.column}`);
                    console.log(`   → Type: ${mapping.type} ${mapping.required ? '(REQUIS)' : '(optionnel)'}`);
                    console.log(`   → ${mapping.description}\n`);
                } else {
                    console.log(`⚠️  ${index + 1}. ${header}`);
                    console.log(`   → NON MAPPÉ (ignoré lors de l'import)\n`);
                }
            });

            console.log('\n┌─────────────────────────────────────────────────────────────┐');
            console.log('│ 2. APERÇU DES DONNÉES (3 premières lignes)                  │');
            console.log('└─────────────────────────────────────────────────────────────┘\n');

            results.slice(0, 3).forEach((row, index) => {
                console.log(`────── LIGNE ${index + 1} ──────`);
                console.log(`Matricule: ${row.Matricule || 'N/A'}`);
                console.log(`Nom et Prénom: ${row['Nom et Prénom'] || 'N/A'}`);
                console.log(`Sexe: ${row.Sexe || 'N/A'}`);
                console.log(`Date naissance: ${row['Date nais.'] || 'N/A'}`);
                console.log(`Direction: ${row['Direction'] || 'N/A'}`);
                console.log(`Service: ${row['Service'] || 'N/A'}`);
                console.log(`Fonction: ${row['fonction'] || row['Fonction'] || 'N/A'}`);
                console.log(`Email: ${row['Adresse mail'] || 'N/A'}\n`);
            });

            console.log('┌─────────────────────────────────────────────────────────────┐');
            console.log('│ 3. STATISTIQUES                                              │');
            console.log('└─────────────────────────────────────────────────────────────┘\n');

            // Compter les lignes valides
            let validLines = 0;
            let emptyLines = 0;
            let separatorLines = 0;

            results.forEach((row) => {
                if (!row.Matricule || row.Matricule.trim() === '') {
                    emptyLines++;
                } else if (row.Matricule.startsWith('DIR / SER')) {
                    separatorLines++;
                } else {
                    validLines++;
                }
            });

            console.log(`📊 Total de lignes dans le CSV: ${results.length}`);
            console.log(`✅ Lignes valides (agents à importer): ${validLines}`);
            console.log(`⏭️  Lignes vides (ignorées): ${emptyLines}`);
            console.log(`📑 Lignes de séparation (ignorées): ${separatorLines}\n`);

            // Analyse des champs remplis
            console.log('┌─────────────────────────────────────────────────────────────┐');
            console.log('│ 4. TAUX DE REMPLISSAGE DES CHAMPS                           │');
            console.log('└─────────────────────────────────────────────────────────────┘\n');

            const importantFields = [
                'Matricule',
                'Nom et Prénom',
                'Sexe',
                'Date nais.',
                'Direction',
                'Service',
                'fonction',
                'Adresse mail'
            ];

            importantFields.forEach((field) => {
                let filled = 0;
                results.forEach((row) => {
                    if (row[field] && row[field].trim() !== '') {
                        filled++;
                    }
                });

                const percentage = ((filled / results.length) * 100).toFixed(1);
                const bar = '█'.repeat(Math.floor(percentage / 5));

                console.log(`${field.padEnd(20)} ${bar} ${percentage}% (${filled}/${results.length})`);
            });

            console.log('\n┌─────────────────────────────────────────────────────────────┐');
            console.log('│ 5. RECOMMANDATIONS                                           │');
            console.log('└─────────────────────────────────────────────────────────────┘\n');

            console.log('✅ Utilisez le script avancé pour un import complet:');
            console.log('   node scripts/import_agents_advanced.js\n');

            console.log('⚠️  Avant l\'import, assurez-vous que:');
            console.log('   1. Le ministère du Tourisme existe dans la table ministeres');
            console.log('   2. Vous avez une sauvegarde de votre base de données');
            console.log('   3. Les services principaux existent déjà dans la table services\n');

            console.log('📝 Après l\'import, vérifiez:');
            console.log('   SELECT COUNT(*) FROM agents;');
            console.log('   SELECT * FROM agents LIMIT 10;\n');

            console.log('═══════════════════════════════════════════════════════════════\n');
        })
        .on('error', (error) => {
            console.error('❌ Erreur lors de la lecture du fichier CSV:', error);
        });
}

// Exécution du script
if (require.main === module) {
    const csvFilePath = process.argv[2] || path.join(__dirname, '..', '..', 'Liste-du-Personel-_1_.csv');

    if (!fs.existsSync(csvFilePath)) {
        console.error(`❌ Fichier non trouvé: ${csvFilePath}`);
        process.exit(1);
    }

    previewCSV(csvFilePath);
}

module.exports = { previewCSV };
