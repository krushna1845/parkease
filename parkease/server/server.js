require('dotenv').config();

// Fail fast safely if required environment variables are missing
if (!process.env.JWT_SECRET) {
  console.error('CRITICAL: JWT_SECRET environment variable is missing.');
  process.exit(1);
}
if (!process.env.MONGO_URI) {
  console.error('CRITICAL: MONGO_URI environment variable is missing.');
  process.exit(1);
}

const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const socketManager = require('./socketManager');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
const clientUrl = process.env.CLIENT_URL;
app.use(cors({
  origin: clientUrl ? [clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'] : true,
  credentials: true
}));

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
connectDB();


// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'parkease-api', timestamp: new Date().toISOString() });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/areas', require('./routes/areas'));
app.use('/api/slots', require('./routes/slots'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));




// 404 handler for unknown routes
app.use((req, res, next) => {
  res.status(404).json({ message: `Cannot ${req.method} ${req.originalUrl}` });
});

// Central error handler: handles Mongoose, JSON parsing, and generic errors
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);

  // Mongoose bad ObjectId format
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid ID format', field: err.path });
  }

  // Mongoose schema validation failure
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: 'Validation error', errors: messages });
  }

  // Duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ message: `Duplicate value for ${field}` });
  }

  // Malformed JSON request body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'Malformed JSON payload' });
  }

  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

// ─────────────────────────────────────────────────────────────────────────────
// Create HTTP server and attach Socket.IO AFTER all Express middleware is set.
// This is the single server — Socket.IO shares it, no second server is created.
// ─────────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);

// Initialise Socket.IO (must happen before httpServer.listen)
socketManager.init(httpServer);

httpServer.listen(PORT, () => console.log('API + WebSocket running on port ' + PORT));
