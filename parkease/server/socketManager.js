/**
 * socketManager.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Single-source Socket.IO integration for ParkEase.
 *
 * Architecture:
 *   - One Socket.IO server attached to the existing HTTP server.
 *   - Public availability updates are broadcast to room "area:<areaId>".
 *   - No private booking details are exposed via sockets.
 *   - JWT is verified for any protected/admin subscription.
 *   - Clients join area rooms by emitting "subscribe:area" with { areaId }.
 *   - Rate-limit: max 5 subscribe events per connection per 10 s.
 *
 * Slot status semantics (derived from DB state, never from client):
 *   available        – slot.isActive = true AND no overlapping active booking
 *   pending_payment  – slot has a pending_payment booking within hold window (10 min)
 *   confirmed        – slot has a confirmed booking whose window is now/future
 *   occupied         – slot has a confirmed booking AND isCheckedIn = true
 *   out_of_service   – slot.isActive = false
 *
 * Public event "slot:updated" payload (safe – no user PII):
 *   {
 *     areaId:    string,
 *     slotId:    string,
 *     slotNumber:string,
 *     type:      'car'|'bike',
 *     status:    'available'|'pending_payment'|'confirmed'|'occupied'|'out_of_service',
 *     serverTs:  ISO-8601 string   // server-generated timestamp
 *   }
 *
 * Admin event "admin:stats:updated" payload:
 *   { serverTs: string }   // triggers a REST refresh, no data leaked
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

let io = null;

// Simple per-connection rate limiter (max events per window)
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10_000;

// ─────────────────────────────────────────────────────────────────────────────
// Initialise Socket.IO once on application startup
// ─────────────────────────────────────────────────────────────────────────────
function init(httpServer) {
  const clientUrl = process.env.CLIENT_URL;

  io = new Server(httpServer, {
    cors: {
      origin: clientUrl
        ? [clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173']
        : '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    // Reconnection is handled by the client; server-side, we keep defaults.
    pingTimeout: 60_000,
    pingInterval: 25_000,
    transports: ['websocket', 'polling']  // polling fallback for nginx envs
  });

  io.on('connection', (socket) => {
    // Per-connection rate limit counters
    let eventCount = 0;
    const rateLimitTimer = setInterval(() => { eventCount = 0; }, RATE_WINDOW_MS);

    function checkRateLimit() {
      eventCount++;
      if (eventCount > RATE_LIMIT) {
        socket.emit('error', { message: 'Too many requests. Slow down.' });
        return false;
      }
      return true;
    }

    // ── subscribe:area ──────────────────────────────────────────────────────
    // Public: any client may subscribe to availability updates for an area.
    // areaId is validated as a 24-char hex MongoDB ObjectId.
    socket.on('subscribe:area', ({ areaId } = {}) => {
      if (!checkRateLimit()) return;
      if (!areaId || !/^[0-9a-fA-F]{24}$/.test(areaId)) {
        return socket.emit('error', { message: 'Invalid areaId' });
      }
      socket.join(`area:${areaId}`);
    });

    // ── unsubscribe:area ────────────────────────────────────────────────────
    socket.on('unsubscribe:area', ({ areaId } = {}) => {
      if (!areaId || !/^[0-9a-fA-F]{24}$/.test(areaId)) return;
      socket.leave(`area:${areaId}`);
    });

    // ── subscribe:admin ─────────────────────────────────────────────────────
    // Protected: verifies the JWT provided by the client before granting
    // access to the admin room.  No user PII is returned.
    socket.on('subscribe:admin', async ({ token } = {}) => {
      if (!checkRateLimit()) return;
      if (!token) return socket.emit('error', { message: 'Token required for admin subscription' });
      try {
        const { id } = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(id).select('role').lean();
        if (!user || user.role !== 'admin') {
          return socket.emit('error', { message: 'Admin access only' });
        }
        socket.join('admin');
        socket.emit('admin:subscribed', { ok: true });
      } catch {
        socket.emit('error', { message: 'Invalid or expired token' });
      }
    });

    socket.on('disconnect', () => {
      clearInterval(rateLimitTimer);
    });
  });

  console.log('Socket.IO initialised and attached to HTTP server');
  return io;
}

// ─────────────────────────────────────────────────────────────────────────────
// Emit a slot availability update to the relevant area room.
// Called by controllers AFTER a successful DB write.
//
// params:
//   areaId      – Mongo ObjectId or string
//   slotId      – Mongo ObjectId or string
//   slotNumber  – human-readable slot identifier
//   type        – 'car' | 'bike'
//   status      – one of the defined status strings (see docs above)
// ─────────────────────────────────────────────────────────────────────────────
function emitSlotUpdate({ areaId, slotId, slotNumber, type, status }) {
  if (!io) return; // Socket.IO not yet initialised (e.g. tests)
  const payload = {
    areaId: areaId.toString(),
    slotId: slotId.toString(),
    slotNumber,
    type,
    status,
    serverTs: new Date().toISOString()
  };
  io.to(`area:${areaId.toString()}`).emit('slot:updated', payload);
}

// ─────────────────────────────────────────────────────────────────────────────
// Notify admin room that stats have changed (no sensitive data leaked).
// Clients react by re-fetching stats via REST.
// ─────────────────────────────────────────────────────────────────────────────
function emitAdminStatsUpdate() {
  if (!io) return;
  io.to('admin').emit('admin:stats:updated', { serverTs: new Date().toISOString() });
}

// ─────────────────────────────────────────────────────────────────────────────
// Derive a public slot status string from the booking status + slot state.
// This is the single authoritative mapping used for all emissions.
// ─────────────────────────────────────────────────────────────────────────────
function deriveSlotStatus({ isActive, bookingStatus, isCheckedIn }) {
  if (!isActive) return 'out_of_service';
  if (!bookingStatus) return 'available';
  switch (bookingStatus) {
    case 'pending_payment': return 'pending_payment';
    case 'confirmed':
      return isCheckedIn ? 'occupied' : 'confirmed';
    case 'cancelled':
    case 'completed':
      return 'available';
    default:
      return 'available';
  }
}

module.exports = { init, emitSlotUpdate, emitAdminStatsUpdate, deriveSlotStatus };
