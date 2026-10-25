const Booking = require('../models/Booking');
const Slot = require('../models/Slot');
const Area = require('../models/Area');
const Payment = require('../models/Payment');
const { findConflicts, HOLD_MINUTES } = require('../utils/availability');
const { sendMail } = require('../utils/mailer');
const { emitSlotUpdate, emitAdminStatsUpdate, deriveSlotStatus } = require('../socketManager');

// ─────────────────────────────────────────────────────────────────────────────
// Helper: emit a public slot:updated event after any booking state change.
// Only called after the DB write succeeds.  Never called speculatively.
// ─────────────────────────────────────────────────────────────────────────────
function emitBookingUpdate(slot, bookingStatus, isCheckedIn = false) {
  try {
    emitSlotUpdate({
      areaId: slot.area,
      slotId: slot._id,
      slotNumber: slot.slotNumber,
      type: slot.type,
      status: deriveSlotStatus({
        isActive: slot.isActive,
        bookingStatus,
        isCheckedIn
      })
    });
  } catch (e) {
    // Never let socket errors affect API responses
    console.error('Socket emit error (booking):', e.message);
  }
}

// POST /api/bookings  -> creates a booking in "pending_payment" state and holds the slot
exports.create = async (req, res) => {
  const { slotId, vehicleNumber, startTime, endTime } = req.body;
  if (!slotId || !vehicleNumber || !startTime || !endTime) {
    return res.status(400).json({ message: 'slotId, vehicleNumber, startTime, and endTime are required' });
  }

  const vNum = String(vehicleNumber).trim().toUpperCase();
  if (vNum.length < 2 || vNum.length > 20) {
    return res.status(400).json({ message: 'Vehicle number must be between 2 and 20 characters' });
  }

  const start = new Date(startTime), end = new Date(endTime);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ message: 'Invalid start or end date format' });
  }
  if (end <= start) {
    return res.status(400).json({ message: 'End time must be after start time' });
  }
  if (start < new Date(Date.now() - 60 * 1000)) {
    return res.status(400).json({ message: 'Start time cannot be in the past' });
  }
  const maxDuration = 7 * 24 * 3600 * 1000;
  if (end - start > maxDuration) {
    return res.status(400).json({ message: 'Booking duration cannot exceed 7 days' });
  }

  // Atomic lock on slot to prevent concurrent double-booking race condition
  const lockDuration = 4000;
  let slot = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const now = new Date();
    slot = await Slot.findOneAndUpdate(
      {
        _id: slotId,
        isActive: true,
        $or: [{ lockUntil: null }, { lockUntil: { $lte: now } }]
      },
      { lockUntil: new Date(now.getTime() + lockDuration) },
      { new: true }
    );
    if (slot) break;
    await new Promise((r) => setTimeout(r, 60));
  }

  if (!slot) {
    return res.status(409).json({ message: 'Slot is currently being reserved by another request or is inactive. Please retry.' });
  }

  try {
    const conflicts = await findConflicts({ slot: slotId }, start, end);
    if (conflicts.length > 0) {
      return res.status(409).json({ message: 'Slot already booked for this time range' });
    }

    const area = await Area.findById(slot.area);
    if (!area) {
      return res.status(404).json({ message: 'Parking area not found for this slot' });
    }

    const hours = Math.max(1, Math.ceil((end - start) / 3600000));
    const booking = await Booking.create({
      user: req.user._id,
      area: area._id,
      slot: slot._id,
      vehicleNumber: vNum,
      startTime: start,
      endTime: end,
      amount: hours * area.pricePerHour
    });

    // Emit AFTER successful DB write: slot is now held (pending_payment)
    emitBookingUpdate(slot, 'pending_payment', false);
    emitAdminStatsUpdate();

    res.status(201).json({ booking, payWithinMinutes: HOLD_MINUTES });
  } finally {
    // Always release the atomic slot lock
    await Slot.updateOne({ _id: slotId }, { lockUntil: null });
  }
};

