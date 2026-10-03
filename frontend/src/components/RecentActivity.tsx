import { BookOpen, Clock, DatabaseBackup, Info, ShieldCheck, Sparkles, Ticket, UserPlus, type LucideIcon } from "lucide-react";
import type { FeedEvent, FeedKind } from "../api/types";
import type { Tone } from "../lib/tone";
import { EmptyState, IconBadge, Panel, PanelHeader, ViewAll } from "./ui";

const DEFAULT_KIND = { icon: Clock, tone: "cyan" as Tone };

const KIND: Record<FeedKind, { icon: LucideIcon; tone: Tone }> = {
  ticket: { icon: Ticket, tone: "danger" },
  ai: { icon: Sparkles, tone: "blue" },
  kb: { icon: BookOpen, tone: "mint" },
  customer: { icon: UserPlus, tone: "warn" },
  backup: { icon: DatabaseBackup, tone: "ai" },
  security: { icon: ShieldCheck, tone: "mint" },
  info: { icon: Info, tone: "cyan" },
};

export function RecentActivity({ data }: { data: FeedEvent[] }) {
  return (
    <Panel className="flex flex-col p-4">
      <PanelHeader icon={Clock} title="Recent Activity" action={<ViewAll />} />
      {data.length === 0 ? <EmptyState title="No recent activity" /> : (
        <ol className="mt-3 flex flex-1 flex-col justify-between gap-2">
          {data.map((e) => {
            const k = KIND[e.kind] ?? DEFAULT_KIND;
            return (
              <li key={e.id} className="flex items-center gap-3">
                <IconBadge icon={k.icon} tone={k.tone} size="sm" className="h-9 w-9" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink">{e.title}</p>
                  <p className="truncate text-[11px] text-mute">{e.detail}</p>
                </div>
                <time className="shrink-0 text-[11px] text-mute">{e.time}</time>
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}
