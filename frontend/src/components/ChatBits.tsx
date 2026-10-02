import { BookOpen, Headset, TriangleAlert } from "lucide-react";
import type { ChatMessage } from "../api/types";
import { cn } from "../utils/cn";
import { Mascot } from "./Logo";
import { IconBadge } from "./ui";

export function TypingIndicator() {
  return (
    <div className="flex items-end gap-2" role="status" aria-label="AI is typing">
      <Mascot size={28} glow={false} />
      <div className="flex items-center gap-1 rounded-xl rounded-bl-sm border border-line bg-card3 px-3.5 py-3">
        {[0, 1, 2].map((i) => <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-primary" style={{ animationDelay: `${i * 150}ms` }} />)}
      </div>
    </div>
  );
}

export function MessageBubble({ message, compact = false }: { message: ChatMessage; compact?: boolean }) {
  const mine = message.role === "customer";
  const agent = message.role === "agent";
  return (
    <div className={cn("flex gap-2 animate-fade-up", mine ? "justify-end" : "justify-start")}>
      {!mine && (agent ? <IconBadge icon={Headset} tone="warn" size="sm" className="mt-0.5 h-7 w-7" /> : <Mascot size={compact ? 28 : 32} glow={false} className="mt-0.5" />)}
      <div className={cn("flex min-w-0 max-w-[85%] flex-col", mine ? "items-end" : "items-start")}>
        <div
          className={cn(
            "whitespace-pre-line break-words rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed",
            mine ? "rounded-br-sm border border-primary/30 bg-primary/15 text-ink" : agent ? "rounded-tl-sm border border-warn/35 bg-warn/10 text-ink" : "rounded-tl-sm border border-line bg-card3 text-ink",
            message.streaming && "caret",
          )}
        >
          {message.text}
        </div>
        {message.citations && message.citations.length > 0 && (
          <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Knowledge base sources">
            {message.citations.map((c) => (
              <li key={c.title} className="flex items-center gap-1.5 rounded-md border border-ai/30 bg-ai/10 px-2 py-1 text-[11px] text-[#c4b5fd]">
                <BookOpen size={11} aria-hidden="true" />
                {c.title}
                <span className="text-mute">{Math.round(c.score * 100)}%</span>
              </li>
            ))}
          </ul>
        )}
        {message.escalated && !agent && (
          <p className="mt-1.5 flex items-center gap-1.5 rounded-md border border-warn/40 bg-warn/10 px-2 py-1 text-[11px] text-warn">
            <TriangleAlert size={11} aria-hidden="true" /> Escalated to human agent
          </p>
        )}
        {message.time && <span className="mt-1 text-[10px] text-dim">{message.time}</span>}
      </div>
    </div>
  );
}
