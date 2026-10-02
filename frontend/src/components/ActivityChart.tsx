import { Activity } from "lucide-react";
import type { ActivityPoint } from "../api/types";
import { BarChart, type BarSeries } from "./BarChart";
import { Panel, PanelHeader } from "./ui";

const SERIES: BarSeries[] = [
  { key: "conversations", label: "Conversations", tone: "cyan" },
  { key: "escalated", label: "Escalated Tickets", tone: "warn" },
];

/** Dashboard timeline. Pure view over `ActivityPoint[]` returned by /api/dashboard. */
export function ActivityChart({ data, className }: { data: ActivityPoint[]; className?: string }) {
  return (
    <Panel className={className ?? "p-4 sm:p-5"}>
      <PanelHeader
        icon={Activity} title="Live Activity Timeline" suffix="(5-Day Rolling)"
        subtitle="Aggregated directly from database conversation & ticket records"
        action={
          <span className="hidden items-center gap-2 rounded-full border border-mint/50 bg-mint/10 px-3 py-1 text-xs font-medium text-mint shadow-[0_0_14px_rgba(0,229,168,0.15)] sm:inline-flex">
            <span className="h-2 w-2 animate-pulse-dot rounded-full bg-mint text-mint" aria-hidden="true" />Live DB Aggregate
          </span>
        }
      />
      <BarChart
        className="mt-4" height={160} ariaLabel="Conversations and escalated tickets over the last five days"
        series={SERIES} data={data.map((d) => ({ label: d.label, values: { conversations: d.conversations, escalated: d.escalated } }))}
      />
    </Panel>
  );
}
