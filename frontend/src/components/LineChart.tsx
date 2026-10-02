import { useId, useState } from "react";
import { cn } from "../utils/cn";
import { toneHex, type Tone } from "../lib/tone";
import { smoothPath } from "./Sparkline";

export interface LineSeries { key: string; label: string; tone: Tone; values: number[] }

/** Responsive multi-series area/line chart with hover tooltip. */
export function LineChart({ labels, series, height = 200, className, ariaLabel, format = (n) => String(n), area = true }: {
  labels: string[]; series: LineSeries[]; height?: number; className?: string; ariaLabel: string; format?: (n: number) => string; area?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const [active, setActive] = useState<number | null>(null);
  const all = series.flatMap((s) => s.values);
  const min = Math.min(...all), max = Math.max(...all);
  const lo = Math.max(0, min - (max - min) * 0.2), hi = max + (max - min) * 0.15 || 1;
  const W = 100, H = 100;
  const x = (i: number) => (labels.length === 1 ? 50 : (i / (labels.length - 1)) * W);
  const y = (v: number) => H - ((v - lo) / (hi - lo || 1)) * H;

  return (
    <div className={cn("w-full", className)}>
      <div className="relative" style={{ height }} role="img" aria-label={ariaLabel}>
        <div className="pointer-events-none absolute inset-0">
          {[0, 25, 50, 75, 100].map((p) => <div key={p} className="absolute left-0 right-0 border-t border-white/[0.06]" style={{ bottom: `${p}%` }} />)}
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`${uid}${s.key}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={toneHex[s.tone]} stopOpacity="0.28" />
                <stop offset="100%" stopColor={toneHex[s.tone]} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          {series.map((s) => {
            const pts: [number, number][] = s.values.map((v, i) => [x(i), y(v)]);
            const d = smoothPath(pts);
            return (
              <g key={s.key}>
                {area && series.length === 1 && <path d={`${d} L ${W},${H} L 0,${H} Z`} fill={`url(#${uid}${s.key})`} />}
                <path d={d} fill="none" stroke={toneHex[s.tone]} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ filter: `drop-shadow(0 0 4px ${toneHex[s.tone]}88)` }} />
              </g>
            );
          })}
          {active !== null && <line x1={x(active)} x2={x(active)} y1="0" y2={H} stroke="rgba(0,217,255,0.35)" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />}
        </svg>
        {/* hover points */}
        {active !== null && series.map((s) => (
          <span key={s.key} className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card" style={{ left: `${x(active)}%`, top: `${y(s.values[active])}%`, background: toneHex[s.tone], boxShadow: `0 0 8px ${toneHex[s.tone]}` }} />
        ))}
        {/* interaction columns */}
        <div className="absolute inset-0 flex">
          {labels.map((l, i) => (
            <button key={l + i} type="button" tabIndex={0} aria-label={`${l}: ${series.map((s) => `${s.label} ${format(s.values[i])}`).join(", ")}`}
              onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(i)} onBlur={() => setActive(null)}
              className="h-full flex-1 cursor-crosshair rounded-none focus-visible:outline-offset-[-2px]" />
          ))}
        </div>
        {active !== null && (
          <div role="tooltip" className="pointer-events-none absolute top-0 z-10 whitespace-nowrap rounded-lg border border-line bg-card3 px-3 py-2 text-xs shadow-xl"
            style={{ left: `${x(active)}%`, transform: `translateX(${active > labels.length / 2 ? "-105%" : "5%"})` }}>
            <p className="mb-1 font-semibold">{labels[active]}</p>
            {series.map((s) => (
              <p key={s.key} className="flex items-center gap-2 text-mute">
                <span className="h-2 w-2 rounded-full" style={{ background: toneHex[s.tone] }} />{s.label}: <b className="text-ink">{format(s.values[active])}</b>
              </p>
            ))}
          </div>
        )}
      </div>
      <div className="mt-2 flex">
        {labels.map((l, i) => <span key={l + i} className="flex-1 text-center text-[11px] text-mute">{l}</span>)}
      </div>
      {series.length > 1 && (
        <ul className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-2 text-xs text-ink/90">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: toneHex[s.tone] }} />{s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
