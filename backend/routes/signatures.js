const express = require('express');
const router = express.Router();
const SignaturesController = require('../controllers/SignaturesController');
const { authenticate } = require('../middleware/auth');
const { uploadSignatureFile } = require('../middleware/upload');

// Route publique pour récupérer un fichier de signature sans authentification
router.get('/public/:id', SignaturesController.downloadPublic);

router.get('/', authenticate, SignaturesController.list);
router.get('/agents', authenticate, SignaturesController.listAgents);
router.get('/my-signatures', authenticate, SignaturesController.getMySignatures);
router.post('/', authenticate, uploadSignatureFile, SignaturesController.upload);
router.put('/:id/activate', authenticate, SignaturesController.activate);
router.put('/:id/deactivate', authenticate, SignaturesController.deactivate);
router.delete('/:id', authenticate, SignaturesController.remove);

module.exports = router;
