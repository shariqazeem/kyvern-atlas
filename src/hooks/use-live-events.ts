"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./use-auth";

interface LiveEvent {
  id: string;
  timestamp: string;
  endpoint: string;
  amount_usd: number;
  payer_address: string;
  status: string;
  tx_hash: string | null;
  network: string | null;
  source: string;
}

export function useLiveEvents() {
  const { isAuthenticated } = useAuth();
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [newEventCount, setNewEventCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!isAuthenticated) return;
    if (eventSourceRef.current) return; // Already connected

    const es = new EventSource("/api/pulse/stream", {
      withCredentials: true,
    });
    eventSourceRef.current = es;

    es.addEventListener("connected", () => {
      setIsConnected(true);
    });

    es.addEventListener("new-events", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.events && data.events.length > 0) {
          setLiveEvents((prev) => {
            const combined = [...data.events, ...prev];
            // Keep max 50 live events
            return combined.slice(0, 50);
          });
          setNewEventCount((prev) => prev + data.count);
        }
      } catch {
        // Ignore parse errors
      }
    });

    es.onerror = () => {
      setIsConnected(false);
      es.close();
      eventSourceRef.current = null;
      // Reconnect after 10 seconds
      reconnectTimeoutRef.current = setTimeout(connect, 10000);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    connect();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect]);

  const clearNewCount = useCallback(() => setNewEventCount(0), []);

  return { liveEvents, isConnected, newEventCount, clearNewCount };
}
