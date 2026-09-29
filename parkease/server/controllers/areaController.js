const Area = require('../models/Area');
const Slot = require('../models/Slot');
const Booking = require('../models/Booking');

// GET /api/areas?q=  -> search by name / city / address
exports.list = async (req, res) => {
  const q = req.query.q ? new RegExp(req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
  const filter = q ? { $or: [{ name: q }, { city: q }, { address: q }] } : {};
  res.json(await Area.find(filter).sort('name'));
};

exports.get = async (req, res) => {
  const area = await Area.findById(req.params.id);
  if (!area) return res.status(404).json({ message: 'Area not found' });
  res.json(area);
};

exports.create = async (req, res) => res.status(201).json(await Area.create(req.body));

exports.update = async (req, res) =>
  res.json(await Area.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }));

exports.remove = async (req, res) => {
  const active = await Booking.countDocuments({ area: req.params.id, status: 'confirmed', endTime: { $gt: new Date() } });
  if (active) return res.status(400).json({ message: 'Area has upcoming confirmed bookings' });
  await Slot.deleteMany({ area: req.params.id });
  await Area.findByIdAndDelete(req.params.id);
  res.json({ message: 'Area and its slots deleted' });
};
