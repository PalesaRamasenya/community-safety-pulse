const express = require('express');
const router = express.Router();
const { getAreaRiskScore, recalculateArea, getAllAreas } = require('../controllers/areasController');
const { verifyFirebaseToken, requireAdmin } = require('../middleware/auth');

router.get('/', getAllAreas);
router.get('/:id/risk-score', getAreaRiskScore);
router.post('/:id/recalculate', verifyFirebaseToken, requireAdmin, recalculateArea);

module.exports = router;
