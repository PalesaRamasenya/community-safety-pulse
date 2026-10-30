const express = require('express');
const router = express.Router();
const {
  createIncident,
  getIncidents,
  getIncidentById,
  updateIncidentStatus,
  deleteIncident
} = require('../controllers/incidentsController');
const { verifyFirebaseToken, requireAdmin } = require('../middleware/auth');

router.post('/', createIncident);
router.get('/', getIncidents);
router.get('/:id', getIncidentById);
router.patch('/:id/status', verifyFirebaseToken, requireAdmin, updateIncidentStatus);
router.delete('/:id', verifyFirebaseToken, requireAdmin, deleteIncident);

module.exports = router;
