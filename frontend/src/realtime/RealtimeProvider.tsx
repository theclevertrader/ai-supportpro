import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { WS_URL, subscribeApiStats } from "../api/client";

/**
 * Realtime abstraction.
 *  - VITE_WS_URL set  → WebSocket transport (live tickets, notifications, chat events).
 *  - otherwise        → HTTP-only mode; latency & freshness come from real API round-trips.
 * Components subscribe to channels via `subscribe("tickets", handler)`.
 */
type Handler = (payload: unknown) => void;
type Status = "connecting" | "live" | "offline";

interface RealtimeValue {
  status: Status;
  latency: number | null;
  lastUpdated: Date | null;
  transport: "websocket" | "http";
  subscribe: (channel: string, h: Handler) => () => void;
}

const Ctx = createContext<RealtimeValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(WS_URL ? "connecting" : "connecting");
  const [latency, setLatency] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const channels = useRef(new Map<string, Set<Handler>>());

  useEffect(() => subscribeApiStats(({ latency: l, at }) => {
    setLatency(l);
    setLastUpdated(at);
    if (!WS_URL) setStatus("live");
  }), []);

  useEffect(() => {
    const url = WS_URL;
    if (!url) return;
    let ws: WebSocket | null = null;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout>;
    let closed = false;
    const connect = () => {
      setStatus("connecting");
      ws = new WebSocket(url);
      ws.onopen = () => { retry = 0; setStatus("live"); ws?.send(JSON.stringify({ type: "ping", t: Date.now() })); };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as { channel?: string; type?: string; t?: number; payload?: unknown };
          if (msg.type === "pong" && msg.t) setLatency(Date.now() - msg.t);
          if (msg.channel) { channels.current.get(msg.channel)?.forEach((h) => h(msg.payload)); setLastUpdated(new Date()); }
        } catch { /* ignore */ }
      };
      ws.onclose = () => {
        setStatus("offline");
        if (!closed) timer = setTimeout(connect, Math.min(1000 * 2 ** retry++, 15000));
      };
    };
    connect();
    return () => { closed = true; clearTimeout(timer); ws?.close(); };
  }, []);

  const value = useMemo<RealtimeValue>(() => ({
    status, latency, lastUpdated,
    transport: WS_URL ? "websocket" : "http",
    subscribe: (channel, h) => {
      const set = channels.current.get(channel) ?? new Set<Handler>();
      set.add(h);
      channels.current.set(channel, set);
      return () => { set.delete(h); };
    },
  }), [status, latency, lastUpdated]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRealtime() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useRealtime must be used within RealtimeProvider");
  return v;
}
