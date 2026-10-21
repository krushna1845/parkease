const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const safe = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone });

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.register = async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ message: 'Invalid email address format' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  if (await User.findOne({ email: cleanEmail })) {
    return res.status(400).json({ message: 'Email already registered' });
  }

  const user = await User.create({
    name: String(name).trim(),
    email: cleanEmail,
    phone: phone ? String(phone).trim() : undefined,
    password: await bcrypt.hash(password, 10)
  }); // role defaults to "user"

  res.status(201).json({ token: sign(user), user: safe(user) });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: cleanEmail });
  if (!user || !(await bcrypt.compare(String(password), user.password))) {
    return res.status(400).json({ message: 'Invalid email or password' });
  }

  res.json({ token: sign(user), user: safe(user) });
};

exports.me = (req, res) => res.json(safe(req.user));

