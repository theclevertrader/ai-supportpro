import { ArrowDown, ArrowUp, Bot, Coins, CircleCheck, Database, MessageSquare, Smile, Target, Ticket, Timer, TrendingUp, type LucideIcon } from "lucide-react";
import type { MetricDTO, MetricIcon } from "../api/types";
import { cn } from "../utils/cn";
import { Sparkline } from "./Sparkline";
import { Badge, IconBadge, Panel, Skeleton } from "./ui";

function GroundingIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 19L9.5 5L15 19" />
      <path d="M6 14.5H13" />
      <path d="M19 7V15" strokeWidth="2.6" />
      <circle cx="19" cy="18.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

const ICONS: Record<MetricIcon, LucideIcon | typeof GroundingIcon> = {
  conversations: MessageSquare, grounding: GroundingIcon, tickets: Ticket, knowledge: Database, tokens: Target,
  resolution: CircleCheck, clock: Timer, automation: Bot, escalation: TrendingUp, csat: Smile, cost: Coins,
};

export function MetricCard({ metric, className }: { metric: MetricDTO; className?: string }) {
  const { title, value, delta, deltaLabel, tone, series, icon, badge, goodWhen = "up" } = metric;
  const flat = delta === 0;
  const good = goodWhen === "up" ? delta > 0 : delta < 0;
  const Arrow = delta < 0 ? ArrowDown : ArrowUp;
  return (
    <Panel hover className={cn("relative overflow-hidden p-4", className)} aria-label={`${title}: ${value}`}>
      <div className="flex items-start gap-3">
        <IconBadge icon={ICONS[icon]} tone={tone} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-medium text-ink">{title}</h3>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p className="truncate text-[32px] font-bold leading-[1.15] tracking-tight text-ink">{value}</p>
            {badge && <Badge tone="cyan" className="shrink-0 !rounded-md text-[10px]">{badge}</Badge>}
          </div>
        </div>
      </div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="shrink-0 pb-1 leading-tight">
          <p className={cn("flex items-center gap-1 text-[13px] font-semibold", flat ? "text-mute" : good ? "text-mint" : "text-danger")}>
            <Arrow size={14} strokeWidth={2.5} aria-hidden="true" />
            {Math.abs(delta)}%
          </p>
          <p className="text-[11px] text-mute">{deltaLabel}</p>
        </div>
        <Sparkline data={series} tone={tone} className="h-11 w-[58%] max-w-[170px]" label={`${title} trend`} />
      </div>
    </Panel>
  );
}

export const MetricCardSkeleton = () => (
  <Panel className="p-4">
    <div className="flex gap-3"><Skeleton className="h-12 w-12 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-8 w-1/2" /></div></div>
    <div className="mt-3 flex justify-between"><Skeleton className="h-8 w-20" /><Skeleton className="h-10 w-28" /></div>
  </Panel>
);
