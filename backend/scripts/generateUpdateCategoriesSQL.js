/**
 * Générateur de script SQL pour mettre à jour les catégories
 * 
 * Ce script lit le CSV et génère un fichier SQL avec toutes les commandes UPDATE
 */

const fs = require('fs');
const path = require('path');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`)
};

// Mapper les catégories vers leurs IDs
const categorieMap = {
    'A': 5,
    'B': 6,
    'C': 9,
    'D': 8
};

// Parser une ligne CSV
function parseCSVLine(line) {
    const fields = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            fields.push(currentField.trim());
            currentField = '';
        } else {
            currentField += char;
        }
    }
    fields.push(currentField.trim());
    
    return fields;
}

function generateSQL() {
    const csvPath = path.join(__dirname, '..', '..', 'Liste-du-Personel-_1_.csv');
    const outputPath = path.join(__dirname, 'update_categories_from_csv.sql');
    
    log.info(`Lecture du fichier : ${csvPath}`);
    
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split('\n');
    
    let sqlContent = `-- ========================================
-- MISE À JOUR DES CATÉGORIES DEPUIS LE CSV
-- ========================================
-- 
-- Ce script a été généré automatiquement depuis Liste-du-Personel-_1_.csv
-- Date de génération : ${new Date().toISOString()}
-- 
-- Catégories :
-- A → id=5
-- B → id=6
-- C → id=9
-- D → id=8
-- ========================================

BEGIN;

-- Statistiques AVANT mise à jour
SELECT 'AVANT MISE À JOUR' as statut;
SELECT 
    COALESCE(c.libele, 'SANS CATÉGORIE') as categorie,
    COUNT(*) as nombre
FROM agents a
LEFT JOIN categories c ON a.id_categorie = c.id
GROUP BY c.libele
ORDER BY 
    CASE 
        WHEN c.libele = 'A' THEN 1
        WHEN c.libele = 'B' THEN 2
        WHEN c.libele = 'C' THEN 3
        WHEN c.libele = 'D' THEN 4
        ELSE 5
    END;

-- Mise à jour des catégories
`;

    let count = 0;
    let countA = 0, countB = 0, countC = 0, countD = 0;
    
    // Ignorer la première ligne (en-tête)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const fields = parseCSVLine(line);
        
        const matricule = fields[0];
        const categorie = fields[3];
        
        // Ignorer les lignes de sous-total et d'en-tête
        if (!matricule || matricule.includes('total') || matricule.includes('DIR / SER')) {
            continue;
        }
        
        // Ignorer les lignes sans matricule valide
        if (!/[A-Z0-9]/.test(matricule)) {
            continue;
        }
        
        // Si l'agent a une catégorie dans le CSV
        if (categorie && (categorie === 'A' || categorie === 'B' || categorie === 'C' || categorie === 'D')) {
            const categorieId = categorieMap[categorie];
            sqlContent += `UPDATE agents SET id_categorie = ${categorieId}, updated_at = CURRENT_TIMESTAMP WHERE matricule = '${matricule}'; -- Catégorie ${categorie}\n`;
            count++;
            
            if (categorie === 'A') countA++;
            else if (categorie === 'B') countB++;
            else if (categorie === 'C') countC++;
            else if (categorie === 'D') countD++;
        }
    }
    
    sqlContent += `
-- Statistiques APRÈS mise à jour
SELECT 'APRÈS MISE À JOUR' as statut;
SELECT 
    COALESCE(c.libele, 'SANS CATÉGORIE') as categorie,
    COUNT(*) as nombre
FROM agents a
LEFT JOIN categories c ON a.id_categorie = c.id
GROUP BY c.libele
ORDER BY 
    CASE 
        WHEN c.libele = 'A' THEN 1
        WHEN c.libele = 'B' THEN 2
        WHEN c.libele = 'C' THEN 3
        WHEN c.libele = 'D' THEN 4
        ELSE 5
    END;

-- Résumé
SELECT '========================================' as separation;
SELECT 'RÉSUMÉ DE LA MISE À JOUR' as titre;
SELECT '========================================' as separation;
SELECT 'Total mises à jour générées' as description, ${count} as nombre;
SELECT 'Catégorie A' as description, ${countA} as nombre;
SELECT 'Catégorie B' as description, ${countB} as nombre;
SELECT 'Catégorie C' as description, ${countC} as nombre;
SELECT 'Catégorie D' as description, ${countD} as nombre;

-- IMPORTANT : Décommentez la ligne suivante pour VALIDER les changements
-- COMMIT;

-- Ou décommentez celle-ci pour ANNULER
-- ROLLBACK;

-- Par défaut, la transaction reste ouverte pour que vous puissiez décider
`;

    fs.writeFileSync(outputPath, sqlContent, 'utf-8');
    
    log.success(`Script SQL généré : ${outputPath}`);
    log.info(`Total de commandes UPDATE générées : ${count}`);
    console.log(`  - Catégorie A : ${countA}`);
    console.log(`  - Catégorie B : ${countB}`);
    console.log(`  - Catégorie C : ${countC}`);
    console.log(`  - Catégorie D : ${countD}`);
    
    console.log('\n📝 Pour exécuter le script SQL :');
    console.log('   psql -U isegroup -d votre_base -f backend/scripts/update_categories_from_csv.sql\n');
}

try {
    generateSQL();
} catch (error) {
    log.error(`Erreur : ${error.message}`);
    process.exit(1);
}

