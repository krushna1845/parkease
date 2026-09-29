const r = require('express').Router();
const c = require('../controllers/areaController');
const { protect, adminOnly } = require('../middleware/auth');
r.get('/', c.list);
r.get('/:id', c.get);
r.post('/', protect, adminOnly, c.create);
r.put('/:id', protect, adminOnly, c.update);
r.delete('/:id', protect, adminOnly, c.remove);
module.exports = r;
