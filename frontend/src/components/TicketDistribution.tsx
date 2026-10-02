import { ChartPie } from "lucide-react";
import type { CategoryStat } from "../api/types";
import { useApp } from "../context/AppContext";
import { toneHex, toneHex2 } from "../lib/tone";
import { Panel, PanelHeader, ViewAll } from "./ui";

export function TicketDistribution({ data }: { data: CategoryStat[] }) {
  const { navigate } = useApp();
  return (
    <Panel className="flex flex-col p-4 sm:p-5">
      <PanelHeader icon={ChartPie} title="Ticket Category Distribution" action={<ViewAll onClick={() => navigate("tickets")} />} />
      <ul className="mt-4 flex flex-1 flex-col justify-between gap-3">
        {data.map((c) => (
          <li key={c.name}>
            <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
              <span className="font-medium tracking-wide text-ink">{c.name}</span>
              <span className="text-ink/90">{c.count} <span className="text-mute">({c.percent}%)</span></span>
            </div>
            <div role="progressbar" aria-label={`${c.name} share`} aria-valuenow={c.percent} aria-valuemin={0} aria-valuemax={100} className="h-2 w-full overflow-hidden rounded-full bg-white/[0.07]">
              <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${c.percent}%`, background: `linear-gradient(90deg, ${toneHex2[c.tone] === toneHex[c.tone] ? toneHex[c.tone] : toneHex[c.tone]}, ${toneHex2[c.tone]})`, boxShadow: `0 0 10px ${toneHex[c.tone]}66` }} />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
