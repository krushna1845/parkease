const Area = require('../models/Area');
const Slot = require('../models/Slot');
const Booking = require('../models/Booking');
const { findConflicts } = require('../utils/availability');

function sanitizeAreaPayload(body) {
  const payload = { ...body };
  if (payload.latitude !== undefined) {
    if (payload.latitude === '' || payload.latitude === null) {
      payload.latitude = null;
    } else {
      const lat = Number(payload.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        const err = new Error('Latitude must be a valid number between -90 and 90');
        err.statusCode = 400;
        throw err;
      }
      payload.latitude = lat;
    }
  }
  if (payload.longitude !== undefined) {
    if (payload.longitude === '' || payload.longitude === null) {
      payload.longitude = null;
    } else {
      const lng = Number(payload.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        const err = new Error('Longitude must be a valid number between -180 and 180');
        err.statusCode = 400;
        throw err;
      }
      payload.longitude = lng;
    }
  }
  if (Array.isArray(payload.amenities)) {
    payload.amenities = payload.amenities.map((a) => String(a).trim().toLowerCase()).filter(Boolean);
  }
  return payload;
}

// GET /api/areas?q= -> search by name / city / address with real-time slot availability
exports.list = async (req, res) => {
  const q = req.query.q ? new RegExp(req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
  const filter = q ? { $or: [{ name: q }, { city: q }, { address: q }] } : {};
  const areas = await Area.find(filter).sort('name').lean();

  if (areas.length === 0) {
    return res.json([]);
  }

  const areaIds = areas.map((a) => a._id);
  const slots = await Slot.find({ area: { $in: areaIds } }).lean();

  // Check active booking conflicts right now
  const now = new Date();
  const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
  const conflicts = await findConflicts({ area: { $in: areaIds } }, now, nextHour);
  const busySlotIds = new Set(conflicts.map((b) => b.slot.toString()));

  // Map slots and availability by areaId
  const areaStats = {};
  for (const slot of slots) {
    const aid = slot.area.toString();
    if (!areaStats[aid]) {
      areaStats[aid] = {
        totalSlots: 0,
        availableSlots: 0,
        carSlots: 0,
        bikeSlots: 0,
        availableCarSlots: 0,
        availableBikeSlots: 0,
        vehicleTypes: new Set()
      };
    }
    const stats = areaStats[aid];
    stats.totalSlots++;
    if (slot.type) stats.vehicleTypes.add(slot.type);
    if (slot.type === 'car') stats.carSlots++;
    if (slot.type === 'bike') stats.bikeSlots++;

    const isAvailable = slot.isActive && !busySlotIds.has(slot._id.toString());
    if (isAvailable) {
      stats.availableSlots++;
      if (slot.type === 'car') stats.availableCarSlots++;
      if (slot.type === 'bike') stats.availableBikeSlots++;
    }
  }

  const enrichedAreas = areas.map((area) => {
    const stats = areaStats[area._id.toString()] || {
      totalSlots: 0,
      availableSlots: 0,
      carSlots: 0,
      bikeSlots: 0,
      availableCarSlots: 0,
      availableBikeSlots: 0,
      vehicleTypes: new Set()
    };
    return {
      ...area,
      totalSlots: stats.totalSlots,
      availableSlots: stats.availableSlots,
      carSlots: stats.carSlots,
      bikeSlots: stats.bikeSlots,
      availableCarSlots: stats.availableCarSlots,
      availableBikeSlots: stats.availableBikeSlots,
      vehicleTypes: Array.from(stats.vehicleTypes)
    };
  });

  res.json(enrichedAreas);
};

exports.get = async (req, res) => {
  const area = await Area.findById(req.params.id).lean();
  if (!area) return res.status(404).json({ message: 'Area not found' });

  const slots = await Slot.find({ area: area._id }).lean();
  const now = new Date();
  const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
  const conflicts = await findConflicts({ area: area._id }, now, nextHour);
  const busySlotIds = new Set(conflicts.map((b) => b.slot.toString()));

  let totalSlots = 0;
  let availableSlots = 0;
  const vehicleTypes = new Set();
  for (const slot of slots) {
    totalSlots++;
    if (slot.type) vehicleTypes.add(slot.type);
    if (slot.isActive && !busySlotIds.has(slot._id.toString())) {
      availableSlots++;
    }
  }

  res.json({
    ...area,
    totalSlots,
    availableSlots,
    vehicleTypes: Array.from(vehicleTypes)
  });
};

exports.create = async (req, res) => {
  try {
    const payload = sanitizeAreaPayload(req.body);
    const area = await Area.create(payload);
    res.status(201).json(area);
  } catch (err) {
    res.status(err.statusCode || 400).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const payload = sanitizeAreaPayload(req.body);
    const updated = await Area.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'Area not found' });
    res.json(updated);
  } catch (err) {
    res.status(err.statusCode || 400).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  const active = await Booking.countDocuments({ area: req.params.id, status: 'confirmed', endTime: { $gt: new Date() } });
  if (active) return res.status(400).json({ message: 'Area has upcoming confirmed bookings' });
  await Slot.deleteMany({ area: req.params.id });
  await Area.findByIdAndDelete(req.params.id);
  res.json({ message: 'Area and its slots deleted' });
};
