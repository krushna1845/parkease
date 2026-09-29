const mongoose = require('mongoose');
module.exports = mongoose.model('Area', new mongoose.Schema({
  name: { type: String, required: true },
  address: String,
  city: { type: String, required: true },
  pricePerHour: { type: Number, required: true }
}, { timestamps: true }));