// GET /api/bookings/my -> returns user's booking history with optional pagination
exports.mine = async (req, res) => {
  await Booking.updateMany({ status: 'confirmed', endTime: { $lte: new Date() } }, { status: 'completed' });
  const filter = { user: req.user._id };

  if (req.query.page) {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const [total, bookings] = await Promise.all([
      Booking.countDocuments(filter),
      Booking.find(filter)
        .populate('area', 'name city address pricePerHour')
        .populate('slot', 'slotNumber type')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
    ]);

    return res.json({
      bookings,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  }

  const bookings = await Booking.find(filter)
    .populate('area', 'name city address pricePerHour')
    .populate('slot', 'slotNumber type')
    .sort('-createdAt');
  res.json(bookings);
};

// GET /api/bookings/:id -> returns single booking details with receipt and payment info
exports.getOne = async (req, res) => {
  await Booking.updateMany({ status: 'confirmed', endTime: { $lte: new Date() } }, { status: 'completed' });
  const booking = await Booking.findById(req.params.id)
    .populate('user', 'name email phone')
    .populate('area', 'name city address pricePerHour')
    .populate('slot', 'slotNumber type');

  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  // Users can only view their own bookings; admins can view any
  if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: you cannot view another user\'s booking' });
  }

  const payment = await Payment.findOne({ booking: booking._id });
  res.json({ booking, payment });
};

// POST /api/bookings/verify -> validates a QR code or booking ID for parking attendants
exports.verify = async (req, res) => {
  let { bookingId, ticketCode, qrData } = req.body;

  if (qrData) {
    try {
      const parsed = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
      bookingId = parsed.bookingId || parsed._id || parsed.id || bookingId;
      ticketCode = parsed.ticketCode || ticketCode;
    } catch {
      const raw = String(qrData).trim();
      if (/^[0-9a-fA-F]{24}$/.test(raw)) {
        bookingId = raw;
      } else if (raw.length === 32) {
        ticketCode = raw;
      }
    }
  }

  if (!bookingId && !ticketCode) {
    return res.status(400).json({ valid: false, message: 'Valid booking ID, ticket code, or QR data is required' });
  }

  await Booking.updateMany({ status: 'confirmed', endTime: { $lte: new Date() } }, { status: 'completed' });

  let booking = null;
  if (ticketCode) {
    booking = await Booking.findOne({ ticketCode })
      .populate('user', 'name email phone')
      .populate('area', 'name address city')
      .populate('slot', 'slotNumber type');
  }
  if (!booking && bookingId) {
    booking = await Booking.findById(bookingId)
      .populate('user', 'name email phone')
      .populate('area', 'name address city')
      .populate('slot', 'slotNumber type');
  }

  if (!booking) return res.status(404).json({ valid: false, message: 'Booking not found' });

  const now = new Date();
  const startTime = new Date(booking.startTime);
  const endTime = new Date(booking.endTime);
  const allowableCheckInStart = new Date(startTime.getTime() - 30 * 60 * 1000); // 30 mins before

  let validityState = 'invalid';
  let message = '';
  let canCheckIn = false;

  if (booking.status === 'confirmed') {
    if (booking.isCheckedIn) {
      validityState = 'checked_in';
      message = `Vehicle currently parked (Checked in at ${booking.checkedInAt ? new Date(booking.checkedInAt).toLocaleTimeString() : 'earlier'})`;
    } else if (now < allowableCheckInStart) {
      validityState = 'upcoming';
      message = `Valid Ticket — Scheduled for ${startTime.toLocaleString()} (Check-in opens 30 min before)`;
    } else if (now <= endTime) {
      validityState = 'active_now';
      message = 'Valid Ticket — Ready for check-in';
      canCheckIn = true;
    } else {
      validityState = 'completed';
      message = 'Ticket Expired — Parking period has ended';
    }
  } else if (booking.status === 'completed') {
    validityState = 'completed';
    message = 'Ticket Expired — Completed past reservation';
  } else if (booking.status === 'cancelled') {
    validityState = 'cancelled';
    message = 'Invalid Ticket — Booking was cancelled';
  } else if (booking.status === 'pending_payment') {
    validityState = 'unpaid';
    message = 'Invalid Ticket — Booking is unpaid / pending payment';
  }

  const payment = await Payment.findOne({ booking: booking._id });

  // Optional auto check-in
  if (req.body.autoCheckIn && canCheckIn && !booking.isCheckedIn) {
    const checkedInBooking = await Booking.findOneAndUpdate(
      { _id: booking._id, isCheckedIn: false, status: 'confirmed' },
      { isCheckedIn: true, checkedInAt: now },
      { new: true }
    ).populate('user', 'name email').populate('area', 'name address city').populate('slot', 'slotNumber type isActive area');

    if (checkedInBooking) {
      // Emit check-in event after successful DB write
      const slotForEmit = await Slot.findById(checkedInBooking.slot._id).lean();
      if (slotForEmit) {
        emitBookingUpdate(slotForEmit, 'confirmed', true);
        emitAdminStatsUpdate();
      }

      return res.json({
        valid: true,
        validityState: 'checked_in',
        message: 'Check-in successful',
        booking: checkedInBooking,
        payment,
        canCheckIn: false
      });
    }
  }

  res.json({
    valid: validityState === 'active_now' || validityState === 'upcoming' || validityState === 'checked_in',
    validityState,
    message,
    canCheckIn,
    booking,
    payment
  });
};

