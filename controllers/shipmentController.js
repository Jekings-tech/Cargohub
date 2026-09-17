const Shipment = require('../models/Shipment');
const { generateTrackingId } = require('../utils/trackingId');
const { geocode } = require('../utils/geocode');

// ============ GET ALL (with filters, sort, pagination) ============
// GET /api/shipments?search=&status=&type=&page=1&limit=10&sort=createdAt&order=desc
exports.getShipments = async (req, res) => {
  try {
    const {
      search = '',
      status = '',
      type = '',
      page = 1,
      limit = 10,
      sort = 'createdAt',
      order = 'desc',
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { trackingId: { $regex: search, $options: 'i' } },
        { 'shipper.name': { $regex: search, $options: 'i' } },
        { 'recipient.name': { $regex: search, $options: 'i' } },
        { 'shipper.email': { $regex: search, $options: 'i' } },
        { 'recipient.email': { $regex: search, $options: 'i' } },
      ];
    }
    if (status) query['shipmentInfo.status'] = status;
    if (type) query['shipmentInfo.shipmentType'] = type;

    const sortObj = { [sort]: order === 'asc' ? 1 : -1 };
    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Shipment.find(query).sort(sortObj).skip(skip).limit(Number(limit)),
      Shipment.countDocuments(query),
    ]);

    res.json({
      items,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error('getShipments error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============ STATS ============
// GET /api/shipments/stats
exports.getStats = async (req, res) => {
  try {
    const [total, inTransit, delivered, pending] = await Promise.all([
      Shipment.countDocuments(),
      Shipment.countDocuments({ 'shipmentInfo.status': 'In Transit' }),
      Shipment.countDocuments({ 'shipmentInfo.status': 'Delivered' }),
      Shipment.countDocuments({ 'shipmentInfo.status': 'Pending' }),
    ]);

    // Status distribution
    const statusAgg = await Shipment.aggregate([
      { $group: { _id: '$shipmentInfo.status', count: { $sum: 1 } } },
    ]);

    // Type distribution
    const typeAgg = await Shipment.aggregate([
      { $group: { _id: '$shipmentInfo.shipmentType', count: { $sum: 1 } } },
    ]);

    res.json({
      total,
      inTransit,
      delivered,
      pending,
      statusDistribution: statusAgg.map((s) => ({
        status: s._id,
        count: s.count,
      })),
      typeDistribution: typeAgg.map((t) => ({
        type: t._id,
        count: t.count,
      })),
    });
  } catch (err) {
    console.error('getStats error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============ GET ONE ============
// GET /api/shipments/:id
exports.getShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment)
      return res.status(404).json({ message: 'Shipment not found' });
    res.json(shipment);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ============ GET BY TRACKING ID ============
// GET /api/shipments/track/:trackingId
exports.trackShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findOne({
      trackingId: req.params.trackingId.toUpperCase(),
    });
    if (!shipment)
      return res.status(404).json({ message: 'Tracking ID not found' });
    res.json(shipment);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ============ CREATE ============
// POST /api/shipments
exports.createShipment = async (req, res) => {
  try {
    const body = req.body;

    // Auto-generate tracking ID
    let trackingId = generateTrackingId();
    // Ensure uniqueness (very unlikely to collide, but safe)
    let exists = await Shipment.findOne({ trackingId });
    while (exists) {
      trackingId = generateTrackingId();
      exists = await Shipment.findOne({ trackingId });
    }

    // Geocode all location strings
    const [
      originCoords,
      currentCoords,
      destinationCoords,
      shipperCoords,
      recipientCoords,
    ] = await Promise.all([
      geocode(body.route?.originLocation),
      geocode(body.route?.currentLocation),
      geocode(body.route?.destinationLocation),
      geocode(body.shipper?.address),
      geocode(body.recipient?.address),
    ]);

    const shipment = new Shipment({
      trackingId,
      shipmentInfo: body.shipmentInfo,
      shipper: { ...body.shipper, coords: shipperCoords },
      recipient: { ...body.recipient, coords: recipientCoords },
      route: {
        ...body.route,
        originCoords,
        currentCoords,
        destinationCoords,
      },
      package: body.package,
      payment: body.payment,
      image: body.image || { data: null, mimetype: null },
      trackingHistory: [
        {
          status: body.shipmentInfo?.status || 'Pending',
          location: body.route?.currentLocation || body.route?.originLocation,
          coords: currentCoords || originCoords,
          note: 'Shipment created',
          timestamp: new Date(),
          updatedBy: req.user._id,
        },
      ],
      createdBy: req.user._id,
    });

    await shipment.save();
    res.status(201).json(shipment);
  } catch (err) {
    console.error('createShipment error:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

// ============ UPDATE ============
// PUT /api/shipments/:id
exports.updateShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment)
      return res.status(404).json({ message: 'Shipment not found' });

    const body = req.body;

    // Re-geocode any changed locations
    const [
      originCoords,
      currentCoords,
      destinationCoords,
      shipperCoords,
      recipientCoords,
    ] = await Promise.all([
      geocode(body.route?.originLocation),
      geocode(body.route?.currentLocation),
      geocode(body.route?.destinationLocation),
      geocode(body.shipper?.address),
      geocode(body.recipient?.address),
    ]);

    // Merge
    shipment.shipmentInfo = body.shipmentInfo || shipment.shipmentInfo;
    shipment.shipper = {
      ...body.shipper,
      coords: shipperCoords || shipment.shipper.coords,
    };
    shipment.recipient = {
      ...body.recipient,
      coords: recipientCoords || shipment.recipient.coords,
    };
    shipment.route = {
      ...body.route,
      originCoords: originCoords || shipment.route.originCoords,
      currentCoords: currentCoords || shipment.route.currentCoords,
      destinationCoords: destinationCoords || shipment.route.destinationCoords,
    };
    shipment.package = body.package || shipment.package;
    shipment.payment = body.payment || shipment.payment;
    if (body.image) shipment.image = body.image;

    // Push a tracking history entry ONLY if status or location changed
    const prevStatus = shipment.trackingHistory.length
      ? shipment.trackingHistory[shipment.trackingHistory.length - 1].status
      : null;
    const newStatus = shipment.shipmentInfo.status;
    const newLocation = shipment.route.currentLocation;

    const lastEntry =
      shipment.trackingHistory[shipment.trackingHistory.length - 1];

    const statusChanged = !lastEntry || lastEntry.status !== newStatus;
    const locationChanged = !lastEntry || lastEntry.location !== newLocation;

    if (statusChanged || locationChanged) {
      shipment.trackingHistory.push({
        status: newStatus,
        location: newLocation,
        coords: shipment.route.currentCoords,
        note: body.historyNote || 'Status updated',
        timestamp: new Date(),
        updatedBy: req.user._id,
      });
    }

    await shipment.save();
    res.json(shipment);
  } catch (err) {
    console.error('updateShipment error:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

// ============ DELETE ============
// DELETE /api/shipments/:id
exports.deleteShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findByIdAndDelete(req.params.id);
    if (!shipment)
      return res.status(404).json({ message: 'Shipment not found' });
    res.json({ message: 'Shipment deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};