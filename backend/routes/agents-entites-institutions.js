const express = require('express');
const router = express.Router();
const agentsEntitesInstitutionsController = require('../controllers/AgentsEntitesInstitutionsController');

router.get('/', agentsEntitesInstitutionsController.getAll);
router.get('/:id', agentsEntitesInstitutionsController.getById);
router.post('/', agentsEntitesInstitutionsController.create);
router.put('/:id', agentsEntitesInstitutionsController.update);
router.delete('/:id', agentsEntitesInstitutionsController.delete);
router.get('/agent/:agentId', agentsEntitesInstitutionsController.getByAgent);
router.get('/entite/:entiteId', agentsEntitesInstitutionsController.getByEntite);

module.exports = router;