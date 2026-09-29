const mongoose = require('mongoose');
const slotSchema = new mongoose.Schema({
  area: { type: mongoose.Schema.Types.ObjectId, ref: 'Area', required: true },
  slotNumber: { type: String, required: true },
  type: { type: String, enum: ['car', 'bike'], default: 'car' },
  isActive: { type: Boolean, default: true }             // admin can disable a slot (maintenance)
}, { timestamps: true });
slotSchema.index({ area: 1, slotNumber: 1 }, { unique: true });
module.exports = mongoose.model('Slot', slotSchema);
