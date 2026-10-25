const crypto = require('crypto');
const Razorpay = require('razorpay');
const QRCode = require('qrcode');
const Booking = require('../models/Booking');
const Slot = require('../models/Slot');
const Payment = require('../models/Payment');
const { HOLD_MINUTES, findConflicts } = require('../utils/availability');
const { sendMail } = require('../utils/mailer');
const { emitSlotUpdate, emitAdminStatsUpdate, deriveSlotStatus } = require('../socketManager');

// Initialize Razorpay client if credentials exist
let rzpInstance = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  rzpInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

// Generate secure random ticket code and opaque QR code
async function generateSecureTicket(bookingId) {
  const ticketCode = crypto.randomBytes(16).toString('hex');
  const qrData = JSON.stringify({
    ticketCode,
    bookingId: bookingId.toString()
  });
  const qrCode = await QRCode.toDataURL(qrData);
  return { ticketCode, qrCode };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: emit slot:updated after a payment event.
// Fetches the slot fresh from DB to get accurate isActive/type/area values.
// ─────────────────────────────────────────────────────────────────────────────
async function emitPaymentSlotUpdate(slotId, areaId, bookingStatus, isCheckedIn = false) {
  try {
    const slot = await Slot.findById(slotId).lean();
    if (!slot) return;
    emitSlotUpdate({
      areaId: areaId.toString(),
      slotId: slot._id.toString(),
      slotNumber: slot.slotNumber,
      type: slot.type,
      status: deriveSlotStatus({
        isActive: slot.isActive,
        bookingStatus,
        isCheckedIn
      })
    });
    emitAdminStatsUpdate();
  } catch (e) {
    console.error('Socket emit error (payment):', e.message);
  }
}

// 1. POST /api/payments/:bookingId/order -> Creates a Razorpay order on server
exports.createOrder = async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.bookingId, user: req.user._id })
    .populate('slot', 'slotNumber')
    .populate('area', 'name');

  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (booking.status !== 'pending_payment') {
    return res.status(400).json({ message: `Cannot create order: booking is ${booking.status}` });
  }

  // Check 10-minute hold window
  if (booking.createdAt < new Date(Date.now() - HOLD_MINUTES * 60 * 1000)) {
    await Booking.updateOne({ _id: booking._id }, { status: 'cancelled' });
    // Emit hold-expired: slot is available again
    await emitPaymentSlotUpdate(booking.slot._id, booking.area, 'cancelled', false);
    return res.status(400).json({ message: 'Payment window expired, please book again' });
  }

  // Return existing order ID if already created
  if (booking.razorpayOrderId) {
    return res.json({
      orderId: booking.razorpayOrderId,
      amount: booking.amount,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder'
    });
  }

  let orderId = '';
  if (rzpInstance) {
    const rzpOrder = await rzpInstance.orders.create({
      amount: Math.round(booking.amount * 100), // amount in paise
      currency: 'INR',
      receipt: booking._id.toString(),
      notes: { bookingId: booking._id.toString(), userEmail: req.user.email }
    });
    orderId = rzpOrder.id;
  } else {
    // Non-production test mode simulated order ID
    orderId = 'order_test_' + Date.now() + Math.random().toString(36).substring(2, 8);
  }

  booking.razorpayOrderId = orderId;
  await booking.save();

  res.json({
    orderId,
    amount: booking.amount,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder'
  });
};

