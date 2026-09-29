const r = require('express').Router();
const c = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');
r.use(protect);
r.post('/', c.create);
r.get('/my', c.mine);
r.put('/:id/cancel', c.cancel);
module.exports = r;
