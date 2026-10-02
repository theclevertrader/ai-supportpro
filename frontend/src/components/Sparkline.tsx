import { useId } from "react";
import { toneHex, type Tone } from "../lib/tone";

/** Smooth Catmull-Rom → Bezier path for a data series. */
export function smoothPath(points: [number, number][]) {
  if (points.length < 2) return "";
  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export function Sparkline({ data, tone = "cyan", className, label }: { data: number[]; tone?: Tone; className?: string; label?: string }) {
  const id = useId().replace(/:/g, "");
  const hex = toneHex[tone];
  const W = 120, H = 44, pad = 4;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts: [number, number][] = data.map((v, i) => [(i / (data.length - 1)) * W, H - pad - ((v - min) / span) * (H - pad * 2)]);
  const line = smoothPath(pts);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className} role="img" aria-label={label ?? "Trend sparkline"}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={hex} stopOpacity="0.35" />
          <stop offset="100%" stopColor={hex} stopOpacity="0" />
        </linearGradient>
        <filter id={`f${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d={`${line} L ${W},${H} L 0,${H} Z`} fill={`url(#g${id})`} />
      <path d={line} fill="none" stroke={hex} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" filter={`url(#f${id})`} />
    </svg>
  );
}
