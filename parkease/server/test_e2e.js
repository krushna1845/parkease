const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

const User = require('./models/User');
const Area = require('./models/Area');
const Slot = require('./models/Slot');
const Booking = require('./models/Booking');
const Payment = require('./models/Payment');

const { create, mine, getOne, cancel, verify, checkIn, checkOut } = require('./controllers/bookingController');
const { pay, createOrder, verifyRazorpay, webhook } = require('./controllers/paymentController');

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

async function runPhaseTests() {
  console.log('================================================================');
  console.log('PARKEASE STEP 3: END-TO-END BOOKING ENGINE & PAYMENT TEST SUITE');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/parkease');
  console.log('✓ Initialized: Connected to MongoDB\n');

  const admin = await User.findOne({ email: 'admin@parkease.com' });
  const user1 = await User.findOne({ email: 'user@parkease.com' });
  if (!admin || !user1) throw new Error('Seed accounts missing. Please run "npm run seed" first.');

  // Create a second test user to test unauthorized access
  let user2 = await User.findOne({ email: 'user2@parkease.com' });
  if (!user2) {
    user2 = await User.create({
      name: 'User Two',
      email: 'user2@parkease.com',
      password: 'password123',
      role: 'user'
    });
  }

  const area = await Area.findOne();
  const slot = await Slot.findOne({ area: area._id, isActive: true });
  if (!area || !slot) throw new Error('Parking area or slot not found');

  // Clean any residual test bookings on this slot to start clean
  await Payment.deleteMany({ user: { $in: [user1._id, user2._id] } });
  await Booking.deleteMany({ user: { $in: [user1._id, user2._id] } });

  // -------------------------------------------------------------
  // Test 1: Valid booking creation
  // -------------------------------------------------------------
  const now = Date.now();
  const t1Start = new Date(now + 1 * 3600 * 1000); // 1h in future
  const t1End = new Date(now + 3 * 3600 * 1000);   // 3h in future (2 hours duration)
  const res1 = createMockRes();
  await create({
    user: user1,
    body: {
      slotId: slot._id.toString(),
      vehicleNumber: 'KA01AA1001',
      startTime: t1Start.toISOString(),
      endTime: t1End.toISOString()
    }
  }, res1);

  if (res1.statusCode !== 201 || !res1.data.booking) {
    throw new Error('Test 1 Failed: Valid booking creation did not return 201');
  }
  const booking1 = res1.data.booking;
  console.log('✓ Test 1 Passed: Valid booking creation created pending booking ID:', booking1._id);

  // -------------------------------------------------------------
  // Test 2: Invalid time interval (end before start, past start)
  // -------------------------------------------------------------
  const res2A = createMockRes();
  await create({
    user: user1,
    body: {
      slotId: slot._id.toString(),
      vehicleNumber: 'KA01AA1002',
      startTime: new Date(now + 5 * 3600 * 1000).toISOString(),
      endTime: new Date(now + 2 * 3600 * 1000).toISOString()
    }
  }, res2A);

  const res2B = createMockRes();
  await create({
    user: user1,
    body: {
      slotId: slot._id.toString(),
      vehicleNumber: 'KA01AA1002',
      startTime: new Date(now - 3600 * 1000).toISOString(), // 1h in past
      endTime: new Date(now + 3600 * 1000).toISOString()
    }
  }, res2B);

  if (res2A.statusCode !== 400 || res2B.statusCode !== 400) {
    throw new Error('Test 2 Failed: Invalid time intervals were not rejected with 400');
  }
  console.log('✓ Test 2 Passed: Invalid and past time intervals rejected with 400');

  // -------------------------------------------------------------
  // Test 3: Booking for an unavailable / inactive slot
  // -------------------------------------------------------------
  const inactiveSlot = await Slot.create({
    area: area._id,
    slotNumber: 'INACTIVE-999',
    type: 'car',
    isActive: false
  });

  const res3 = createMockRes();
  await create({
    user: user1,
    body: {
      slotId: inactiveSlot._id.toString(),
      vehicleNumber: 'KA01AA1003',
      startTime: new Date(now + 10 * 3600 * 1000).toISOString(),
      endTime: new Date(now + 12 * 3600 * 1000).toISOString()
    }
  }, res3);

  await Slot.deleteOne({ _id: inactiveSlot._id });
  if (res3.statusCode !== 409 && res3.statusCode !== 400) {
    throw new Error('Test 3 Failed: Inactive slot booking was not rejected');
  }
  console.log('✓ Test 3 Passed: Booking for inactive slot rejected');

  // -------------------------------------------------------------
  // Test 4: Overlapping booking rejection
  // -------------------------------------------------------------
  // Overlaps with t1 (which is 1h to 3h in future) -> e.g. 2h to 4h
  const res4 = createMockRes();
  await create({
    user: user2,
    body: {
      slotId: slot._id.toString(),
      vehicleNumber: 'KA01AA1004',
      startTime: new Date(now + 2 * 3600 * 1000).toISOString(),
      endTime: new Date(now + 4 * 3600 * 1000).toISOString()
    }
  }, res4);

  if (res4.statusCode !== 409) {
    throw new Error('Test 4 Failed: Overlapping interval was not rejected with 409 Conflict');
  }
  console.log('✓ Test 4 Passed: Overlapping booking interval rejected with 409 Conflict');

  // -------------------------------------------------------------
  // Test 5: Two concurrent requests for the same interval
  // -------------------------------------------------------------
  const tConcStart = new Date(now + 50 * 3600 * 1000);
  const tConcEnd = new Date(now + 52 * 3600 * 1000);
  const res5A = createMockRes();
  const res5B = createMockRes();

  await Promise.all([
    create({
      user: user1,
      body: { slotId: slot._id.toString(), vehicleNumber: 'KA01CONC01', startTime: tConcStart.toISOString(), endTime: tConcEnd.toISOString() }
    }, res5A),
    create({
      user: user2,
      body: { slotId: slot._id.toString(), vehicleNumber: 'KA01CONC02', startTime: tConcStart.toISOString(), endTime: tConcEnd.toISOString() }
    }, res5B)
  ]);

  const concCodes = [res5A.statusCode, res5B.statusCode].sort();
  if (concCodes[0] !== 201 || concCodes[1] !== 409) {
    throw new Error(`Test 5 Failed: Concurrent requests did not resolve to [201, 409], got ${concCodes.join(', ')}`);
  }
  const concBookingId = res5A.statusCode === 201 ? res5A.data.booking._id : res5B.data.booking._id;
  await Booking.deleteOne({ _id: concBookingId });
  console.log('✓ Test 5 Passed: Two concurrent booking requests safely serialized (1 created, 1 rejected)');

  // -------------------------------------------------------------
  // Test 6: Two non-overlapping back-to-back bookings (half-open interval)
  // -------------------------------------------------------------
  // t1 is from 1h to 3h. Back-to-back booking starts exactly at 3h to 5h.
  const res6 = createMockRes();
  await create({
    user: user2,
    body: {
      slotId: slot._id.toString(),
      vehicleNumber: 'KA01AA1006',
      startTime: t1End.toISOString(), // exactly equals t1 ending time!
      endTime: new Date(now + 5 * 3600 * 1000).toISOString()
    }
  }, res6);

  if (res6.statusCode !== 201) {
    throw new Error('Test 6 Failed: Back-to-back non-overlapping interval was rejected: ' + JSON.stringify(res6.data));
  }
  const bookingBackToBack = res6.data.booking;
  await Booking.deleteOne({ _id: bookingBackToBack._id });
  console.log('✓ Test 6 Passed: Half-open interval accepted back-to-back booking (existingEnd === newStart)');

  // -------------------------------------------------------------
  // Test 7: Server-side price calculation
  // -------------------------------------------------------------
  const expectedPrice = 2 * area.pricePerHour; // 2 hours
  if (booking1.amount !== expectedPrice) {
    throw new Error(`Test 7 Failed: Expected ${expectedPrice}, got ${booking1.amount}`);
  }
  console.log(`✓ Test 7 Passed: Server calculated authoritative amount (2h × ${area.pricePerHour} = Rs ${booking1.amount})`);

  // -------------------------------------------------------------
  // Test 8: Unauthorized booking access
  // -------------------------------------------------------------
  // user2 attempts to view user1's booking
  const res8User2 = createMockRes();
  await getOne({ user: user2, params: { id: booking1._id } }, res8User2);
  if (res8User2.statusCode !== 403) {
    throw new Error('Test 8 Failed: User 2 was not forbidden from accessing User 1 booking');
  }

  // Admin attempts to view user1's booking
  const res8Admin = createMockRes();
  await getOne({ user: admin, params: { id: booking1._id } }, res8Admin);
  if (res8Admin.statusCode !== 200) {
    throw new Error('Test 8 Failed: Admin was not permitted to view booking');
  }
  console.log('✓ Test 8 Passed: Unauthorized user access rejected with 403; admin access allowed with 200');

  // -------------------------------------------------------------
  // Test 9: Cancellation and reservation release
  // -------------------------------------------------------------
  const resCancel = createMockRes();
  await cancel({ user: user1, params: { id: booking1._id } }, resCancel);
  if (resCancel.statusCode !== 200 || resCancel.data.status !== 'cancelled') {
    throw new Error('Test 9 Failed: Booking cancellation failed');
  }

  // Now verify the released slot interval can be booked again!
  const resRebook = createMockRes();
  await create({
    user: user2,
    body: {
      slotId: slot._id.toString(),
      vehicleNumber: 'KA01AA1009',
      startTime: t1Start.toISOString(),
      endTime: t1End.toISOString()
    }
  }, resRebook);

  if (resRebook.statusCode !== 201) {
    throw new Error('Test 9 Failed: Cancelled interval was not released for rebooking');
  }
  const activeBooking = resRebook.data.booking;
  console.log('✓ Test 9 Passed: Cancellation released hold and allowed new reservation');

  // -------------------------------------------------------------
  // Test 10: Expiration of unpaid holds
  // -------------------------------------------------------------
  // Create an expired unpaid booking (older than 10 mins)
  const expiredStart = new Date(now + 24 * 3600 * 1000);
  const expiredEnd = new Date(now + 26 * 3600 * 1000);
  const expiredBooking = await Booking.create({
    user: user1._id,
    area: area._id,
    slot: slot._id,
    vehicleNumber: 'EXPIRED123',
    startTime: expiredStart,
    endTime: expiredEnd,
    amount: 100,
    status: 'pending_payment',
    createdAt: new Date(now - 15 * 60 * 1000) // 15 mins ago
  });

  // Another user books the exact same interval; hold should be treated as expired
  const resBookExpired = createMockRes();
  await create({
    user: user2,
    body: {
      slotId: slot._id.toString(),
      vehicleNumber: 'NEWUSER999',
      startTime: expiredStart.toISOString(),
      endTime: expiredEnd.toISOString()
    }
  }, resBookExpired);

  if (resBookExpired.statusCode !== 201) {
    throw new Error('Test 10 Failed: Expired hold blocked new reservation: ' + JSON.stringify(resBookExpired.data));
  }
  await Booking.deleteOne({ _id: expiredBooking._id });
  await Booking.deleteOne({ _id: resBookExpired.data.booking._id });
  console.log('✓ Test 10 Passed: Unpaid hold older than 10 minutes released automatically');

  // -------------------------------------------------------------
  // Test 11: Valid and invalid Razorpay payment signature
  // -------------------------------------------------------------
  const dummySecret = 'test_secret_key_12345';
  process.env.RAZORPAY_KEY_SECRET = dummySecret;

  const testOrderId = 'order_test_987654';
  const testPaymentId = 'pay_test_123456';
  const validSignature = crypto.createHmac('sha256', dummySecret)
    .update(testOrderId + '|' + testPaymentId)
    .digest('hex');

  // A: Invalid signature attempt
  const resSigInvalid = createMockRes();
  await verifyRazorpay({
    user: user2,
    params: { bookingId: activeBooking._id },
    body: {
      razorpay_order_id: testOrderId,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: 'invalid_forged_signature_hex'
    }
  }, resSigInvalid);

  if (resSigInvalid.statusCode !== 400) {
    throw new Error('Test 11 Failed: Forged signature was not rejected with 400');
  }

  // B: Valid signature attempt
  const resSigValid = createMockRes();
  await verifyRazorpay({
    user: user2,
    params: { bookingId: activeBooking._id },
    body: {
      razorpay_order_id: testOrderId,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: validSignature
    }
  }, resSigValid);

  if (resSigValid.statusCode !== 200 || resSigValid.data.status !== 'confirmed') {
    throw new Error('Test 11 Failed: Valid signature was not confirmed: ' + JSON.stringify(resSigValid.data));
  }
  const confirmedBooking = resSigValid.data;
  console.log('✓ Test 11 Passed: HMAC payment signature verified (invalid rejected 400, valid confirmed 200)');

  // -------------------------------------------------------------
  // Test 12: Duplicate webhook delivery (idempotency)
  // -------------------------------------------------------------
  const webhookSecret = 'test_webhook_secret_999';
  process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;

  const webhookPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: testPaymentId,
          order_id: testOrderId,
          amount: confirmedBooking.amount * 100
        }
      }
    }
  });

  const webhookSig = crypto.createHmac('sha256', webhookSecret).update(webhookPayload).digest('hex');
  const resWebhook = createMockRes();
  await webhook({
    headers: { 'x-razorpay-signature': webhookSig },
    rawBody: Buffer.from(webhookPayload),
    body: JSON.parse(webhookPayload)
  }, resWebhook);

  if (resWebhook.statusCode !== 200 || resWebhook.data.status !== 'already_processed') {
    throw new Error('Test 12 Failed: Duplicate webhook was not handled idempotently: ' + JSON.stringify(resWebhook.data));
  }
  console.log('✓ Test 12 Passed: Duplicate webhook delivery handled idempotently without re-processing');

  // -------------------------------------------------------------
  // Test 13: Payment success after hold expiration
  // -------------------------------------------------------------
  // Create an expired booking whose hold lapsed, but the slot is still free
  const lateStart = new Date(now + 60 * 3600 * 1000);
  const lateEnd = new Date(now + 62 * 3600 * 1000);
  const lateOrderId = 'order_late_' + Date.now();
  const lateBooking = await Booking.create({
    user: user1._id,
    area: area._id,
    slot: slot._id,
    vehicleNumber: 'LATE9999',
    startTime: lateStart,
    endTime: lateEnd,
    amount: 150,
    status: 'cancelled', // marked cancelled due to expired hold
    razorpayOrderId: lateOrderId,
    createdAt: new Date(now - 20 * 60 * 1000)
  });

  const latePayId = 'pay_late_' + Date.now();
  const lateSig = crypto.createHmac('sha256', dummySecret)
    .update(lateOrderId + '|' + latePayId)
    .digest('hex');

  const resLatePay = createMockRes();
  await verifyRazorpay({
    user: user1,
    params: { bookingId: lateBooking._id },
    body: {
      razorpay_order_id: lateOrderId,
      razorpay_payment_id: latePayId,
      razorpay_signature: lateSig
    }
  }, resLatePay);

  if (resLatePay.statusCode !== 200 || resLatePay.data.status !== 'confirmed') {
    throw new Error('Test 13 Failed: Late payment reconciliation failed: ' + JSON.stringify(resLatePay.data));
  }
  await Booking.deleteOne({ _id: lateBooking._id });
  await Payment.deleteMany({ booking: lateBooking._id });
  console.log('✓ Test 13 Passed: Late payment after hold expiration reconciled and reinstated successfully');

  // -------------------------------------------------------------
  // Test 14: Invalid QR ticket verification
  // -------------------------------------------------------------
  const resBadQR = createMockRes();
  await verify({
    body: { qrData: JSON.stringify({ ticketCode: '00000000000000000000000000000000', bookingId: new mongoose.Types.ObjectId().toString() }) }
  }, resBadQR);

  if (resBadQR.statusCode !== 404 || resBadQR.data.valid !== false) {
    throw new Error('Test 14 Failed: Fake QR ticket was not rejected with 404');
  }
  console.log('✓ Test 14 Passed: Fake/invalid QR ticket rejected with 404');

  // -------------------------------------------------------------
  // Test 15: Duplicate check-in attempt
  // -------------------------------------------------------------
  // Temporarily adjust startTime to be within check-in window (e.g. 5 minutes from now)
  confirmedBooking.startTime = new Date(Date.now() + 5 * 60 * 1000);
  confirmedBooking.endTime = new Date(Date.now() + 2 * 3600 * 1000);
  await Booking.updateOne({ _id: confirmedBooking._id }, {
    startTime: confirmedBooking.startTime,
    endTime: confirmedBooking.endTime
  });

  const resCheckIn1 = createMockRes();
  await checkIn({ params: { id: confirmedBooking._id }, user: admin }, resCheckIn1);
  if (resCheckIn1.statusCode !== 200 || !resCheckIn1.data.booking.isCheckedIn) {
    throw new Error('Test 15 Failed: First check-in failed: ' + JSON.stringify(resCheckIn1.data));
  }

  // Second check-in attempt on the same ticket
  const resCheckIn2 = createMockRes();
  await checkIn({ params: { id: confirmedBooking._id }, user: admin }, resCheckIn2);
  if (resCheckIn2.statusCode !== 400) {
    throw new Error('Test 15 Failed: Duplicate check-in was not rejected with 400');
  }
  console.log('✓ Test 15 Passed: First check-in succeeded; duplicate check-in rejected with 400');

  // Teardown
  await Payment.deleteMany({ booking: confirmedBooking._id });
  await Booking.deleteOne({ _id: confirmedBooking._id });
  await User.deleteOne({ _id: user2._id });

  await mongoose.disconnect();
  console.log('\n================================================================');
  console.log('ALL 15 TARGETED BOOKING & PAYMENT TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================');
}

runPhaseTests().catch((err) => {
  console.error('\n❌ Test Failure:', err);
  process.exit(1);
});
