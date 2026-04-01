#!/usr/bin/env node

/**
 * Script pour générer automatiquement les routes des tables simples
 * Ce script crée les fichiers de routes pour toutes les tables qui utilisent le SimpleController
 */

const fs = require('fs');
const path = require('path');

// Tables qui utilisent le SimpleController
const simpleTables = [
    'langues',
    'niveau_langues',
    'motif_de_departs',
    'type_de_conges',
    'autre_absences',
    'distinctions',
    'type_etablissements',
    'unite_administratives',
    'diplomes',
    'type_d_agents',
    'type_de_materiels',
    'ministeres',
    'type_de_destinations',
    'nature_d_accidents',
    'sanctions',
    'sindicats',
    'type_de_couriers',
    'nature_actes',
    'localites',
    'situation_matrimonials',
    'mode_d_entrees',
    'positions',
    'pathologies',
    'handicaps',
    'niveau_informatiques',
    'logiciels',
    'type_de_retraites',
    'enfants',
    'type_de_seminaire_de_formation',
    'type_de_documents',
    'tiers',
    'services',
    'dossiers',
    'classeurs'
];

// Template pour une route simple
const routeTemplate = (tableName) => `const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const ${tableName}Controller = new SimpleController('${tableName}');

// Routes CRUD de base
router.get('/', ${tableName}Controller.getAll.bind(${tableName}Controller));
router.get('/:id', ${tableName}Controller.getById.bind(${tableName}Controller));
router.post('/', ${tableName}Controller.create.bind(${tableName}Controller));
router.put('/:id', ${tableName}Controller.update.bind(${tableName}Controller));
router.delete('/:id', ${tableName}Controller.delete.bind(${tableName}Controller));
router.delete('/', ${tableName}Controller.deleteMultiple.bind(${tableName}Controller));

// Routes spécifiques
router.get('/search/:term', ${tableName}Controller.searchByTerm.bind(${tableName}Controller));
router.get('/select/all', ${tableName}Controller.getAllForSelect.bind(${tableName}Controller));

module.exports = router;
`;

// Fonction pour créer un fichier de route
function createRouteFile(tableName) {
    const routesDir = path.join(__dirname, '..', 'routes');
    const fileName = `${tableName}.js`;
    const filePath = path.join(routesDir, fileName);

    // Vérifier si le fichier existe déjà
    if (fs.existsSync(filePath)) {
        console.log(`⚠️  Le fichier ${fileName} existe déjà, ignoré`);
        return;
    }

    try {
        fs.writeFileSync(filePath, routeTemplate(tableName));
        console.log(`✅ Route créée: ${fileName}`);
    } catch (error) {
        console.error(`❌ Erreur lors de la création de ${fileName}:`, error.message);
    }
}

// Fonction principale
function main() {
    console.log('🚀 Génération des routes pour les tables simples...\n');

    // Créer le dossier routes s'il n'existe pas
    const routesDir = path.join(__dirname, '..', 'routes');
    if (!fs.existsSync(routesDir)) {
        fs.mkdirSync(routesDir, { recursive: true });
        console.log('📁 Dossier routes créé');
    }

    // Créer les routes pour chaque table
    simpleTables.forEach(tableName => {
        createRouteFile(tableName);
    });

    console.log('\n🎉 Génération des routes terminée !');
    console.log(`📊 ${simpleTables.length} tables traitées`);
}

// Exécuter le script
if (require.main === module) {
    main();
}

module.exports = { simpleTables, createRouteFile };