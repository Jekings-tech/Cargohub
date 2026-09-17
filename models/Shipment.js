const mongoose = require('mongoose');

const coordsSchema = new mongoose.Schema(
  {
    lng: Number,
    lat: Number,
  },
  { _id: false }
);

const historySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    location: { type: String, default: '' },
    coords: { type: coordsSchema, default: null },
    note: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const shipmentSchema = new mongoose.Schema(
  {
    trackingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // ===== Shipment Info =====
    shipmentInfo: {
      status: {
        type: String,
        required: true,
        enum: [
          'Pending',
          'Pickup Scheduled',
          'Picked Up',
          'In Transit',
          'At Facility',
          'Customs Clearance',
          'Out for Delivery',
          'Delivered',
          'Delayed',
          'On Hold',
          'Exception',
          'Returned',
          'Cancelled',
          'Lost',
          'Damaged',
        ],
        default: 'Pending',
      },
      carrier: { type: String, required: true },
      shipmentType: {
        type: String,
        required: true,
        enum: [
          'Road Freight',
          'Air Freight',
          'Ocean Freight',
          'Rail Freight',
          'Express Delivery',
        ],
      },
      estimatedDelivery: { type: Date, required: true },
      comments: { type: String, default: '' },
    },

    // ===== Shipper =====
    shipper: {
      name: { type: String, required: true },
      address: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      coords: { type: coordsSchema, default: null },
    },

    // ===== Recipient =====
    recipient: {
      name: { type: String, required: true },
      address: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      coords: { type: coordsSchema, default: null },
    },

    // ===== Route =====
    route: {
      originLocation: { type: String, required: true },
      originCoords: { type: coordsSchema, default: null },

      currentLocation: { type: String, required: true },
      currentCoords: { type: coordsSchema, default: null },

      destinationLocation: { type: String, required: true },
      destinationCoords: { type: coordsSchema, default: null },

      pickupDate: { type: Date, required: true },
      pickupTime: { type: String, required: true },
      departureDate: { type: Date, required: true },
      departureTime: { type: String, required: true },
    },

    // ===== Package =====
    package: {
      packageType: { type: String, required: true },
      pieces: { type: Number, required: true, min: 1, default: 1 },
      quantity: { type: Number, required: true, min: 1, default: 1 },
      weight: { type: Number, required: true, min: 0, default: 0 },
      dimensions: { type: String, required: true },
      description: { type: String, default: '' },
    },

    // ===== Payment =====
    payment: {
      paymentNotes: { type: String, default: '' },
      freightCost: { type: Number, required: true, min: 0, default: 0 },
      paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Partially Paid', 'Overdue'],
        default: 'Pending',
      },
    },

    // ===== Image (base64) =====
    image: {
      data: { type: String, default: null },
      mimetype: { type: String, default: null },
    },

    // ===== Tracking history (admin-driven only) =====
    trackingHistory: {
      type: [historySchema],
      default: [],
    },

    // ===== Meta =====
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Shipment', shipmentSchema);