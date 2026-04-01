const express = require('express');
const router = express.Router();
const PDFController = require('../controllers/PDFController');
const { authenticate } = require('../middleware/auth');

// Routes pour la génération de PDFs en mémoire

// Générer un PDF à partir d'une demande
router.get('/demande/:demandeId', authenticate, PDFController.generatePDFFromDemande);

// Générer un PDF à partir d'un document existant
router.get('/document/:documentId', authenticate, PDFController.generatePDFFromDocument);

// Générer un PDF à partir de données fournies
router.post('/generate', authenticate, PDFController.generatePDFFromData);

// Récupérer les informations d'une demande pour génération PDF
router.get('/demande-info/:demandeId', authenticate, PDFController.getDemandeInfoForPDF);

module.exports = router;
