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

router.use(protect); // all routes require auth

router.get('/', getShipments);
router.get('/stats', getStats);
router.get('/track/:trackingId', trackShipment);
router.get('/:id', getShipment);
router.post('/', createShipment);
router.put('/:id', updateShipment);
router.delete('/:id', deleteShipment);

module.exports = router;