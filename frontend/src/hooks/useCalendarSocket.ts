// useCalendarSocket.ts
// Connects to the backend socket.io server, joins the calendar:updates room,
// and calls onCalendarUpdate whenever marketing staff mutates a schedule or
// the auto-publish job publishes content.

import { useEffect, useRef } from 'react';
import { io as socketIO, type Socket } from 'socket.io-client';
import { getAccessToken } from '../utils/tokenHelper';

const SOCKET_URL =
  (import.meta.env.VITE_SOCKET_URL as string | undefined) || 'http://localhost:5000';

export function useCalendarSocket(
  onCalendarUpdate: (year: number, month: number) => void,
) {
  // Keep a stable ref so the effect never needs to re-run on callback identity changes
  const cbRef = useRef(onCalendarUpdate);
  cbRef.current = onCalendarUpdate;

  useEffect(() => {
    const socket: Socket = socketIO(SOCKET_URL, {
      auth: { token: getAccessToken() ?? '' },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      socket.emit('calendar:join-updates');
    });

    socket.on('calendar:updated', ({ year, month }: { year: number; month: number }) => {
      cbRef.current(year, month);
    });

    socket.on('connect_error', (err: Error) => {
      console.warn('[useCalendarSocket] connect error:', err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, []); // stable — connect once per component mount
}
