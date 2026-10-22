// Run once:  npm run seed   -> creates admin, demo user, 2 areas and 6 slots each
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User'), Area = require('./models/Area'), Slot = require('./models/Slot');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([User.deleteMany(), Area.deleteMany(), Slot.deleteMany()]);
  await User.create([
    { name: 'Admin', email: 'admin@parkease.com', password: await bcrypt.hash('admin123', 10), role: 'admin' },
    { name: 'Demo User', email: 'user@parkease.com', password: await bcrypt.hash('user123', 10), phone: '9999999999' }
  ]);
  // Demo parking facilities in Mumbai with documented test coordinates
  const areas = await Area.create([
    {
      name: 'Central Mall Parking',
      address: 'MG Road, Fort',
      city: 'Mumbai',
      pricePerHour: 40,
      latitude: 18.9322,
      longitude: 72.8317,
      amenities: ['cctv', 'covered', 'security_guard', 'ev_charging'],
      openingHours: '24/7'
    },
    {
      name: 'Station Road Parking',
      address: 'Near Dadar Railway Station',
      city: 'Mumbai',
      pricePerHour: 25,
      latitude: 19.0178,
      longitude: 72.8478,
      amenities: ['cctv', 'security_guard'],
      openingHours: '05:00 AM - 11:30 PM'
    }
  ]);
  for (const a of areas)
    for (let i = 1; i <= 6; i++)
      await Slot.create({ area: a._id, slotNumber: 'A' + i, type: i <= 4 ? 'car' : 'bike' });
  console.log('Seeded. Admin: admin@parkease.com / admin123 | User: user@parkease.com / user123');
  process.exit();
})();
