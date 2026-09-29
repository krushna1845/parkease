const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 1) verify JWT from "Authorization: Bearer <token>" and attach user to req
exports.protect = async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ message: 'Not logged in' });
  try {
    const { id } = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    req.user = await User.findById(id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'User no longer exists' });
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// 2) role check, always used after protect
exports.adminOnly = (req, res, next) =>
  req.user.role === 'admin' ? next() : res.status(403).json({ message: 'Admin access only' });
