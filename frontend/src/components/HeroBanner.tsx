import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  Cog,
  FileText,
  Heart,
  MessageSquare,
  Radio,
  ScanLine,
  Sparkles,
  Ticket,
  TrendingUp,
  WandSparkles,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import heroBg from "../assets/hero-bg.jpg";
import { Mascot } from "./Logo";
import { useApp, type PageId } from "../context/AppContext";
import { cn } from "../utils/cn";

function getPakistanHour(): number {
  try {
    // Calculates hour accurately for Pakistan Standard Time (PKT, Asia/Karachi, UTC+5)
    const str = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Karachi",
      hour: "numeric",
      hourCycle: "h23",
    }).format(new Date());
    const h = parseInt(str, 10);
    return isNaN(h) ? (new Date().getUTCHours() + 5) % 24 : h % 24;
  } catch {
    return (new Date().getUTCHours() + 5) % 24;
  }
}

function getGreeting() {
  const h = getPakistanHour();
  if (h >= 5 && h < 12) return { text: "Good Morning", emoji: "☀️" };
  if (h >= 12 && h < 17) return { text: "Good Afternoon", emoji: "🌤️" };
  if (h >= 17 && h < 21) return { text: "Good Evening", emoji: "🌆" };
  return { text: "Good Night", emoji: "🌙" };
}

interface DropdownItem {
  title: string;
  desc: string;
  icon: LucideIcon;
  page: PageId;
  badge?: string;
}

