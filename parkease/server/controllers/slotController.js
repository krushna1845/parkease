const Slot = require('../models/Slot');
const Booking = require('../models/Booking');
const { findConflicts } = require('../utils/availability');

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
  try { res.status(201).json(await Slot.create(req.body)); }
  catch (e) { res.status(400).json({ message: e.code === 11000 ? 'Slot number already exists in this area' : e.message }); }
};

exports.update = async (req, res) =>
  res.json(await Slot.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }));

exports.remove = async (req, res) => {
  const active = await Booking.countDocuments({ slot: req.params.id, status: 'confirmed', endTime: { $gt: new Date() } });
  if (active) return res.status(400).json({ message: 'Slot has upcoming confirmed bookings' });
  await Slot.findByIdAndDelete(req.params.id);
  res.json({ message: 'Slot deleted' });
};
