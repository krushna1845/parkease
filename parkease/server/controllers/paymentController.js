const QRCode = require('qrcode');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const { HOLD_MINUTES } = require('../utils/availability');
const { sendMail } = require('../utils/mailer');

// POST /api/payments/:bookingId/pay
// SIMULATED gateway: a real project would verify the payment with Razorpay/Stripe here.
exports.pay = async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.bookingId, user: req.user._id }).populate('slot', 'slotNumber').populate('area', 'name');
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (booking.status !== 'pending_payment') return res.status(400).json({ message: 'Booking is not awaiting payment' });
  if (booking.createdAt < new Date(Date.now() - HOLD_MINUTES * 60 * 1000)) {
    booking.status = 'cancelled'; await booking.save();
    return res.status(400).json({ message: 'Payment window expired, please book again' });
  }

  await Payment.create({
    booking: booking._id, user: req.user._id, amount: booking.amount,
    method: req.body.method || 'upi', transactionId: 'TXN' + Date.now()
  });

  // Payment success -> confirm booking + generate QR code containing the booking details
  booking.status = 'confirmed';
  booking.qrCode = await QRCode.toDataURL(JSON.stringify({
    bookingId: booking._id, area: booking.area.name, slot: booking.slot.slotNumber,
    vehicle: booking.vehicleNumber, from: booking.startTime, to: booking.endTime
  }));
  await booking.save();

  sendMail(req.user.email, 'ParkEase: booking confirmed',
    `<h3>Booking confirmed</h3><p>${booking.area.name}, slot ${booking.slot.slotNumber}<br>
     ${booking.startTime.toLocaleString()} to ${booking.endTime.toLocaleString()}<br>Amount paid: Rs ${booking.amount}</p>
     <img src="${booking.qrCode}"/>`).catch(() => {});
  res.json(booking);
};
