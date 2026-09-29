const r = require('express').Router();
const c = require('../controllers/slotController');
const { protect, adminOnly } = require('../middleware/auth');
r.get('/area/:areaId', c.byArea);
r.post('/', protect, adminOnly, c.create);
r.put('/:id', protect, adminOnly, c.update);
r.delete('/:id', protect, adminOnly, c.remove);
module.exports = r;
