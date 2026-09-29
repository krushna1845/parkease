const Booking = require('../models/Booking');
const Slot = require('../models/Slot');
const Area = require('../models/Area');
const Payment = require('../models/Payment');
const { findConflicts, HOLD_MINUTES } = require('../utils/availability');
const { sendMail } = require('../utils/mailer');

// POST /api/bookings  -> creates a booking in "pending_payment" state and holds the slot
exports.create = async (req, res) => {
  const { slotId, vehicleNumber, startTime, endTime } = req.body;
  const start = new Date(startTime), end = new Date(endTime);
  if (!slotId || !vehicleNumber || isNaN(start) || isNaN(end)) return res.status(400).json({ message: 'All fields are required' });
  if (end <= start) return res.status(400).json({ message: 'End time must be after start time' });
  if (start < new Date(Date.now() - 60 * 1000)) return res.status(400).json({ message: 'Start time is in the past' });

  const slot = await Slot.findById(slotId);
  if (!slot || !slot.isActive) return res.status(400).json({ message: 'Slot not available' });

  if ((await findConflicts({ slot: slotId }, start, end)).length)
    return res.status(409).json({ message: 'Slot already booked for this time range' });

  const area = await Area.findById(slot.area);
  const hours = Math.ceil((end - start) / 3600000);
  const booking = await Booking.create({
    user: req.user._id, area: area._id, slot: slot._id,
    vehicleNumber: vehicleNumber.toUpperCase(), startTime: start, endTime: end,
    amount: hours * area.pricePerHour
  });
  res.status(201).json({ booking, payWithinMinutes: HOLD_MINUTES });
};

// GET /api/bookings/my
exports.mine = async (req, res) =>
  res.json(await Booking.find({ user: req.user._id }).populate('area', 'name city').populate('slot', 'slotNumber type').sort('-createdAt'));

// PUT /api/bookings/:id/cancel
exports.cancel = async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id });
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (booking.status === 'cancelled') return res.status(400).json({ message: 'Already cancelled' });
  if (booking.startTime <= new Date()) return res.status(400).json({ message: 'Cannot cancel after start time' });

  if (booking.status === 'confirmed') await Payment.updateOne({ booking: booking._id }, { status: 'refunded' }); // simulated refund
  booking.status = 'cancelled';
  booking.qrCode = undefined;
  await booking.save();
  sendMail(req.user.email, 'ParkEase: booking cancelled', `<p>Your booking ${booking._id} was cancelled.</p>`).catch(() => {});
  res.json(booking);
};
