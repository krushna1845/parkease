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
  const areas = await Area.create([
    { name: 'Central Mall Parking', address: 'MG Road', city: 'Mumbai', pricePerHour: 40 },
    { name: 'Station Road Parking', address: 'Near Railway Station', city: 'Mumbai', pricePerHour: 25 }
  ]);
  for (const a of areas)
    for (let i = 1; i <= 6; i++)
      await Slot.create({ area: a._id, slotNumber: 'A' + i, type: i <= 4 ? 'car' : 'bike' });
  console.log('Seeded. Admin: admin@parkease.com / admin123 | User: user@parkease.com / user123');
  process.exit();
})();
