import { ChevronRight, MessageSquareText } from "lucide-react";
import type { ConversationDTO } from "../api/types";
import { useApp } from "../context/AppContext";
import { Avatar, EmptyState, Panel, PanelHeader, ViewAll } from "./ui";

type Row = Omit<ConversationDTO, "messages">;

export function ConversationList({ data }: { data: Row[] }) {
  const { navigate } = useApp();
  return (
    <Panel className="flex flex-col p-4">
      <PanelHeader icon={MessageSquareText} title="Recent Conversations" action={<ViewAll onClick={() => navigate("chat")} />} />
      {data.length === 0 ? <EmptyState title="No conversations yet" message="New customer chats will appear here in real time." /> : (
        <ul className="mt-3 flex flex-1 flex-col justify-between divide-y divide-white/[0.05]">
          {data.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => navigate("chat")} title={`${c.customer} — ${c.type}`}
                className="group flex w-full items-center gap-3 rounded-lg px-1 py-2.5 text-left transition hover:bg-primary/[0.06]">
                <Avatar name={c.customer} tone={c.tone} size={38} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink">
                    {c.customer}{c.type.includes("VIP") ? ` (${c.type})` : <span className="sr-only"> ({c.type})</span>}
                  </span>
                  <span className="block truncate text-xs text-mute">{c.preview}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-mute">
                  <span className={c.unread ? "h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_6px_#00e5a8]" : "h-1.5 w-1.5 rounded-full bg-mint/60"} aria-label={c.unread ? "Unread" : "Online"} />
                  {c.time}
                  <ChevronRight size={15} className="transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
