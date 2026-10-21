const mongoose = require('mongoose');

module.exports = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('CRITICAL: MONGO_URI environment variable is missing.');
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB runtime error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Attempting to reconnect...');
  });

  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected successfully');
  } catch (e) {
    console.error('MongoDB initial connection failed:', e.message);
    process.exit(1);
  }
};