// 2. POST /api/payments/:bookingId/verify -> Verifies Razorpay payment signature
exports.verifyRazorpay = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id) {
    return res.status(400).json({ message: 'razorpay_order_id and razorpay_payment_id are required' });
  }

  const booking = await Booking.findOne({
    _id: req.params.bookingId,
    user: req.user._id
  }).populate('slot', 'slotNumber').populate('area', 'name');

  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  // Verify HMAC-SHA256 signature if secret is present
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (secret) {
    if (!razorpay_signature) {
      return res.status(400).json({ message: 'Missing payment signature' });
    }
    const expectedSig = crypto.createHmac('sha256', secret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }
  }

  // Idempotency check: if payment already recorded
  const existingPayment = await Payment.findOne({ booking: booking._id });
  if (existingPayment) {
    return res.json({ message: 'Payment already processed', booking });
  }

  // Handle hold expiry edge case: check if slot was reassigned
  if (booking.status === 'cancelled' || booking.createdAt < new Date(Date.now() - HOLD_MINUTES * 60 * 1000)) {
    const conflicts = await findConflicts({ slot: booking.slot }, booking.startTime, booking.endTime);
    const otherConflicts = conflicts.filter((c) => c._id.toString() !== booking._id.toString());
    if (otherConflicts.length > 0) {
      await Payment.create({
        booking: booking._id,
        user: req.user._id,
        amount: booking.amount,
        currency: 'INR',
        method: 'razorpay',
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        transactionId: razorpay_payment_id,
        status: 'refunded'
      });
      return res.status(409).json({ message: 'Hold expired and slot was taken by another user. Payment recorded for refund.' });
    }
  }

  const { ticketCode, qrCode } = await generateSecureTicket(booking._id);
  booking.status = 'confirmed';
  booking.ticketCode = ticketCode;
  booking.qrCode = qrCode;
  booking.razorpayOrderId = razorpay_order_id;
  booking.razorpayPaymentId = razorpay_payment_id;
  await booking.save();

  await Payment.create({
    booking: booking._id,
    user: req.user._id,
    amount: booking.amount,
    currency: 'INR',
    method: 'razorpay',
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature,
    transactionId: razorpay_payment_id,
    status: 'paid'
  });

  // Emit payment-confirmed: slot is now confirmed/reserved
  await emitPaymentSlotUpdate(booking.slot._id || booking.slot, booking.area._id || booking.area, 'confirmed', false);

  sendMail(req.user.email, 'ParkEase: booking confirmed',
    `<h3>Booking confirmed</h3><p>${booking.area?.name}, slot ${booking.slot?.slotNumber}<br>
     ${booking.startTime.toLocaleString()} to ${booking.endTime.toLocaleString()}<br>Amount paid: Rs ${booking.amount}</p>
     <img src="${qrCode}"/>`).catch(() => {});

  res.json(booking);
};

// 3. POST /api/payments/webhook -> Razorpay webhook endpoint (idempotent + raw body signature)
exports.webhook = async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) return res.status(400).json({ message: 'Missing x-razorpay-signature header' });

    const expected = crypto.createHmac('sha256', webhookSecret).update(req.rawBody || '').digest('hex');
    if (signature !== expected) {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }
  }

  const event = req.body.event;
  const paymentEntity = req.body.payload?.payment?.entity;
  const orderId = paymentEntity?.order_id || req.body.payload?.order?.entity?.id;

  if (orderId && (event === 'payment.captured' || event === 'order.paid')) {
    const booking = await Booking.findOne({ razorpayOrderId: orderId }).populate('slot').populate('area');
    if (booking) {
      const existingPayment = await Payment.findOne({ booking: booking._id });
      if (existingPayment) {
        // Idempotent: already processed — no duplicate event emitted
        return res.json({ status: 'already_processed' });
      }

      // Check slot availability if hold had expired
      let canConfirm = true;
      if (booking.status === 'cancelled' || booking.createdAt < new Date(Date.now() - HOLD_MINUTES * 60 * 1000)) {
        const conflicts = await findConflicts({ slot: booking.slot?._id }, booking.startTime, booking.endTime);
        const otherConflicts = conflicts.filter((c) => c._id.toString() !== booking._id.toString());
        if (otherConflicts.length > 0) canConfirm = false;
      }

      if (canConfirm) {
        const { ticketCode, qrCode } = await generateSecureTicket(booking._id);
        booking.status = 'confirmed';
        booking.ticketCode = ticketCode;
        booking.qrCode = qrCode;
        booking.razorpayPaymentId = paymentEntity?.id || ('pay_' + Date.now());
        await booking.save();

        await Payment.create({
          booking: booking._id,
          user: booking.user,
          amount: booking.amount,
          currency: 'INR',
          method: 'razorpay',
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentEntity?.id,
          transactionId: paymentEntity?.id,
          status: 'paid'
        });

        // Emit payment-confirmed via webhook AFTER successful DB write
        await emitPaymentSlotUpdate(
          booking.slot?._id || booking.slot,
          booking.area?._id || booking.area,
          'confirmed',
          false
        );
      } else {
        await Payment.create({
          booking: booking._id,
          user: booking.user,
          amount: booking.amount,
          currency: 'INR',
          method: 'razorpay',
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentEntity?.id,
          transactionId: paymentEntity?.id,
          status: 'refunded'
        });
        // Slot remains available (no emit needed; slot was already freed when the hold expired)
      }
    }
  }

  res.json({ status: 'ok' });
};

