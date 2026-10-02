import { useState } from "react";
import { Brain, Sparkles, TrendingUp } from "lucide-react";
import type { GaugeDTO } from "../api/types";
import { RingGauge } from "./RingGauge";
import { Panel, PanelHeader, Select } from "./ui";

const RANGES = ["Today", "Last 7 Days", "Last 30 Days"] as const;

export function AIPerformance({ gauges, aiHandledPct, onRangeChange }: { gauges: GaugeDTO[]; aiHandledPct: number; onRangeChange?: (r: string) => void }) {
  const [range, setRange] = useState<(typeof RANGES)[number]>("Last 7 Days");
  return (
    <Panel className="flex flex-col p-4">
      <PanelHeader icon={Brain} title="AI Performance" action={<Select label="AI performance range" value={range} options={RANGES} onChange={(r) => { setRange(r); onRangeChange?.(r); }} className="h-8 text-xs" />} />
      <div className="mt-4 grid flex-1 grid-cols-2 place-items-center gap-4 sm:grid-cols-4">
        {gauges.map((g) => <RingGauge key={g.id} value={g.value} label={g.label} tone={g.tone} size={84} />)}
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-mint/30 bg-gradient-to-r from-mint/10 to-transparent p-3">
        <Sparkles size={26} className="shrink-0 text-warn drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-mint">AI is performing great!</p>
          <p className="text-[11px] leading-snug text-mute">Your AI assistant is handling {aiHandledPct}% of queries with high accuracy.</p>
        </div>
        <TrendingUp size={26} className="hidden shrink-0 text-mint/70 sm:block" aria-hidden="true" />
      </div>
    </Panel>
  );
}
