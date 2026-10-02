import { useCallback, useRef, useState } from "react";
import { streamChat } from "../api/client";
import type { ChatMessage } from "../api/types";

export type ChatPhase = "idle" | "typing" | "streaming";

const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
let uid = 0;
const id = () => `local-${Date.now()}-${uid++}`;

/** Shared chat controller used by the dashboard widget and Live Chat page. */
export function useChatStream(initial: ChatMessage[] = []) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [phase, setPhase] = useState<ChatPhase>("idle");
  const [escalated, setEscalated] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const send = useCallback(async (text: string) => {
    const clean = text.trim();
    if (!clean || phase !== "idle") return;
    const aiId = id();
    setMessages((m) => [...m, { id: id(), role: "customer", text: clean, time: now() }]);
    setPhase("typing");
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      await streamChat(clean, {
        signal: ctrl.signal,
        onToken: (t) => {
          setPhase("streaming");
          setMessages((m) => {
            const exists = m.some((x) => x.id === aiId);
            return exists
              ? m.map((x) => (x.id === aiId ? { ...x, text: x.text + t } : x))
              : [...m, { id: aiId, role: "ai", text: t, time: now(), streaming: true }];
          });
        },
        onDone: (meta) => {
          setMessages((m) => m.map((x) => (x.id === aiId ? { ...x, streaming: false, citations: meta.citations, escalated: meta.escalate } : x)));
          if (meta.escalate) setEscalated(true);
        },
      });
    } catch {
      setMessages((m) => [...m, { id: id(), role: "ai", text: "Sorry, I couldn't reach the AI service. Please try again.", time: now() }]);
    } finally {
      setPhase("idle");
    }
  }, [phase]);

  const clear = useCallback(() => { abort.current?.abort(); setMessages([]); setPhase("idle"); setEscalated(false); }, []);
  const handoff = useCallback(() => {
    setEscalated(true);
    setMessages((m) => [...m, { id: id(), role: "agent", text: "Conversation handed off to a human agent. Priya Nair has been notified and will join shortly.", time: now(), escalated: true }]);
  }, []);

  return { messages, phase, escalated, send, clear, handoff };
}
