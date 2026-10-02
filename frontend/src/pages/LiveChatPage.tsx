import { useEffect, useRef, useState, type FormEvent } from "react";
import { Eraser, Headset, Send, ShieldAlert, SlidersHorizontal, UserRound } from "lucide-react";
import type { ConversationDTO } from "../api/types";
import { MessageBubble, TypingIndicator } from "../components/ChatBits";
import { Avatar, Badge, Button, IconBadge, Panel, PanelHeader, PillButton, SearchField, Select, StatusIndicator, Toggle } from "../components/ui";
import { useChatStream } from "../hooks/useChatStream";
import type { Tone } from "../lib/tone";
import { cn } from "../utils/cn";

const SENT: Record<ConversationDTO["sentiment"], Tone> = { Positive: "mint", Neutral: "warn", Negative: "danger" };
const SUGGESTIONS = ["Track my order", "Refund policy", "Shipping time", "Live agent"];

function ActiveConversation({ conv, list, onSelect }: { conv: ConversationDTO; list: ConversationDTO[]; onSelect: (id: string) => void }) {
  const chat = useChatStream(conv.messages);
  const [text, setText] = useState("");
  const [auto, setAuto] = useState({ reply: true, grounding: true, escalate: true, stream: true });
  const [threshold, setThreshold] = useState(60);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }, [chat.messages, chat.phase]);
  const busy = chat.phase !== "idle";
  const submit = (e: FormEvent) => { e.preventDefault(); chat.send(text); setText(""); };
  const sources = [...chat.messages].reverse().find((m) => m.citations?.length)?.citations ?? [];

  return (
    <>
      {/* Active conversation */}
      <Panel className="flex h-[640px] min-w-0 flex-col overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={conv.customer} tone={conv.tone} size={40} online={conv.online} />
            <div className="min-w-0">
              <Select label="Select customer" value={conv.customer} options={list.map((l) => l.customer)} onChange={(name) => { const t = list.find((l) => l.customer === name); if (t) onSelect(t.id); }} className="h-8 border-transparent bg-transparent" />
              <p className="px-1 text-[11px] text-mute">{conv.type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {chat.escalated && <Badge tone="warn" dot>Escalated</Badge>}
            <Button variant="warn" icon={Headset} onClick={chat.handoff} disabled={chat.escalated}>Human Handoff</Button>
            <Button icon={Eraser} onClick={chat.clear}>Clear</Button>
          </div>
        </div>

        {chat.escalated && (
          <div role="alert" className="flex items-center gap-2 border-b border-warn/30 bg-warn/10 px-4 py-2 text-xs text-warn">
            <ShieldAlert size={14} aria-hidden="true" /> This conversation has been escalated. AI replies are paused while an agent is assigned.
          </div>
        )}

        <div ref={scroller} role="log" aria-live="polite" aria-label="Conversation messages" className="flex-1 space-y-4 overflow-y-auto p-4">
          {chat.messages.length === 0 && <p className="grid h-full place-items-center text-sm text-mute">Conversation cleared. Send a message to start again.</p>}
          {chat.messages.map((m) => <MessageBubble key={m.id} message={m} />)}
          {chat.phase === "typing" && <TypingIndicator />}
        </div>

        <div className="border-t border-line p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => <PillButton key={s} disabled={busy || chat.escalated} onClick={() => chat.send(s)} className="disabled:opacity-50">{s}</PillButton>)}
          </div>
          <form onSubmit={submit} className="field flex h-12 items-center gap-2 pl-4 pr-1.5">
            <input value={text} onChange={(e) => setText(e.target.value)} aria-label="Type your message" placeholder="Type your message..." className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-mute" />
            <button type="submit" disabled={!text.trim() || busy} aria-label="Send message" className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-b from-primary to-blue text-[#021018] shadow-[0_0_16px_rgba(0,217,255,0.5)] transition active:scale-95 disabled:opacity-50 disabled:shadow-none"><Send size={16} aria-hidden="true" /></button>
          </form>
        </div>
      </Panel>

      {/* Right column */}
      <div className="space-y-4 lg:col-span-2 xl:col-span-1 xl:h-[640px] xl:overflow-y-auto xl:pr-1">
        <Panel className="p-4">
          <PanelHeader icon={UserRound} title="Customer information" />
          <dl className="mt-4 space-y-3 text-[13px]">
            {[["Name", conv.customer], ["Email", conv.email], ["Plan", conv.plan]].map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-mute">{k}</dt><dd className="truncate font-medium">{v}</dd></div>)}
            <div className="flex justify-between"><dt className="text-mute">Sentiment</dt><dd><Badge tone={SENT[conv.sentiment]} dot>{conv.sentiment}</Badge></dd></div>
            <div className="flex justify-between"><dt className="text-mute">Status</dt><dd><StatusIndicator status={conv.online ? "online" : "offline"} label={conv.online ? "Online" : "Offline"} /></dd></div>
          </dl>
        </Panel>

        <Panel className="p-4">
          <PanelHeader icon={SlidersHorizontal} tone="ai" title="AI assistant controls" />
          <ul className="mt-4 space-y-3 text-[13px]">
            {([["reply", "Auto-reply"], ["grounding", "Ground answers in Knowledge Base"], ["escalate", "Auto escalation"], ["stream", "Streaming responses"]] as const).map(([k, label]) => (
              <li key={k} className="flex items-center justify-between gap-3"><span>{label}</span><Toggle label={label} checked={auto[k]} onChange={(v) => setAuto({ ...auto, [k]: v })} /></li>
            ))}
          </ul>
          <label className="mt-4 block text-xs text-mute">
            <span className="flex justify-between"><span>Escalate below confidence</span><b className="text-primary">{threshold}%</b></span>
            <input type="range" min={20} max={95} value={threshold} onChange={(e) => setThreshold(+e.target.value)} className="mt-2 w-full accent-[#00d9ff]" />
          </label>
        </Panel>

        <Panel className="p-4">
          <PanelHeader icon={ShieldAlert} tone="mint" title="Knowledge Base sources" subtitle="Used in the latest AI answer" />
          {sources.length === 0 ? <p className="mt-4 text-xs text-mute">No sources cited yet.</p> : (
            <ul className="mt-3 space-y-2">{sources.map((s) => <li key={s.title} className="flex items-center justify-between rounded-lg border border-ai/25 bg-ai/[0.07] px-3 py-2 text-xs"><span>{s.title}</span><b className={cn(s.score > 0.8 ? "text-mint" : "text-warn")}>{Math.round(s.score * 100)}%</b></li>)}</ul>
          )}
        </Panel>
      </div>
    </>
  );
}

export function LiveChat({ list }: { list: ConversationDTO[] }) {
  const [activeId, setActiveId] = useState(list[0]?.id);
  const [q, setQ] = useState("");
  const active = list.find((c) => c.id === activeId) ?? list[0];
  const shown = list.filter((c) => `${c.customer} ${c.preview}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="grid gap-4 lg:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[290px_minmax(0,1fr)_310px]">
      <Panel className="flex h-[260px] flex-col overflow-hidden lg:h-[640px]">
        <div className="space-y-3 border-b border-line p-3">
          <div className="flex items-center justify-between"><h2 className="text-[15px] font-semibold">Conversations</h2><Badge tone="mint" dot>{list.length} active</Badge></div>
          <SearchField value={q} onChange={setQ} placeholder="Search conversations..." />
        </div>
        <ul className="flex-1 overflow-y-auto p-2">
          {shown.map((c) => (
            <li key={c.id}>
              <button type="button" aria-current={c.id === active?.id} onClick={() => setActiveId(c.id)}
                className={cn("flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition", c.id === active?.id ? "border-primary/40 bg-primary/10 shadow-[0_0_16px_rgba(0,217,255,0.1)]" : "border-transparent hover:bg-white/5")}>
                <Avatar name={c.customer} tone={c.tone} size={38} online={c.online} />
                <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-[13px] font-semibold">{c.customer}</span><span className="shrink-0 text-[11px] text-mute">{c.time}</span></span><span className="block truncate text-xs text-mute">{c.preview}</span></span>
                {c.unread && <IconBadge icon={Headset} tone="mint" size="sm" className="hidden" />}
                {c.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary shadow-[0_0_8px_#00d9ff]" aria-label="Unread" />}
              </button>
            </li>
          ))}
        </ul>
      </Panel>
      {active && <ActiveConversation key={active.id} conv={active} list={list} onSelect={setActiveId} />}
    </div>
  );
}
