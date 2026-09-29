const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const safe = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });

exports.register = async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
  if (await User.findOne({ email })) return res.status(400).json({ message: 'Email already registered' });
  const user = await User.create({ name, email, phone, password: await bcrypt.hash(password, 10) }); // role defaults to "user"
  res.status(201).json({ token: sign(user), user: safe(user) });
};

exports.login = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user || !(await bcrypt.compare(req.body.password || '', user.password)))
    return res.status(400).json({ message: 'Invalid email or password' });
  res.json({ token: sign(user), user: safe(user) });
};

exports.me = (req, res) => res.json(safe(req.user));
