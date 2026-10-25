const mongoose = require('mongoose');

const areaSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  address: { type: String, trim: true },
  city: { type: String, required: true, trim: true },
  pricePerHour: { type: Number, required: true, min: 0 },
  latitude: {
    type: Number,
    min: [-90, 'Latitude must be between -90 and 90'],
    max: [90, 'Latitude must be between -90 and 90'],
    default: null
  },
  longitude: {
    type: Number,
    min: [-180, 'Longitude must be between -180 and 180'],
    max: [180, 'Longitude must be between -180 and 180'],
    default: null
  },
  amenities: {
    type: [String],
    default: []
  },
  openingHours: {
    type: String,
    default: '24/7'
  },
  images: {
    type: [String],
    default: []
  },
  rating: {
    type: Number,
    default: 4.8
  },
  ratingCount: {
    type: Number,
    default: 1
  },
  bookedTimes: {
    type: Number,
    default: 2
  },
  operatorNotice: {
    type: String,
    default: 'You may have to leave your car key with the parking operator at site'
  }
}, { timestamps: true });

module.exports = mongoose.model('Area', areaSchema);