// POST /api/bookings/:id/checkin -> check in vehicle at entrance
exports.checkIn = async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('user', 'name email')
    .populate('area', 'name')
    .populate('slot', 'slotNumber');

  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (booking.status !== 'confirmed') {
    return res.status(400).json({ message: `Cannot check in: booking is ${booking.status}` });
  }

  const now = new Date();
  const allowableStart = new Date(booking.startTime.getTime() - 30 * 60 * 1000);
  if (now < allowableStart) {
    return res.status(400).json({ message: 'Too early to check in. Check-in opens 30 minutes before reservation start time.' });
  }
  if (now > booking.endTime) {
    return res.status(400).json({ message: 'Booking time has ended. Check-in no longer permitted.' });
  }

  // Atomic check-in to prevent double check-in concurrency race
  const updated = await Booking.findOneAndUpdate(
    { _id: booking._id, isCheckedIn: false, status: 'confirmed' },
    { isCheckedIn: true, checkedInAt: now },
    { new: true }
  ).populate('user', 'name email').populate('area', 'name').populate('slot', 'slotNumber');

  if (!updated) {
    return res.status(400).json({
      message: `Ticket already used / checked in at ${booking.checkedInAt ? new Date(booking.checkedInAt).toLocaleTimeString() : 'an earlier time'}`
    });
  }

  // Emit check-in event after successful DB write
  const slotForEmit = await Slot.findById(booking.slot._id).lean();
  if (slotForEmit) {
    emitBookingUpdate(slotForEmit, 'confirmed', true);
    emitAdminStatsUpdate();
  }

  res.json({ message: 'Check-in successful', booking: updated });
};

// POST /api/bookings/:id/checkout -> check out vehicle at exit
exports.checkOut = async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  if (!booking.isCheckedIn) {
    return res.status(400).json({ message: 'Vehicle has not checked in yet' });
  }
  if (booking.checkedOutAt) {
    return res.status(400).json({ message: 'Vehicle has already checked out' });
  }

  const now = new Date();
  booking.checkedOutAt = now;
  booking.status = 'completed';
  await booking.save();

  // Emit checkout: slot is now available again
  const slotForEmit = await Slot.findById(booking.slot).lean();
  if (slotForEmit) {
    emitBookingUpdate(slotForEmit, 'completed', false);
    emitAdminStatsUpdate();
  }

  res.json({ message: 'Check-out successful', booking });
};

// PUT /api/bookings/:id/cancel -> cancels a booking
exports.cancel = async (req, res) => {
  const isUserOrAdmin = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, user: req.user._id };
  const booking = await Booking.findOne(isUserOrAdmin);

  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (booking.status === 'cancelled') return res.status(400).json({ message: 'Already cancelled' });
  if (booking.status === 'completed') return res.status(400).json({ message: 'Cannot cancel a completed booking' });
  if (booking.isCheckedIn) return res.status(400).json({ message: 'Cannot cancel: vehicle is already checked in' });
  if (booking.startTime <= new Date()) return res.status(400).json({ message: 'Cannot cancel after start time' });

  if (booking.status === 'confirmed') {
    await Payment.updateOne({ booking: booking._id }, { status: 'refunded' });
  }
  booking.status = 'cancelled';
  booking.qrCode = undefined;
  await booking.save();

  // Emit cancellation: slot is now available again
  const slotForEmit = await Slot.findById(booking.slot).lean();
  if (slotForEmit) {
    emitBookingUpdate(slotForEmit, 'cancelled', false);
    emitAdminStatsUpdate();
  }

  sendMail(req.user.email, 'ParkEase: booking cancelled', `<p>Your booking ${booking._id} was cancelled.</p>`).catch(() => {});
  res.json(booking);
};
