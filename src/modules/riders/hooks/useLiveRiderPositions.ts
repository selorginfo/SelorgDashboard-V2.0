import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { getSocket } from "@/lib/socket";

export interface LiveRiderPosition {
  riderId: string;
  lat: number;
  lng: number;
  ts: number;
}

/**
 * Fetches the current set of active rider GPS positions from Redis-backed
 * /rider/live-positions, then keeps them fresh by subscribing to Socket.IO
 * `rider:location` broadcasts. Positions older than 90s are dropped so the
 * map doesn't retain ghost pins after a rider goes offline.
 */
export function useLiveRiderPositions(pollMs = 30_000): LiveRiderPosition[] {
  const [positions, setPositions] = useState<LiveRiderPosition[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function pull() {
      try {
        const res = await api.get<{ data?: { riders?: LiveRiderPosition[] } } | { riders?: LiveRiderPosition[] }>(
          "/api/v1/rider/live-positions",
        );
        const list =
          (res as { data?: { riders?: LiveRiderPosition[] } }).data?.riders ??
          (res as { riders?: LiveRiderPosition[] }).riders ??
          [];
        if (!cancelled) setPositions(list);
      } catch {
        /* backend not reachable — stay with whatever we have */
      }
    }

    pull();
    const interval = window.setInterval(pull, pollMs);

    const socket = getSocket();
    const handler = (payload: LiveRiderPosition) => {
      setPositions((prev) => {
        const others = prev.filter((p) => p.riderId !== payload.riderId);
        return [...others, payload];
      });
    };
    socket?.on("rider:location", handler);

    // Sweep stale entries (no update in 90s) every 15s so pins don't linger.
    const sweep = window.setInterval(() => {
      const cutoff = Date.now() - 90_000;
      setPositions((prev) => prev.filter((p) => p.ts >= cutoff));
    }, 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearInterval(sweep);
      socket?.off("rider:location", handler);
    };
  }, [pollMs]);

  return positions;
}
