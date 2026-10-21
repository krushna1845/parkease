const mongoose = require('mongoose');
const paymentSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  method: { type: String, enum: ['upi', 'card', 'netbanking', 'razorpay'], default: 'upi' },
  transactionId: String,
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,
  status: { type: String, enum: ['paid', 'refunded', 'failed'], default: 'paid' }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);


