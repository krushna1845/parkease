/**
 * ConnectionIndicator.jsx
 * A subtle live connection indicator that shows the Socket.IO state.
 * Placed in the Navbar or page headers.
 *
 * States:
 *   connected    → green dot + "Live"
 *   reconnecting → amber dot + "Reconnecting"
 *   offline      → red dot + "Offline"
 */

import { useSocket } from '../context/SocketContext';

const STATES = {
  connected: {
    dot: 'bg-emerald-500 animate-pulse',
    label: 'Live',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200'
  },
  reconnecting: {
    dot: 'bg-amber-400 animate-pulse',
    label: 'Reconnecting…',
    text: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200'
  },
  offline: {
    dot: 'bg-rose-500',
    label: 'Offline',
    text: 'text-rose-700',
    bg: 'bg-rose-50 border-rose-200'
  }
};

export default function ConnectionIndicator({ className = '' }) {
  const socket = useSocket();
  // If context not yet available (during SSR-like init), don't render
  if (!socket) return null;

  const { connectionState } = socket;
  const cfg = STATES[connectionState] || STATES.offline;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold ${cfg.bg} ${cfg.text} ${className}`}
      title={`Real-time connection: ${connectionState}`}
      aria-label={`Connection status: ${cfg.label}`}
      id="socket-connection-indicator"
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
