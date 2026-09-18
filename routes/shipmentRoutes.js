
const express = require('express');
const router = express.Router();
const {
  getShipments,
  getStats,
  getShipment,
  trackShipment,
  createShipment,
  updateShipment,
  deleteShipment,
} = require('../controllers/shipmentController');
const { protect } = require('../middleware/auth');

// ⭐ PUBLIC route — MUST be before router.use(protect)
router.get('/track/:trackingId', trackShipment);

// Everything below requires login
router.use(protect);

router.get('/', getShipments);
router.get('/stats', getStats);
router.get('/:id', getShipment);
router.post('/', createShipment);
router.put('/:id', updateShipment);
router.delete('/:id', deleteShipment);

module.exports = router;