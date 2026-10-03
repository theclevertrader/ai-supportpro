import { mockRequest, mockAnswer } from "./mock";
import type { ChatAnswer } from "./types";

/**
 * Single HTTP entry point for the UI.
 *  - Set VITE_API_BASE to hit the real FastAPI backend (JWT Bearer auth + tenant header).
 *  - When VITE_API_BASE is set or in production, mock fallback is strictly disabled.
 */
const env = ((import.meta as unknown as { env?: Record<string, string | boolean | undefined> }).env ?? {});
export const API_BASE = (env.VITE_API_BASE as string) || "";
export const WS_URL = (env.VITE_WS_URL as string) || "";
export const IS_PROD = env.MODE === "production" || env.PROD === true;

// Mock is ONLY allowed in local offline development if VITE_API_BASE is completely unset
export const ALLOW_MOCK = !IS_PROD && !API_BASE && env.VITE_ENABLE_MOCK !== "false";

const TOKEN_KEY = "aisp_auth_token";
let authToken: string | null = typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (typeof localStorage !== "undefined") {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }
};
export const getAuthToken = () => authToken;

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

type MockListener = (active: boolean) => void;
const mockListeners = new Set<MockListener>();
let mockInUse = false;
export const subscribeMockStatus = (fn: MockListener) => {
  mockListeners.add(fn);
  fn(mockInUse);
  return () => { mockListeners.delete(fn); };
};
const setMockInUse = (inUse: boolean) => {
  if (mockInUse !== inUse) {
    mockInUse = inUse;
    mockListeners.forEach((l) => l(inUse));
  }
};
export const isMockActive = () => mockInUse;

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const started = performance.now();
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Tenant-ID": tenantId,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((init.headers as Record<string, string>) ?? {}),
  };

  try {
    const url = API_BASE ? `${API_BASE}${path}` : path;
    const res = await fetch(url, {
      credentials: "include",
      ...init,
      headers,
    });
    if (!res.ok) throw new ApiError(res.statusText || "Request failed", res.status);
    const data = (await res.json()) as T;
    setMockInUse(false);
    emit(Math.round(performance.now() - started));
    return data;
  } catch (e) {
    // If backend is configured or in production, do NOT mask failures with mock data!
    if (!ALLOW_MOCK) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(e instanceof Error ? e.message : "Network error");
    }

    // Local offline development fallback only
    try {
      setMockInUse(true);
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

/** Streams an AI answer. Tries live SSE backend first. Falls back to mock ONLY in offline dev mode. */
export async function streamChat(
  prompt: string,
  handlers: { onToken: (t: string) => void; onDone: (meta: ChatAnswer) => void; signal?: AbortSignal },
): Promise<void> {
  const { onToken, onDone, signal } = handlers;
  const token = getAuthToken();
  try {
    const url = API_BASE ? `${API_BASE}/api/ai/chat` : "/api/ai/chat";
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      signal,
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-ID": tenantId,
        Accept: "text/event-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message: prompt }),
    });
    if (!res.ok || !res.body) throw new ApiError("Stream failed", res.status);
    setMockInUse(false);
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
  } catch (err) {
    if (!ALLOW_MOCK) {
      throw err instanceof Error ? err : new Error("Failed to stream AI response from backend");
    }
    // Offline mock stream fallback for offline dev
    setMockInUse(true);
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

