/**
 * Générateur de script SQL pour mettre à jour les grades
 * 
 * Ce script lit le CSV et génère un fichier SQL avec toutes les commandes UPDATE
 * pour les grades des agents
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

// Mapper les grades vers leurs IDs
// Format : Catégorie + Numéro (ex: A3, B1, C2, D1)
const gradeMap = {
    'A3': 37,
    'A4': 38,
    'A5': 39,
    'A6': 40,
    'A7': 41,
    'B1': 42,
    'B2': 43,
    'B3': 44,
    'C1': 45,
    'C2': 46,
    'D1': 47
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
    const outputPath = path.join(__dirname, 'update_grades_from_csv.sql');
    
    log.info(`Lecture du fichier : ${csvPath}`);
    
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split('\n');
    
    let sqlContent = `-- ========================================
-- MISE À JOUR DES GRADES DEPUIS LE CSV
-- ========================================
-- 
-- Ce script a été généré automatiquement depuis Liste-du-Personel-_1_.csv
-- Date de génération : ${new Date().toISOString()}
-- 
-- Grades disponibles :
-- A3 → id=37, A4 → id=38, A5 → id=39, A6 → id=40, A7 → id=41
-- B1 → id=42, B2 → id=43, B3 → id=44
-- C1 → id=45, C2 → id=46
-- D1 → id=47
-- ========================================

BEGIN;

-- Statistiques AVANT mise à jour
SELECT 'AVANT MISE À JOUR' as statut;
SELECT 
    COALESCE(g.libele, 'SANS GRADE') as grade,
    COUNT(*) as nombre
FROM agents a
LEFT JOIN grades g ON a.id_grade = g.id
GROUP BY g.libele, g.id
ORDER BY g.libele;

-- Mise à jour des grades
`;

    let count = 0;
    let gradeStats = {};
    let unknownGrades = new Set();
    
    // Ignorer la première ligne (en-tête)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const fields = parseCSVLine(line);
        
        // Colonnes : 0=Matricule, 1=Nom, 2=Sexe, 3=Catégorie, 4=Grade
        const matricule = fields[0];
        const categorie = fields[3];
        const gradeNumero = fields[4];
        
        // Ignorer les lignes de sous-total et d'en-tête
        if (!matricule || matricule.includes('total') || matricule.includes('DIR / SER')) {
            continue;
        }
        
        // Ignorer les lignes sans matricule valide
        if (!/[A-Z0-9]/.test(matricule)) {
            continue;
        }
        
        // Si l'agent a une catégorie ET un numéro de grade
        if (categorie && (categorie === 'A' || categorie === 'B' || categorie === 'C' || categorie === 'D') && gradeNumero) {
            // Construire le libellé du grade (ex: A3, B1, C2, D1)
            const gradeLibele = `${categorie}${gradeNumero}`;
            const gradeId = gradeMap[gradeLibele];
            
            if (gradeId) {
                sqlContent += `UPDATE agents SET id_grade = ${gradeId}, updated_at = CURRENT_TIMESTAMP WHERE matricule = '${matricule}'; -- Grade ${gradeLibele}\n`;
                count++;
                
                if (!gradeStats[gradeLibele]) {
                    gradeStats[gradeLibele] = 0;
                }
                gradeStats[gradeLibele]++;
            } else {
                unknownGrades.add(gradeLibele);
            }
        }
    }
    
    sqlContent += `
-- Statistiques APRÈS mise à jour
SELECT 'APRÈS MISE À JOUR' as statut;
SELECT 
    COALESCE(g.libele, 'SANS GRADE') as grade,
    COUNT(*) as nombre
FROM agents a
LEFT JOIN grades g ON a.id_grade = g.id
GROUP BY g.libele, g.id
ORDER BY g.libele;

-- Résumé
SELECT '========================================' as separation;
SELECT 'RÉSUMÉ DE LA MISE À JOUR DES GRADES' as titre;
SELECT '========================================' as separation;
SELECT 'Total mises à jour générées' as description, ${count} as nombre;
`;

    // Ajouter les statistiques par grade
    Object.keys(gradeStats).sort().forEach(grade => {
        sqlContent += `SELECT 'Grade ${grade}' as description, ${gradeStats[grade]} as nombre;\n`;
    });

    sqlContent += `
-- IMPORTANT : Décommentez la ligne suivante pour VALIDER les changements
-- COMMIT;

-- Ou décommentez celle-ci pour ANNULER
-- ROLLBACK;

-- Par défaut, la transaction reste ouverte pour que vous puissiez décider
`;

    fs.writeFileSync(outputPath, sqlContent, 'utf-8');
    
    log.success(`Script SQL généré : ${outputPath}`);
    log.info(`Total de commandes UPDATE générées : ${count}`);
    
    console.log('\n📊 Répartition par grade :');
    Object.keys(gradeStats).sort().forEach(grade => {
        console.log(`  - Grade ${grade} : ${gradeStats[grade]} agents`);
    });
    
    if (unknownGrades.size > 0) {
        log.warning(`\n⚠️  Grades non reconnus (non mis à jour) :`);
        console.log(`   ${Array.from(unknownGrades).join(', ')}`);
        console.log(`   → Ces grades ne sont pas dans la table 'grades'`);
        console.log(`   → Ajoutez-les d'abord ou ignorez-les si ce sont des données invalides`);
    }
    
    console.log('\n📝 Pour exécuter le script SQL :');
    console.log('   psql -U isegroup -d votre_base -f backend/scripts/update_grades_from_csv.sql\n');
}

try {
    generateSQL();
} catch (error) {
    log.error(`Erreur : ${error.message}`);
    process.exit(1);
}

