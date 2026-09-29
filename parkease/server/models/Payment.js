const mongoose = require('mongoose');
module.exports = mongoose.model('Payment', new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['upi', 'card', 'netbanking'], default: 'upi' },
  transactionId: String,
  status: { type: String, enum: ['paid', 'refunded'], default: 'paid' }
}, { timestamps: true }));