export function HeroBanner({ name }: { name: string }) {
  const { navigate } = useApp();
  const [g, setGreeting] = useState(getGreeting);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update greeting every 30 seconds according to actual local time
  useEffect(() => {
    const timer = setInterval(() => setGreeting(getGreeting()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const realtimeItems: DropdownItem[] = [
    {
      title: "Live Customer Chat",
      desc: "Monitor conversations & stream live tokens",
      icon: MessageSquare,
      page: "chat",
      badge: "SSE Live",
    },
    {
      title: "Support Tickets Queue",
      desc: "Manage tickets, priorities & escalations",
      icon: Ticket,
      page: "tickets",
    },
    {
      title: "Auto Escalation Engine",
      desc: "Define triggers for human agent handoff",
      icon: Workflow,
      page: "escalation",
    },
  ];

  const automationItems: DropdownItem[] = [
    {
      title: "Prompt Assistant",
      desc: "Tune system prompt, variables & temperature",
      icon: WandSparkles,
      page: "prompt",
    },
    {
      title: "Quick Canned Replies",
      desc: "Reusable macro responses with shortcuts",
      icon: MessageSquare,
      page: "replies",
    },
    {
      title: "Knowledge Base RAG",
      desc: "Vector chunking & official policy documents",
      icon: BookOpen,
      page: "knowledge",
    },
    {
      title: "Export Audit Reports",
      desc: "Download performance & cost CSV reports",
      icon: FileText,
      page: "reports",
    },
  ];

  const handlePillClick = (label: string) => {
    if (label === "Real-time Support") {
      setOpenMenu(openMenu === "realtime" ? null : "realtime");
    } else if (label === "Smart Automation") {
      setOpenMenu(openMenu === "automation" ? null : "automation");
    } else if (label === "Multi-Tenant SaaS") {
      setOpenMenu(null);
      navigate("settings");
    } else if (label === "Happier Customers") {
      setOpenMenu(null);
      navigate("customers");
    }
  };

  return (
    <section aria-label="Welcome" className="panel relative overflow-visible">
      {/* Background layer with rounded clipping */}
      <div className="absolute inset-0 overflow-hidden rounded-[14px] pointer-events-none">
        <img src={heroBg} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#051428] via-[#06203d]/80 to-[#0a4fa8]/20" aria-hidden="true" />
        {/* light trails */}
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 overflow-hidden lg:block" aria-hidden="true">
          {[22, 48, 74].map((t, i) => (
            <span
              key={t}
              className="absolute h-px w-2/3 bg-gradient-to-r from-transparent via-primary to-transparent"
              style={{
                top: `${t}%`,
                left: `${10 + i * 8}%`,
                animation: `trail ${4 + i}s ease-in-out ${i}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative flex items-center gap-4 px-4 py-4 sm:gap-5 sm:px-6">
        <Mascot size={92} className="hidden sm:grid" />
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-bold leading-tight tracking-tight sm:text-[28px]">
            {g.text}, {name}! <span aria-hidden="true">{g.emoji}</span>
          </h1>
          <p className="mt-0.5 text-sm text-primary sm:text-base">
            Here's what's happening with your AI SupportPro today.
          </p>

          <div ref={containerRef} className="relative mt-3">
            <ul className="flex flex-wrap gap-2.5">
              {/* 1. Multi-Tenant SaaS */}
              <li>
                <button
                  type="button"
                  onClick={() => handlePillClick("Multi-Tenant SaaS")}
                  className="flex h-8 cursor-pointer select-none items-center gap-2 rounded-lg border border-primary/25 bg-[#0a2744]/80 px-3 text-[13px] text-ink/95 shadow-sm transition hover:border-primary/60 hover:bg-[#0d345b] active:scale-95"
                >
                  <ScanLine size={15} className="text-primary" aria-hidden="true" />
                  Multi-Tenant SaaS
                </button>
              </li>

              {/* 2. Real-time Support (with Active Dropdown) */}
              <li className="relative">
                <button
                  type="button"
                  aria-expanded={openMenu === "realtime"}
                  onClick={() => handlePillClick("Real-time Support")}
                  className={cn(
                    "flex h-8 cursor-pointer select-none items-center gap-2 rounded-lg border px-3 text-[13px] transition shadow-sm active:scale-95",
                    openMenu === "realtime"
                      ? "border-primary bg-[#0f3d6c] text-white shadow-[0_0_12px_rgba(0,217,255,0.4)]"
                      : "border-primary/25 bg-[#0a2744]/80 text-ink/95 hover:border-primary/60 hover:bg-[#0d345b]"
                  )}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
                  </span>
                  <Radio size={15} className="text-primary" aria-hidden="true" />
                  Real-time Support
                  <ChevronDown
                    size={12}
                    className={cn(
                      "text-primary transition-transform duration-200",
                      openMenu === "realtime" ? "rotate-180" : ""
                    )}
                    aria-hidden="true"
                  />
                </button>

                {openMenu === "realtime" && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-primary/30 bg-[#071d37]/95 p-2 shadow-[0_15px_35px_rgba(0,0,0,0.85)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 sm:w-80">
                    <div className="flex items-center justify-between border-b border-white/[0.08] px-3 py-2 text-xs font-semibold text-mint">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-mint" />
                        Live SSE & DB Engine
                      </span>
                      <span className="text-[11px] text-mute">12ms latency</span>
                    </div>
                    <div className="mt-1 space-y-1">
                      {realtimeItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.title}
                            type="button"
                            onClick={() => {
                              navigate(item.page);
                              setOpenMenu(null);
                            }}
                            className="flex w-full items-start gap-3 rounded-lg p-2.5 text-left transition hover:bg-primary/15 hover:border-primary/30"
                          >
                            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                              <Icon size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-ink">{item.title}</p>
                                {item.badge && (
                                  <span className="rounded bg-mint/15 px-1.5 py-0.5 text-[10px] font-medium text-mint">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <p className="truncate text-[11px] text-mute">{item.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </li>

              {/* 3. Smart Automation (with Active Dropdown) */}
              <li className="relative">
                <button
                  type="button"
                  aria-expanded={openMenu === "automation"}
                  onClick={() => handlePillClick("Smart Automation")}
                  className={cn(
                    "flex h-8 cursor-pointer select-none items-center gap-2 rounded-lg border px-3 text-[13px] transition shadow-sm active:scale-95",
                    openMenu === "automation"
                      ? "border-primary bg-[#0f3d6c] text-white shadow-[0_0_12px_rgba(0,217,255,0.4)]"
                      : "border-primary/25 bg-[#0a2744]/80 text-ink/95 hover:border-primary/60 hover:bg-[#0d345b]"
                  )}
                >
                  <Cog size={15} className="text-primary" aria-hidden="true" />
                  Smart Automation
                  <ChevronDown
                    size={12}
                    className={cn(
                      "text-primary transition-transform duration-200",
                      openMenu === "automation" ? "rotate-180" : ""
                    )}
                    aria-hidden="true"
                  />
                </button>

                {openMenu === "automation" && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-primary/30 bg-[#071d37]/95 p-2 shadow-[0_15px_35px_rgba(0,0,0,0.85)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 sm:w-80">
                    <div className="flex items-center gap-1.5 border-b border-white/[0.08] px-3 py-2 text-xs font-semibold text-primary">
                      <Sparkles size={13} className="text-primary" />
                      AI Automation Controls
                    </div>
                    <div className="mt-1 space-y-1">
                      {automationItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.title}
                            type="button"
                            onClick={() => {
                              navigate(item.page);
                              setOpenMenu(null);
                            }}
                            className="flex w-full items-start gap-3 rounded-lg p-2.5 text-left transition hover:bg-primary/15 hover:border-primary/30"
                          >
                            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                              <Icon size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-ink">{item.title}</p>
                              <p className="truncate text-[11px] text-mute">{item.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </li>

              {/* 4. Happier Customers */}
              <li>
                <button
                  type="button"
                  onClick={() => handlePillClick("Happier Customers")}
                  className="flex h-8 cursor-pointer select-none items-center gap-2 rounded-lg border border-primary/25 bg-[#0a2744]/80 px-3 text-[13px] text-ink/95 shadow-sm transition hover:border-primary/60 hover:bg-[#0d345b] active:scale-95"
                >
                  <Heart size={15} className="text-pink-400" aria-hidden="true" />
                  Happier Customers
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="hidden shrink-0 pr-4 text-right lg:block xl:pr-10" aria-hidden="true">
          <p className="-rotate-6 text-[26px] font-bold italic leading-tight text-ink drop-shadow-[0_0_14px_rgba(0,217,255,0.5)] xl:text-[30px]">
            <span className="block">Automate Support</span>
            <span className="block pl-10">
              Grow Faster <TrendingUp className="ml-1 inline text-primary" size={34} />
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
