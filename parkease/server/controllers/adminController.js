const User = require('../models/User');
const Area = require('../models/Area');
const Slot = require('../models/Slot');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

exports.stats = async (req, res) => {
  const [users, areas, slots, bookings, confirmed, cancelled, revenue, perArea] = await Promise.all([
    User.countDocuments({ role: 'user' }), Area.countDocuments(), Slot.countDocuments(), Booking.countDocuments(),
    Booking.countDocuments({ status: 'confirmed' }), Booking.countDocuments({ status: 'cancelled' }),
    Payment.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Booking.aggregate([
      { $match: { status: 'confirmed' } },
      { $group: { _id: '$area', count: { $sum: 1 } } },
      { $lookup: { from: 'areas', localField: '_id', foreignField: '_id', as: 'area' } },
      { $project: { count: 1, name: { $arrayElemAt: ['$area.name', 0] } } }
    ])
  ]);
  res.json({ users, areas, slots, bookings, confirmed, cancelled, revenue: revenue[0]?.total || 0, perArea });
};

exports.bookings = async (req, res) =>
  res.json(await Booking.find().select('-qrCode').populate('user', 'name email').populate('area', 'name').populate('slot', 'slotNumber').sort('-createdAt'));

exports.payments = async (req, res) =>
  res.json(await Payment.find().populate('user', 'name email').populate('booking', 'vehicleNumber').sort('-createdAt'));

exports.users = async (req, res) => res.json(await User.find().select('-password').sort('-createdAt'));

exports.deleteUser = async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ message: 'User not found' });
  if (u.role === 'admin') return res.status(400).json({ message: 'Cannot delete an admin' });
  await u.deleteOne();
  res.json({ message: 'User deleted' });
};
