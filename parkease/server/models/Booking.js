const mongoose = require('mongoose');
const ref = (m) => ({ type: mongoose.Schema.Types.ObjectId, ref: m, required: true });

const bookingSchema = new mongoose.Schema({
  user: ref('User'),
  area: ref('Area'),
  slot: ref('Slot'),
  vehicleNumber: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending_payment', 'confirmed', 'cancelled', 'completed'], default: 'pending_payment' },
  ticketCode: { type: String, unique: true, sparse: true },
  qrCode: String,                                         // base64 PNG data URL, created after payment
  isCheckedIn: { type: Boolean, default: false },
  checkedInAt: { type: Date, default: null },
  checkedOutAt: { type: Date, default: null },
  razorpayOrderId: { type: String, default: null },
  razorpayPaymentId: { type: String, default: null }
}, { timestamps: true });

bookingSchema.index({ slot: 1, startTime: 1, endTime: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);



