import { io, Socket } from "socket.io-client";
import { getToken } from "./apiClient";

const SOCKET_URL =
  (import.meta.env["VITE_SOCKET_URL"] as string | undefined) ||
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ||
  (import.meta.env["VITE_API_URL"] as string | undefined) ||
  "http://localhost:3333";

let socket: Socket | null = null;

/**
 * Lazily open a Socket.IO connection using the current admin JWT. Callers
 * are expected to be inside a React tree — pair with `useEffect` cleanup
 * that just removes their listeners (do NOT disconnect here since the
 * singleton is shared across pages).
 */
export function getSocket(): Socket | null {
  const token = getToken();
  if (!token) return null;
  if (socket && socket.connected) return socket;
  if (socket && !socket.connected) {
    socket.auth = { token };
    socket.connect();
    return socket;
  }
  socket = io(SOCKET_URL, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    transports: ["websocket", "polling"],
  });
  return socket;
}

/** Force-close the connection (used on logout). */
export function closeSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
