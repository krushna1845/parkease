const Slot = require('../models/Slot');
const Booking = require('../models/Booking');
const { findConflicts } = require('../utils/availability');
const { emitSlotUpdate, emitAdminStatsUpdate, deriveSlotStatus } = require('../socketManager');

// GET /api/slots/area/:areaId?start=ISO&end=ISO
// Returns every slot of the area with an "available" flag for the requested time range.
exports.byArea = async (req, res) => {
  const slots = await Slot.find({ area: req.params.areaId }).sort('slotNumber').lean();
  const { start, end } = req.query;
  if (!start || !end) return res.json(slots.map((s) => ({ ...s, available: s.isActive })));

  const startDate = new Date(start), endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
    return res.status(400).json({ message: 'Invalid start or end time range' });
  }

  const busy = new Set((await findConflicts({ area: req.params.areaId }, startDate, endDate)).map((b) => b.slot.toString()));
  res.json(slots.map((s) => ({ ...s, available: s.isActive && !busy.has(s._id.toString()) })));

};

exports.create = async (req, res) => {
  try {
    const slot = await Slot.create(req.body);
    // Emit new slot as available (or out_of_service if created inactive)
    emitSlotUpdate({
      areaId: slot.area,
      slotId: slot._id,
      slotNumber: slot.slotNumber,
      type: slot.type,
      status: deriveSlotStatus({ isActive: slot.isActive, bookingStatus: null })
    });
    emitAdminStatsUpdate();
    res.status(201).json(slot);
  } catch (e) {
    res.status(400).json({ message: e.code === 11000 ? 'Slot number already exists in this area' : e.message });
  }
};

exports.update = async (req, res) => {
  const slot = await Slot.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!slot) return res.status(404).json({ message: 'Slot not found' });

  // Emit updated status — could be enable/disable toggle by admin
  // To determine correct booking status, check for active bookings
  let bookingStatus = null;
  let isCheckedIn = false;
  if (slot.isActive) {
    const activeBooking = await Booking.findOne({
      slot: slot._id,
      status: { $in: ['confirmed', 'pending_payment'] }
    }).select('status isCheckedIn').sort('-createdAt').lean();
    if (activeBooking) {
      bookingStatus = activeBooking.status;
      isCheckedIn = activeBooking.isCheckedIn || false;
    }
  }

  emitSlotUpdate({
    areaId: slot.area,
    slotId: slot._id,
    slotNumber: slot.slotNumber,
    type: slot.type,
    status: deriveSlotStatus({ isActive: slot.isActive, bookingStatus, isCheckedIn })
  });
  emitAdminStatsUpdate();

  res.json(slot);
};

exports.remove = async (req, res) => {
  const active = await Booking.countDocuments({ slot: req.params.id, status: 'confirmed', endTime: { $gt: new Date() } });
  if (active) return res.status(400).json({ message: 'Slot has upcoming confirmed bookings' });

  const slot = await Slot.findById(req.params.id).lean();
  await Slot.findByIdAndDelete(req.params.id);

  // Emit deletion — slot is no longer available
  if (slot) {
    emitSlotUpdate({
      areaId: slot.area,
      slotId: slot._id,
      slotNumber: slot.slotNumber,
      type: slot.type,
      status: 'out_of_service'
    });
    emitAdminStatsUpdate();
  }

  res.json({ message: 'Slot deleted' });
};
