import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL
  || (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

/**
 * Subscribes to real-time complaint events emitted by
 * backend/src/realtime/socket.js. Purely additive — components that
 * don't call this hook are completely unaffected.
 *
 * @param {Object} handlers
 * @param {(complaint) => void} [handlers.onCreated]
 * @param {(payload: {complaintId, status, remarks}) => void} [handlers.onStatusUpdated]
 * @param {(payload: {complaintId, level, reason}) => void} [handlers.onEscalated]
 * @param {{wardId?: string|number, userId?: string}} [rooms]
 */
export function useComplaintSocket(handlers = {}, rooms = {}) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      if (rooms.wardId) socket.emit('join_ward', rooms.wardId);
      if (rooms.userId) socket.emit('join_user', rooms.userId);
    });

    socket.on('complaint_created', (complaint) => handlersRef.current.onCreated?.(complaint));
    socket.on('complaint_status_updated', (payload) => handlersRef.current.onStatusUpdated?.(payload));
    socket.on('complaint_escalated', (payload) => handlersRef.current.onEscalated?.(payload));

    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms.wardId, rooms.userId]);
}
