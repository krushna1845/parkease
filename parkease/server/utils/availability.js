const Booking = require('../models/Booking');
const HOLD_MINUTES = 10; // an unpaid booking holds the slot only this long

// Two time ranges overlap when: existingStart < newEnd AND existingEnd > newStart
// A booking blocks a slot if it is confirmed, or pending_payment and still within the hold window.
exports.findConflicts = (filter, start, end) => {
  const holdLimit = new Date(Date.now() - HOLD_MINUTES * 60 * 1000);
  return Booking.find({
    ...filter,
    startTime: { $lt: end },
    endTime: { $gt: start },
    $or: [{ status: { $in: ['confirmed', 'completed'] } }, { status: 'pending_payment', createdAt: { $gt: holdLimit } }]
  });
};


exports.HOLD_MINUTES = HOLD_MINUTES;
