const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { io: ioClient } = require('socket.io-client');
require('dotenv').config();

const socketManager = require('./socketManager');
const User = require('./models/User');
const Area = require('./models/Area');
const Slot = require('./models/Slot');
const Booking = require('./models/Booking');
const Payment = require('./models/Payment');

const { create, cancel, checkIn, checkOut } = require('./controllers/bookingController');
const { pay, webhook } = require('./controllers/paymentController');
const { update: updateSlot } = require('./controllers/slotController');

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

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runSocketRealtimeTests() {
  console.log('================================================================');
  console.log('PARKEASE PHASE 2: REAL-TIME SOCKET.IO AVAILABILITY TEST SUITE');
  console.log('================================================================\n');

  // 1. Connect MongoDB
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/parkease');
  console.log('✓ Connected to MongoDB');

  // 2. Start HTTP server on test port and initialize Socket.IO
  const testPort = 5055;
  const httpServer = http.createServer();
  const ioServer = socketManager.init(httpServer);

  await new Promise((resolve) => httpServer.listen(testPort, resolve));
  console.log(`✓ Test HTTP + Socket.IO server running on port ${testPort}`);

  // Fetch or setup seed users
  const adminUser = await User.findOne({ email: 'admin@parkease.com' });
  let normalUser = await User.findOne({ email: 'user@parkease.com' });
  if (!adminUser || !normalUser) {
    throw new Error('Seed accounts missing. Run npm run seed.');
  }

  const adminToken = jwt.sign({ id: adminUser._id, role: adminUser.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const userToken = jwt.sign({ id: normalUser._id, role: normalUser.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // Get or create test areas and slots
  const testAreaA = await Area.findOne();
  if (!testAreaA) throw new Error('No parking areas found in DB');

  let testAreaB = await Area.findOne({ _id: { $ne: testAreaA._id } });
  if (!testAreaB) {
    testAreaB = await Area.create({
      name: 'Test Area Bravo',
      city: 'Mumbai',
      address: 'Marine Drive 42',
      pricePerHour: 40,
      totalSlots: 5,
      coordinates: { latitude: 18.93, longitude: 72.82 }
    });
  }

  const testSlot = await Slot.findOne({ area: testAreaA._id, isActive: true });
  if (!testSlot) throw new Error('No active slot found in testAreaA');

  // Clean existing test bookings on testSlot
  await Booking.deleteMany({ slot: testSlot._id });

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
    passedTests++;
    console.log(`✓ Test ${totalTests} Passed: ${message}`);
  }

  // Connect Client 1 (joined to Area A)
  const client1 = ioClient(`http://localhost:${testPort}`, {
    transports: ['websocket'],
    forceNew: true
  });

  // Connect Client 2 (joined to Area B)
  const client2 = ioClient(`http://localhost:${testPort}`, {
    transports: ['websocket'],
    forceNew: true
  });

  await new Promise((resolve) => {
    let connectedCount = 0;
    const check = () => {
      connectedCount++;
      if (connectedCount === 2) resolve();
    };
    client1.on('connect', check);
    client2.on('connect', check);
  });
  console.log('✓ Both Socket.IO test clients connected');

  // Track received events
  const client1Events = [];
  const client2Events = [];
  client1.on('slot:updated', (evt) => client1Events.push(evt));
  client2.on('slot:updated', (evt) => client2Events.push(evt));

  // Subscribe client 1 to Area A, client 2 to Area B
  client1.emit('subscribe:area', { areaId: testAreaA._id.toString() });
  client2.emit('subscribe:area', { areaId: testAreaB._id.toString() });
  await wait(150);

  // -------------------------------------------------------------
  // Test 1: Room isolation - update to Area A not received by Area B
  // -------------------------------------------------------------
  socketManager.emitSlotUpdate({
    areaId: testAreaA._id,
    slotId: testSlot._id,
    slotNumber: testSlot.slotNumber,
    type: testSlot.type,
    status: 'available'
  });
  await wait(150);

  assert(
    client1Events.length === 1 && client2Events.length === 0,
    'Room isolation verified: Area A event delivered only to Area A subscriber'
  );

  // -------------------------------------------------------------
  // Test 2: Payload schema and privacy (no user PII, correct timestamp)
  // -------------------------------------------------------------
  const event1 = client1Events[0];
  assert(
    event1.areaId === testAreaA._id.toString() &&
    event1.slotId === testSlot._id.toString() &&
    event1.slotNumber === testSlot.slotNumber &&
    event1.type === testSlot.type &&
    event1.status === 'available' &&
    typeof event1.serverTs === 'string' &&
    event1.userId === undefined &&
    event1.email === undefined &&
    event1.token === undefined,
    'Public event payload matches exact schema and contains zero user PII'
  );

  // -------------------------------------------------------------
  // Test 3: Successful booking creation triggers 'pending_payment' event
  // -------------------------------------------------------------
  client1Events.length = 0;
  const start = new Date(Date.now() + 5_000);
  const end = new Date(Date.now() + 3600_000);

  const reqBooking = {
    user: normalUser,
    body: {
      areaId: testAreaA._id.toString(),
      slotId: testSlot._id.toString(),
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      vehicleNumber: 'MH01AB1234'
    }
  };
  const resBooking = createMockRes();
  await create(reqBooking, resBooking);

  await wait(150);
  assert(
    resBooking.statusCode === 201 &&
    client1Events.length === 1 &&
    client1Events[0].status === 'pending_payment' &&
    client1Events[0].slotId === testSlot._id.toString(),
    'Booking creation emits slot:updated with status "pending_payment"'
  );
  const createdBooking = resBooking.data.booking;

  // -------------------------------------------------------------
  // Test 4: Conflicting booking rejected with 409 and emits NO false event
  // -------------------------------------------------------------
  client1Events.length = 0;
  const resConflict = createMockRes();
  await create(reqBooking, resConflict);

  await wait(150);
  assert(
    resConflict.statusCode === 409 && client1Events.length === 0,
    'Conflicting booking rejected (409 Conflict) and produced 0 false availability events'
  );

  // -------------------------------------------------------------
  // Test 5: Payment confirmation emits 'confirmed' event
  // -------------------------------------------------------------
  client1Events.length = 0;
  const resPay = createMockRes();
  await pay({
    user: normalUser,
    params: { bookingId: createdBooking._id.toString() },
    body: { method: 'simulated' }
  }, resPay);

  await wait(150);
  assert(
    resPay.statusCode === 200 &&
    client1Events.length === 1 &&
    client1Events[0].status === 'confirmed',
    'Payment confirmation emits slot:updated with status "confirmed"'
  );

  // -------------------------------------------------------------
  // Test 6: Check-in emits 'occupied' event
  // -------------------------------------------------------------
  client1Events.length = 0;
  const resCheckIn = createMockRes();
  await checkIn({
    user: adminUser,
    params: { id: createdBooking._id.toString() }
  }, resCheckIn);

  await wait(150);
  assert(
    resCheckIn.statusCode === 200 &&
    client1Events.length === 1 &&
    client1Events[0].status === 'occupied',
    'Check-in emits slot:updated with status "occupied"'
  );

  // -------------------------------------------------------------
  // Test 7: Check-out emits 'available' event
  // -------------------------------------------------------------
  client1Events.length = 0;
  const resCheckOut = createMockRes();
  await checkOut({
    user: adminUser,
    params: { id: createdBooking._id.toString() }
  }, resCheckOut);

  await wait(150);
  assert(
    resCheckOut.statusCode === 200 &&
    client1Events.length === 1 &&
    client1Events[0].status === 'available',
    'Check-out marks session complete and emits slot:updated with status "available"'
  );

  // -------------------------------------------------------------
  // Test 8: Booking cancellation emits 'available' event
  // -------------------------------------------------------------
  // Create another booking to cancel
  const start2 = new Date(Date.now() + 10_000_000);
  const end2 = new Date(Date.now() + 14_000_000);
  const resBooking2 = createMockRes();
  await create({
    user: normalUser,
    body: {
      areaId: testAreaA._id.toString(),
      slotId: testSlot._id.toString(),
      startTime: start2.toISOString(),
      endTime: end2.toISOString(),
      vehicleNumber: 'MH02XY9999'
    }
  }, resBooking2);

  client1Events.length = 0;
  const resCancel = createMockRes();
  await cancel({
    user: normalUser,
    params: { id: resBooking2.data.booking._id.toString() }
  }, resCancel);

  await wait(150);
  assert(
    resCancel.statusCode === 200 &&
    client1Events.length === 1 &&
    client1Events[0].status === 'available',
    'Booking cancellation immediately restores slot and emits status "available"'
  );

  // -------------------------------------------------------------
  // Test 9: Admin toggling slot status (maintenance / out_of_service)
  // -------------------------------------------------------------
  client1Events.length = 0;
  const resSlotDisable = createMockRes();
  await updateSlot({
    params: { id: testSlot._id.toString() },
    body: { isActive: false }
  }, resSlotDisable);

  await wait(150);
  assert(
    resSlotDisable.statusCode === 200 &&
    client1Events.length === 1 &&
    client1Events[0].status === 'out_of_service',
    'Slot disabled by admin emits slot:updated with status "out_of_service"'
  );

  // Re-enable slot
  client1Events.length = 0;
  const resSlotEnable = createMockRes();
  await updateSlot({
    params: { id: testSlot._id.toString() },
    body: { isActive: true }
  }, resSlotEnable);

  await wait(150);
  assert(
    resSlotEnable.statusCode === 200 &&
    client1Events.length === 1 &&
    client1Events[0].status === 'available',
    'Slot re-enabled by admin emits slot:updated with status "available"'
  );

  // -------------------------------------------------------------
  // Test 10: Unauthorized private/admin channel subscription rejected
  // -------------------------------------------------------------
  let errorMsg = null;
  client1.once('error', (err) => { errorMsg = err.message; });
  client1.emit('subscribe:admin', { token: 'invalid.jwt.token' });
  await wait(150);

  assert(
    errorMsg === 'Invalid or expired token',
    'Protected admin channel rejects invalid JWT token'
  );

  errorMsg = null;
  client1.once('error', (err) => { errorMsg = err.message; });
  client1.emit('subscribe:admin', { token: userToken });
  await wait(150);

  assert(
    errorMsg === 'Admin access only',
    'Protected admin channel rejects non-admin user role'
  );

  // -------------------------------------------------------------
  // Test 11: Authorized admin subscription and stats emission
  // -------------------------------------------------------------
  let adminSubscribed = false;
  client1.once('admin:subscribed', () => { adminSubscribed = true; });
  client1.emit('subscribe:admin', { token: adminToken });
  await wait(150);

  assert(adminSubscribed === true, 'Authorized admin token successfully joins admin room');

  let adminStatsReceived = false;
  client1.once('admin:stats:updated', (payload) => {
    if (payload.serverTs) adminStatsReceived = true;
  });
  socketManager.emitAdminStatsUpdate();
  await wait(150);

  assert(
    adminStatsReceived === true,
    'Admin stats broadcast received by authorized admin connection with serverTs'
  );

  // -------------------------------------------------------------
  // Test 12: Rate limiting on excessive socket events
  // -------------------------------------------------------------
  let rateLimitHit = false;
  client1.on('error', (err) => {
    if (err.message && err.message.includes('Too many requests')) {
      rateLimitHit = true;
    }
  });

  for (let i = 0; i < 8; i++) {
    client1.emit('subscribe:area', { areaId: testAreaA._id.toString() });
  }
  await wait(150);
  assert(rateLimitHit === true, 'Excessive socket client emissions are rate-limited safely');

  // Clean up
  client1.disconnect();
  client2.disconnect();
  await new Promise((resolve) => httpServer.close(resolve));
  await mongoose.disconnect();

  console.log('\n================================================================');
  console.log(`ALL ${totalTests}/${totalTests} PHASE 2 REAL-TIME AVAILABILITY TESTS PASSED WITH 100% SUCCESS!`);
  console.log('================================================================\n');
}

runSocketRealtimeTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
