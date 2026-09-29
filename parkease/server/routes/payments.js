const r = require('express').Router();
const c = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');
r.post('/:bookingId/pay', protect, c.pay);
module.exports = r;
