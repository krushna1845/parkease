/**
 * SocketContext.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides a single, shared Socket.IO connection to the entire React app.
 *
 * Connection states:
 *   connected    – socket.connected === true
 *   reconnecting – socket fired "connect_error" or "reconnect_attempt"
 *   offline      – persistent connection failure (max retries reached or
 *                  manually disabled)
 *
 * Public events received:
 *   slot:updated       – { areaId, slotId, slotNumber, type, status, serverTs }
 *   admin:stats:updated – { serverTs }
 *
 * Usage (in any component):
 *   const { connectionState, subscribeToArea, unsubscribeFromArea } = useSocket();
 *
 * Admin usage:
 *   const { subscribeToAdmin } = useSocket();
 *   subscribeToAdmin();  // only works if user is admin (token verified server-side)
 */

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

// Derive the Socket.IO server URL from the same base as the REST API.
// In Docker/Nginx, VITE_API_URL = '/api', so we need the origin without '/api'.
function getSocketUrl() {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  // If it's a relative URL (e.g. /api), use window.origin
  if (apiUrl.startsWith('/')) {
    return window.location.origin;
  }
  // Strip /api suffix to get the socket server root
  return apiUrl.replace(/\/api\/?$/, '');
}

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [connectionState, setConnectionState] = useState('offline'); // 'connected'|'reconnecting'|'offline'
  // Listeners registered by consumers: Map<eventName, Set<callback>>
  const listenersRef = useRef(new Map());

  // Forward incoming events to all registered listeners
  function forwardEvent(eventName, data) {
    const handlers = listenersRef.current.get(eventName);
    if (handlers) {
      handlers.forEach((fn) => {
        try { fn(data); } catch (e) { console.error('Socket listener error:', e); }
      });
    }
  }

  useEffect(() => {
    const url = getSocketUrl();
    const socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 10_000,
      autoConnect: true
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionState('connected');
    });

    socket.on('disconnect', () => {
      setConnectionState('reconnecting');
    });

    socket.on('connect_error', () => {
      setConnectionState('reconnecting');
    });

    socket.io.on('reconnect_failed', () => {
      setConnectionState('offline');
    });

    socket.io.on('reconnect', () => {
      setConnectionState('connected');
      // Notify all listeners that we've reconnected so they can refresh REST data
      forwardEvent('reconnected', {});
    });

    // Forward domain events to registered listeners
    socket.on('slot:updated', (data) => forwardEvent('slot:updated', data));
    socket.on('admin:stats:updated', (data) => forwardEvent('admin:stats:updated', data));
    socket.on('admin:subscribed', (data) => forwardEvent('admin:subscribed', data));
    socket.on('error', (data) => console.warn('Socket server error:', data?.message));

    return () => {
      socket.disconnect();
    };
  }, []);

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Subscribe to real-time availability updates for a parking area. */
  const subscribeToArea = useCallback((areaId) => {
    if (socketRef.current && areaId) {
      socketRef.current.emit('subscribe:area', { areaId });
    }
  }, []);

  /** Unsubscribe from area updates (on unmount / area change). */
  const unsubscribeFromArea = useCallback((areaId) => {
    if (socketRef.current && areaId) {
      socketRef.current.emit('unsubscribe:area', { areaId });
    }
  }, []);

  /** Subscribe to admin room. Server verifies JWT before admission. */
  const subscribeToAdmin = useCallback(() => {
    const token = localStorage.getItem('token');
    if (socketRef.current && token) {
      socketRef.current.emit('subscribe:admin', { token });
    }
  }, []);

  /**
   * Register a listener for a socket event.
   * Returns an unsubscribe function — call it in useEffect cleanup.
   *
   * @param {string} eventName  e.g. 'slot:updated', 'admin:stats:updated', 'reconnected'
   * @param {Function} handler  callback(data)
   * @returns {Function} unsubscribe
   */
  const on = useCallback((eventName, handler) => {
    if (!listenersRef.current.has(eventName)) {
      listenersRef.current.set(eventName, new Set());
    }
    listenersRef.current.get(eventName).add(handler);
    return () => {
      listenersRef.current.get(eventName)?.delete(handler);
    };
  }, []);

  return (
    <SocketContext.Provider value={{
      connectionState,
      subscribeToArea,
      unsubscribeFromArea,
      subscribeToAdmin,
      on
    }}>
      {children}
    </SocketContext.Provider>
  );
}
