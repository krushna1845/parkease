const mongoose = require('mongoose');
const ref = (m) => ({ type: mongoose.Schema.Types.ObjectId, ref: m, required: true });
module.exports = mongoose.model('Booking', new mongoose.Schema({
  user: ref('User'),
  area: ref('Area'),
  slot: ref('Slot'),
  vehicleNumber: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending_payment', 'confirmed', 'cancelled'], default: 'pending_payment' },
  qrCode: String                                         // base64 PNG data URL, created after payment
}, { timestamps: true }));
