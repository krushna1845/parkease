// Run once: npm run seed -> creates admin, demo user, realistic Mumbai parking facilities and slots
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Area = require('./models/Area');
const Slot = require('./models/Slot');

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/parkease');
  await Promise.all([User.deleteMany(), Area.deleteMany(), Slot.deleteMany()]);

  await User.create([
    { name: 'Admin', email: 'admin@parkease.com', password: await bcrypt.hash('admin123', 10), role: 'admin' },
    { name: 'Demo User', email: 'user@parkease.com', password: await bcrypt.hash('user123', 10), phone: '9999999999' }
  ]);

  const parkingImages = [
    'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1621929747188-0b4dc28498d2?auto=format&fit=crop&w=800&q=80'
  ];

  // Realistic parking facilities matching Mumbai & Kandivali East / West cluster
  const areas = await Area.create([
    {
      name: 'Milap Cinema Pay and Park',
      address: 'SV Road, Kandivali West, Mumbai',
      city: 'Mumbai',
      pricePerHour: 40,
      latitude: 19.2025,
      longitude: 72.8468,
      rating: 5.0,
      ratingCount: 1,
      bookedTimes: 2,
      operatorNotice: 'You may have to leave your car key with the parking operator at site',
      images: parkingImages,
      amenities: ['cctv', 'covered', 'security_guard', 'valet'],
      openingHours: '24/7'
    },
    {
      name: 'Kandivali Station West Parking',
      address: 'Near Platform 1, Station Road, Kandivali West',
      city: 'Mumbai',
      pricePerHour: 30,
      latitude: 19.2045,
      longitude: 72.8480,
      rating: 4.6,
      ratingCount: 14,
      bookedTimes: 28,
      images: [parkingImages[1], parkingImages[0]],
      amenities: ['cctv', 'security_guard'],
      openingHours: '05:00 AM - 01:00 AM'
    },
    {
      name: 'Growel\'s 101 Mall Multilevel Parking',
      address: 'Akurli Road, Kandivali East, Mumbai',
      city: 'Mumbai',
      pricePerHour: 60,
      latitude: 19.2052,
      longitude: 72.8595,
      rating: 4.9,
      ratingCount: 52,
      bookedTimes: 110,
      images: [parkingImages[2], parkingImages[1]],
      amenities: ['cctv', 'covered', 'security_guard', 'ev_charging', 'disabled_access', 'valet'],
      openingHours: '09:00 AM - 11:30 PM'
    },
    {
      name: 'Raghuleela Mega Mall Parking',
      address: 'Behind Poisar Bus Depot, Kandivali West',
      city: 'Mumbai',
      pricePerHour: 45,
      latitude: 19.2072,
      longitude: 72.8360,
      rating: 4.7,
      ratingCount: 38,
      bookedTimes: 75,
      images: parkingImages,
      amenities: ['cctv', 'covered', 'security_guard', 'ev_charging'],
      openingHours: '24/7'
    },
    {
      name: 'Thakur College & Mall Parking',
      address: 'Thakur Village, Kandivali East, Mumbai',
      city: 'Mumbai',
      pricePerHour: 35,
      latitude: 19.2105,
      longitude: 72.8690,
      rating: 4.5,
      ratingCount: 22,
      bookedTimes: 44,
      images: [parkingImages[0], parkingImages[2]],
      amenities: ['cctv', 'security_guard', 'covered'],
      openingHours: '06:00 AM - 11:00 PM'
    },
    {
      name: 'Kurar Village Pay & Park',
      address: 'Western Express Highway, Kurar Village, Malad East',
      city: 'Mumbai',
      pricePerHour: 30,
      latitude: 19.1950,
      longitude: 72.8620,
      rating: 4.4,
      ratingCount: 19,
      bookedTimes: 32,
      images: [parkingImages[1]],
      amenities: ['cctv', 'security_guard'],
      openingHours: '24/7'
    },
    {
      name: 'Central Mall Parking',
      address: 'MG Road, Fort, Mumbai',
      city: 'Mumbai',
      pricePerHour: 40,
      latitude: 18.9322,
      longitude: 72.8317,
      rating: 4.8,
      ratingCount: 65,
      bookedTimes: 140,
      images: parkingImages,
      amenities: ['cctv', 'covered', 'security_guard', 'ev_charging'],
      openingHours: '24/7'
    },
    {
      name: 'Station Road Parking',
      address: 'Near Dadar Railway Station, Dadar West',
      city: 'Mumbai',
      pricePerHour: 25,
      latitude: 19.0178,
      longitude: 72.8478,
      rating: 4.3,
      ratingCount: 40,
      bookedTimes: 95,
      images: [parkingImages[2]],
      amenities: ['cctv', 'security_guard'],
      openingHours: '05:00 AM - 11:30 PM'
    }
  ]);

  for (const a of areas) {
    for (let i = 1; i <= 8; i++) {
      await Slot.create({
        area: a._id,
        slotNumber: 'A' + i,
        type: i <= 5 ? 'car' : 'bike',
        isActive: true
      });
    }
  }

  console.log('Seeded successfully with realistic Mumbai & Kandivali parking facilities!');
  console.log('Admin: admin@parkease.com / admin123 | User: user@parkease.com / user123');
  process.exit();
})();