// 4. POST /api/payments/:bookingId/pay -> Fallback simulated payment
exports.pay = async (req, res) => {
  const existingPayment = await Payment.findOne({ booking: req.params.bookingId });
  if (existingPayment) {
    return res.status(400).json({ message: 'Payment has already been processed for this booking' });
  }

  const booking = await Booking.findOneAndUpdate(
    {
      _id: req.params.bookingId,
      user: req.user._id,
      status: 'pending_payment'
    },
    { status: 'confirmed' },
    { new: false }
  ).populate('slot', 'slotNumber').populate('area', 'name');

  if (!booking) {
    const checkBooking = await Booking.findOne({ _id: req.params.bookingId, user: req.user._id });
    if (!checkBooking) return res.status(404).json({ message: 'Booking not found' });
    if (checkBooking.status === 'confirmed') return res.status(400).json({ message: 'Booking is already confirmed' });
    if (checkBooking.status === 'cancelled') return res.status(400).json({ message: 'Booking has been cancelled' });
    return res.status(400).json({ message: `Booking status is ${checkBooking.status}` });
  }

  if (booking.createdAt < new Date(Date.now() - HOLD_MINUTES * 60 * 1000)) {
    await Booking.updateOne({ _id: booking._id }, { status: 'cancelled' });
    // Emit hold-expired: slot is available again
    await emitPaymentSlotUpdate(booking.slot._id || booking.slot, booking.area?._id || booking.area, 'cancelled', false);
    return res.status(400).json({ message: 'Payment window expired, please book again' });
  }

  const method = ['upi', 'card', 'netbanking'].includes(req.body.method) ? req.body.method : 'upi';
  await Payment.create({
    booking: booking._id,
    user: req.user._id,
    amount: booking.amount,
    currency: 'INR',
    method,
    transactionId: req.body.transactionId || ('TXN' + Date.now() + Math.floor(Math.random() * 1000)),
    status: 'paid'
  });

  const { ticketCode, qrCode } = await generateSecureTicket(booking._id);
  await Booking.updateOne({ _id: booking._id }, { qrCode, ticketCode });
  booking.status = 'confirmed';
  booking.ticketCode = ticketCode;
  booking.qrCode = qrCode;

  // Emit payment-confirmed after successful DB write
  await emitPaymentSlotUpdate(booking.slot?._id || booking.slot, booking.area?._id || booking.area, 'confirmed', false);

  sendMail(req.user.email, 'ParkEase: booking confirmed',
    `<h3>Booking confirmed</h3><p>${booking.area?.name}, slot ${booking.slot?.slotNumber}<br>
     ${booking.startTime.toLocaleString()} to ${booking.endTime.toLocaleString()}<br>Amount paid: Rs ${booking.amount}</p>
     <img src="${qrCode}"/>`).catch(() => {});

  res.json(booking);
};
