import { useEffect, useId, useState } from "react";
import { toneHex, toneHex2, type Tone } from "../lib/tone";

/** Animated circular gauge. Ring colours blend from the tone's two accent colours. */
export function RingGauge({ value, label, tone = "cyan", size = 88 }: { value: number; label: string; tone?: Tone; size?: number }) {
  const id = useId().replace(/:/g, "");
  const [ready, setReady] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(r); }, []);
  const R = 40, C = 2 * Math.PI * R;
  const offset = C * (1 - (ready ? value : 0) / 100);
  return (
    <figure className="flex min-w-0 flex-col items-center text-center" aria-label={`${label}: ${value}%`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={toneHex[tone]} />
              <stop offset="100%" stopColor={toneHex2[tone] === toneHex[tone] ? "#00E5A8" : tone === "warn" ? "#00E5A8" : toneHex2[tone]} />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
          <circle cx="50" cy="50" r={R} fill="none" stroke={`url(#${id})`} strokeWidth="7" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1000ms cubic-bezier(.2,.8,.2,1)", filter: `drop-shadow(0 0 4px ${toneHex[tone]}88)` }} />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-lg font-bold text-ink">{value}%</span>
      </div>
      <figcaption className="mt-2 max-w-[88px] text-[11px] leading-tight text-mute">{label}</figcaption>
    </figure>
  );
}
