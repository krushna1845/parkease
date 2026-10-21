const r = require('express').Router();
const c = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

// Public gateway webhook endpoint
r.post('/webhook', c.webhook);

// Protected payment endpoints
r.post('/:bookingId/order', protect, c.createOrder);
r.post('/:bookingId/verify', protect, c.verifyRazorpay);
r.post('/:bookingId/pay', protect, c.pay);

module.exports = r;

