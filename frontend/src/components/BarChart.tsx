import { useState } from "react";
import { cn } from "../utils/cn";
import { toneHex, toneHex2, type Tone } from "../lib/tone";

export interface BarSeries { key: string; label: string; tone: Tone }
export interface BarDatum { label: string; values: Record<string, number> }

/**
 * Reusable grouped bar chart. Pure presentation: feed it rows from any API.
 * Hover / focus a column to see a tooltip. Fully responsive (percent based).
 */
export function BarChart({ data, series, height = 170, className, ariaLabel }: { data: BarDatum[]; series: BarSeries[]; height?: number; className?: string; ariaLabel: string }) {
  const [active, setActive] = useState<number | null>(null);
  const rawMax = Math.max(1, ...data.flatMap((d) => series.map((s) => d.values[s.key] ?? 0)));
  const step = rawMax <= 10 ? 4 : Math.ceil(rawMax / 4 / 5) * 5;
  const top = step * 4 > rawMax * 1.05 ? step * 4 : step * 5;
  const ticks = [0, 1, 2, 3, 4].map((i) => (top / 4) * i);

  return (
    <div className={cn("w-full", className)}>
      <div className="relative" style={{ height }} role="img" aria-label={ariaLabel}>
        {/* grid */}
        <div className="pointer-events-none absolute inset-0">
          {ticks.map((t) => (
            <div key={t} className="absolute left-0 right-0 border-t border-white/[0.06]" style={{ bottom: `${(t / top) * 100}%` }} />
          ))}
        </div>
        {/* bars */}
        <div className="relative flex h-full items-end justify-around px-1">
          {data.map((d, i) => (
            <div
              key={d.label}
              tabIndex={0}
              onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)} onBlur={() => setActive(null)}
              aria-label={`${d.label}: ${series.map((s) => `${s.label} ${d.values[s.key] ?? 0}`).join(", ")}`}
              className={cn("relative flex h-full flex-1 items-end justify-center gap-1 rounded-md transition-colors sm:gap-1.5", active === i && "bg-primary/[0.06]")}
            >
              {series.map((s, si) => {
                const v = d.values[s.key] ?? 0;
                return (
                  <div key={s.key} className="relative flex h-full w-[26%] max-w-[26px] min-w-[10px] flex-col items-center justify-end">
                    <span className="mb-1 text-[11px] font-semibold leading-none text-ink">{v}</span>
                    <div
                      className="bar-anim w-full rounded-t-[3px]"
                      style={{ height: `${(v / top) * 100}%`, minHeight: 2, animationDelay: `${i * 70 + si * 40}ms`, background: `linear-gradient(180deg, ${toneHex[s.tone]}, ${toneHex2[s.tone]})`, boxShadow: `0 0 14px ${toneHex[s.tone]}40` }}
                    />
                  </div>
                );
              })}
              {active === i && (
                <div role="tooltip" className="pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-line bg-card3 px-3 py-2 text-xs shadow-xl">
                  <p className="mb-1 font-semibold text-ink">{d.label}</p>
                  {series.map((s) => (
                    <p key={s.key} className="flex items-center gap-2 text-mute">
                      <span className="h-2 w-2 rounded-full" style={{ background: toneHex[s.tone] }} />
                      {s.label}: <b className="text-ink">{d.values[s.key] ?? 0}</b>
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* x labels */}
      <div className="mt-2 flex justify-around px-1">
        {data.map((d) => <span key={d.label} className="flex-1 text-center text-xs text-ink/90">{d.label}</span>)}
      </div>
      {/* legend */}
      <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-xs text-ink/90">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: toneHex[s.tone], boxShadow: `0 0 8px ${toneHex[s.tone]}` }} />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
