const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Area = require('./models/Area');
const Slot = require('./models/Slot');
const Booking = require('./models/Booking');

const { list, get, create, update, remove } = require('./controllers/areaController');

function createMockRes() {
  const res = {
    statusCode: 200,
    data: null,
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    json: function (payload) {
      this.data = payload;
      return this;
    }
  };
  return res;
}

async function runMapDiscoveryTests() {
  console.log('================================================================');
  console.log('PARKEASE PHASE 1: INTERACTIVE MAP & DISCOVERY TEST SUITE');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/parkease');
  console.log('✓ Connected to MongoDB');

  // Test 1: Coordinate range validation - invalid latitude rejected
  console.log('\n--- Test 1: Invalid Latitude Rejection ---');
  const res1 = createMockRes();
  await create({
    body: {
      name: 'Invalid Lat Test',
      city: 'Mumbai',
      pricePerHour: 50,
      latitude: 105.5, // > 90
      longitude: 72.8
    }
  }, res1);
  if (res1.statusCode !== 400 || !res1.data.message.includes('Latitude')) {
    throw new Error(`Test 1 Failed: Expected 400 for latitude 105.5, got ${res1.statusCode}`);
  }
  console.log('✓ Test 1 Passed: Latitude 105.5 correctly rejected with 400');

  // Test 2: Coordinate range validation - invalid longitude rejected
  console.log('\n--- Test 2: Invalid Longitude Rejection ---');
  const res2 = createMockRes();
  await create({
    body: {
      name: 'Invalid Lng Test',
      city: 'Mumbai',
      pricePerHour: 50,
      latitude: 18.9,
      longitude: -195.0 // < -180
    }
  }, res2);
  if (res2.statusCode !== 400 || !res2.data.message.includes('Longitude')) {
    throw new Error(`Test 2 Failed: Expected 400 for longitude -195.0, got ${res2.statusCode}`);
  }
  console.log('✓ Test 2 Passed: Longitude -195.0 correctly rejected with 400');

  // Test 3: Valid coordinate storage, amenities, and opening hours
  console.log('\n--- Test 3: Valid Facility Creation with GPS & Amenities ---');
  const res3 = createMockRes();
  await create({
    body: {
      name: 'Marine Drive Bay Parking',
      address: 'Near Marine Drive Promenade',
      city: 'Mumbai',
      pricePerHour: 60,
      latitude: 18.9438,
      longitude: 72.8232,
      amenities: ['cctv', 'covered', 'ev_charging'],
      openingHours: '24/7'
    }
  }, res3);

  if (res3.statusCode !== 201 || !res3.data._id) {
    throw new Error(`Test 3 Failed: Expected 201 created, got ${res3.statusCode}`);
  }
  const testArea = res3.data;
  if (testArea.latitude !== 18.9438 || testArea.longitude !== 72.8232) {
    throw new Error('Test 3 Failed: Coordinates not preserved accurately');
  }
  if (!testArea.amenities.includes('ev_charging')) {
    throw new Error('Test 3 Failed: Amenities not stored');
  }
  console.log('✓ Test 3 Passed: Facility created with accurate GPS, amenities, and hours. ID:', testArea._id);

  // Create test slots for this area
  const slot1 = await Slot.create({ area: testArea._id, slotNumber: 'MD1', type: 'car', isActive: true });
  const slot2 = await Slot.create({ area: testArea._id, slotNumber: 'MD2', type: 'car', isActive: true });
  const slot3 = await Slot.create({ area: testArea._id, slotNumber: 'MD3', type: 'bike', isActive: true });

  // Test 4: Enriched discovery list with real slot counts and vehicle types
  console.log('\n--- Test 4: Discovery List Enrichment ---');
  const res4 = createMockRes();
  await list({ query: { q: 'Marine Drive' } }, res4);
  const foundList = res4.data;
  const enrichedItem = foundList.find((a) => a._id.toString() === testArea._id.toString());
  if (!enrichedItem) {
    throw new Error('Test 4 Failed: Created facility not found in discovery list query');
  }
  if (enrichedItem.totalSlots !== 3 || enrichedItem.availableSlots !== 3) {
    throw new Error(`Test 4 Failed: Expected 3 total and available slots, got ${enrichedItem.totalSlots}/${enrichedItem.availableSlots}`);
  }
  if (!enrichedItem.vehicleTypes.includes('car') || !enrichedItem.vehicleTypes.includes('bike')) {
    throw new Error('Test 4 Failed: Expected vehicle types to include car and bike');
  }
  console.log('✓ Test 4 Passed: Discovery list enriched with real totalSlots (3), availableSlots (3), and vehicleTypes');

  // Test 5: Real-time availability reduction when slot is occupied
  console.log('\n--- Test 5: Real-Time Availability Reduction on Active Booking ---');
  const user = await User.findOne();
  const now = new Date();
  const booking = await Booking.create({
    user: user._id,
    area: testArea._id,
    slot: slot1._id,
    vehicleNumber: 'MH01AB1234',
    startTime: new Date(now.getTime() - 10 * 60 * 1000), // started 10m ago
    endTime: new Date(now.getTime() + 50 * 60 * 1000),   // ends in 50m
    amount: 60,
    status: 'confirmed'
  });

  const res5 = createMockRes();
  await list({ query: { q: 'Marine Drive' } }, res5);
  const updatedItem = res5.data.find((a) => a._id.toString() === testArea._id.toString());
  if (updatedItem.availableSlots !== 2 || updatedItem.availableCarSlots !== 1) {
    throw new Error(`Test 5 Failed: Expected 2 available slots (1 car), got ${updatedItem.availableSlots} available, ${updatedItem.availableCarSlots} car`);
  }
  console.log('✓ Test 5 Passed: Active booking reduced availableSlots to 2 (1 car occupied, 1 bike & 1 car open)');

  // Test 6: Coordinate update through admin update endpoint
  console.log('\n--- Test 6: Coordinate Update via Admin ---');
  const res6 = createMockRes();
  await update({
    params: { id: testArea._id.toString() },
    body: {
      latitude: 18.9500,
      longitude: 72.8300
    }
  }, res6);
  if (res6.statusCode !== 200 || res6.data.latitude !== 18.9500) {
    throw new Error('Test 6 Failed: Coordinate update failed');
  }
  console.log('✓ Test 6 Passed: Facility coordinates updated successfully to (18.9500, 72.8300)');

  // Cleanup test artifacts
  await Booking.deleteOne({ _id: booking._id });
  await Slot.deleteMany({ area: testArea._id });
  await Area.deleteOne({ _id: testArea._id });
  console.log('\n✓ Test data cleaned up successfully');

  console.log('\n================================================================');
  console.log('ALL MAP DISCOVERY & COORDINATE TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================\n');

  process.exit(0);
}

runMapDiscoveryTests().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
