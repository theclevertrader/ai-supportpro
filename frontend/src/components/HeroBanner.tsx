import { ChevronDown, Cog, Heart, Radio, ScanLine, TrendingUp, type LucideIcon } from "lucide-react";
import heroBg from "../assets/hero-bg.jpg";
import { Mascot } from "./Logo";

const PILLS: { label: string; icon: LucideIcon; chevron?: boolean }[] = [
  { label: "Multi-Tenant SaaS", icon: ScanLine },
  { label: "Real-time Support", icon: Radio, chevron: true },
  { label: "Smart Automation", icon: Cog, chevron: true },
  { label: "Happier Customers", icon: Heart },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: "Good Morning", emoji: "☀️" };
  if (h < 18) return { text: "Good Afternoon", emoji: "🌤️" };
  return { text: "Good Evening", emoji: "🌙" };
}

export function HeroBanner({ name }: { name: string }) {
  const g = greeting();
  return (
    <section aria-label="Welcome" className="panel relative overflow-hidden">
      <img src={heroBg} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#051428] via-[#06203d]/80 to-[#0a4fa8]/20" aria-hidden="true" />
      {/* light trails */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 overflow-hidden lg:block" aria-hidden="true">
        {[22, 48, 74].map((t, i) => (
          <span key={t} className="absolute h-px w-2/3 bg-gradient-to-r from-transparent via-primary to-transparent" style={{ top: `${t}%`, left: `${10 + i * 8}%`, animation: `trail ${4 + i}s ease-in-out ${i}s infinite` }} />
        ))}
      </div>

      <div className="relative flex items-center gap-4 px-4 py-4 sm:gap-5 sm:px-6">
        <Mascot size={92} className="hidden sm:grid" />
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-bold leading-tight tracking-tight sm:text-[28px]">
            {g.text}, {name}! <span aria-hidden="true">{g.emoji}</span>
          </h1>
          <p className="mt-0.5 text-sm text-primary sm:text-base">Here's what's happening with your AI SupportPro today.</p>
          <ul className="mt-3 flex flex-wrap gap-2.5">
            {PILLS.map(({ label, icon: Icon, chevron }) => (
              <li key={label} className="flex h-8 items-center gap-2 rounded-lg border border-primary/25 bg-[#0a2744]/70 px-3 text-[13px] text-ink/95 transition hover:border-primary/60">
                <Icon size={15} className="text-primary" aria-hidden="true" />
                {label}
                {chevron && <ChevronDown size={12} className="text-mute" aria-hidden="true" />}
              </li>
            ))}
          </ul>
        </div>
        <div className="hidden shrink-0 pr-4 text-right lg:block xl:pr-10" aria-hidden="true">
          <p className="-rotate-6 text-[26px] font-bold italic leading-tight text-ink drop-shadow-[0_0_14px_rgba(0,217,255,0.5)] xl:text-[30px]">
            <span className="block">Automate Support</span>
            <span className="block pl-10">Grow Faster <TrendingUp className="ml-1 inline text-primary" size={34} /></span>
          </p>
        </div>
      </div>
    </section>
  );
}
