const mongoose = require('mongoose');
module.exports = mongoose.model('User', new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },          // stored as bcrypt hash
  phone: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
}, { timestamps: true }));
