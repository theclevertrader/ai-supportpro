import { mockRequest, mockAnswer } from "./mock";
import type { ChatAnswer } from "./types";

/**
 * Single HTTP entry point for the UI.
 *  - Set VITE_API_BASE to hit the real backend (cookies/session auth + tenant header).
 *  - When unset, a local mock transport with identical JSON contracts is used.
 */
const env = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {});
export const API_BASE = env.VITE_API_BASE;
export const WS_URL = env.VITE_WS_URL;

let tenantId = "acme";
export const setActiveTenant = (id: string) => { tenantId = id; };
export const getActiveTenant = () => tenantId;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) { super(message); this.status = status; }
}

type StatsListener = (s: { latency: number; at: Date }) => void;
const listeners = new Set<StatsListener>();
export const subscribeApiStats = (fn: StatsListener) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const emit = (latency: number) => listeners.forEach((l) => l({ latency, at: new Date() }));

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const started = performance.now();
  try {
    const url = API_BASE ? `${API_BASE}${path}` : path;
    const res = await fetch(url, {
      credentials: "include",
      ...init,
      headers: { "Content-Type": "application/json", "X-Tenant-ID": tenantId, ...(init.headers ?? {}) },
    });
    if (!res.ok) throw new ApiError(res.statusText || "Request failed", res.status);
    const data = (await res.json()) as T;
    emit(Math.round(performance.now() - started));
    return data;
  } catch (e) {
    // If backend is offline or route errors, fallback gracefully to mock
    try {
      const data = await mockRequest<T>(path, init);
      emit(Math.round(performance.now() - started));
      return data;
    } catch {
      if (e instanceof ApiError) throw e;
      throw new ApiError(e instanceof Error ? e.message : "Network error");
    }
  }
}

export const post = <T>(path: string, body: unknown) => api<T>(path, { method: "POST", body: JSON.stringify(body) });
export const put = <T>(path: string, body: unknown) => api<T>(path, { method: "PUT", body: JSON.stringify(body) });
export const del = <T>(path: string) => api<T>(path, { method: "DELETE" });

/** Streams an AI answer. Tries live SSE backend first, then falls back to mock if unreachable. */
export async function streamChat(
  prompt: string,
  handlers: { onToken: (t: string) => void; onDone: (meta: ChatAnswer) => void; signal?: AbortSignal },
): Promise<void> {
  const { onToken, onDone, signal } = handlers;
  try {
    const url = API_BASE ? `${API_BASE}/api/ai/chat` : "/api/ai/chat";
    const res = await fetch(url, {
      method: "POST", credentials: "include", signal,
      headers: { "Content-Type": "application/json", "X-Tenant-ID": tenantId, Accept: "text/event-stream" },
      body: JSON.stringify({ message: prompt }),
    });
    if (!res.ok || !res.body) throw new ApiError("Stream failed", res.status);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let text = "";
    let meta: ChatAnswer = { text: "", citations: [], escalate: false };
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split("\n\n");
      buf = parts.pop() ?? "";
      for (const part of parts) {
        const line = part.replace(/^data:\s*/, "");
        try {
          const evt = JSON.parse(line) as { token?: string; citations?: ChatAnswer["citations"]; escalate?: boolean };
          if (evt.token) { text += evt.token; onToken(evt.token); }
          if (evt.citations) meta.citations = evt.citations;
          if (evt.escalate) meta.escalate = true;
        } catch { /* ignore keep-alive */ }
      }
    }
    meta = { ...meta, text };
    onDone(meta);
    return;
  } catch {
    // Offline mock stream fallback
    await new Promise((r) => setTimeout(r, 650));
    const answer = mockAnswer(prompt);
    const words = answer.text.split(/(\s+)/);
    for (const w of words) {
      if (signal?.aborted) return;
      onToken(w);
      await new Promise((r) => setTimeout(r, 22));
    }
    onDone(answer);
  }
}
