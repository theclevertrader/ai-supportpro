import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import type { ChatMessage } from "../api/types";
import { useChatStream } from "../hooks/useChatStream";
import { MessageBubble, TypingIndicator } from "./ChatBits";
import { Mascot } from "./Logo";
import { Panel } from "./ui";

const WELCOME: ChatMessage[] = [{ id: "welcome", role: "ai", text: "Hello! I'm your AI support assistant.\nHow can I help you today?" }];
const PROMPTS = ["Track my order", "Refund policy", "Shipping time", "Live agent"];

export function AIAssistant() {
  const chat = useChatStream(WELCOME);
  const [text, setText] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [chat.messages, chat.phase]);

  const submit = (e: FormEvent) => { e.preventDefault(); chat.send(text); setText(""); };
  const busy = chat.phase !== "idle";

  return (
    <Panel className="flex h-full min-h-[340px] flex-col p-4" aria-label="AI Assistant">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Mascot size={30} glow={false} />
          <h2 className="text-[15px] font-semibold">AI Assistant</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-mint/50 bg-mint/10 px-2.5 py-0.5 text-xs font-medium text-mint">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-mint text-mint" aria-hidden="true" />Live
        </span>
      </header>

      <div ref={scroller} role="log" aria-live="polite" aria-label="Conversation" className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: 250 }}>
        {chat.messages.map((m) => <MessageBubble key={m.id} message={m} compact />)}
        {chat.phase === "typing" && <TypingIndicator />}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 pl-9">
        {PROMPTS.map((p) => (
          <button key={p} type="button" disabled={busy} onClick={() => chat.send(p)}
            className="h-7 rounded-lg border border-line bg-primary/[0.04] px-3 text-xs text-ink transition hover:border-primary/50 hover:bg-primary/10 disabled:opacity-50">{p}</button>
        ))}
      </div>

      <form onSubmit={submit} className="field mt-3 flex h-12 items-center gap-2 pl-4 pr-1.5">
        <input value={text} onChange={(e) => setText(e.target.value)} aria-label="Message the AI assistant" placeholder="Type your message..." className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-mute" />
        <button type="submit" disabled={!text.trim() || busy} aria-label="Send message"
          className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-b from-primary to-blue text-[#021018] shadow-[0_0_16px_rgba(0,217,255,0.5)] transition hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:shadow-none">
          <Send size={16} aria-hidden="true" />
        </button>
      </form>
    </Panel>
  );
}
