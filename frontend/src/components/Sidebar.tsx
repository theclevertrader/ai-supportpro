import { BookOpen, ChartColumn, Crown, FileText, LayoutDashboard, MessageSquare, Reply, Settings, Sparkles, Ticket, Users, WandSparkles, Workflow, type LucideIcon } from "lucide-react";
import { useApp, type PageId } from "../context/AppContext";
import { cn } from "../utils/cn";
import { Tooltip } from "./ui";

interface NavItem { id: PageId; label: string; icon: LucideIcon; badge?: number }

const MAIN: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "chat", label: "Live Chat", icon: MessageSquare },
  { id: "tickets", label: "Tickets", icon: Ticket },
  { id: "knowledge", label: "Knowledge Base", icon: BookOpen },
  { id: "customers", label: "Customers", icon: Users },
  { id: "analytics", label: "Analytics", icon: ChartColumn },
  { id: "settings", label: "Settings", icon: Settings },
];
const AI_TOOLS: NavItem[] = [
  { id: "prompt", label: "Prompt Assistant", icon: WandSparkles },
  { id: "escalation", label: "Auto Escalation", icon: Workflow },
  { id: "replies", label: "Quick Replies", icon: Reply },
  { id: "reports", label: "Reports", icon: FileText },
];

function NavButton({ item, active, compact, small, badge, onClick }: { item: NavItem; active: boolean; compact: boolean; small?: boolean; badge?: number; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <Tooltip label={item.label} disabled={!compact}>
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        aria-label={item.label}
        className={cn(
          "group relative flex w-full items-center overflow-hidden rounded-[10px] border border-transparent transition-colors duration-150",
          small ? "h-10 text-[14px]" : "h-[46px] text-[15px]",
          active
            ? "border-primary/35 bg-gradient-to-r from-primary/25 to-blue/15 font-semibold text-white shadow-[0_0_20px_rgba(0,217,255,0.18)]"
            : "text-mute hover:bg-primary/[0.07] hover:text-ink",
        )}
      >
        {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-primary shadow-[0_0_10px_#00d9ff]" aria-hidden="true" />}
        <span className="grid w-[44px] shrink-0 place-items-center">
          <Icon size={small ? 18 : 20} strokeWidth={1.8} className={cn("transition-colors", active ? "text-primary" : "group-hover:text-primary")} aria-hidden="true" />
        </span>
        <span className={cn("flex-1 truncate whitespace-nowrap text-left transition-opacity duration-150", compact ? "opacity-0" : "opacity-100")}>{item.label}</span>
        {badge !== undefined && (
          compact ? (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_#00d9ff]" aria-hidden="true" />
          ) : (
            <span className="mr-3 grid h-6 min-w-[30px] place-items-center rounded-full bg-primary/20 px-2 text-xs font-semibold text-primary ring-1 ring-primary/30">{badge}</span>
          )
        )}
      </button>
    </Tooltip>
  );
}

export function Sidebar({ ticketCount, compact }: { ticketCount?: number; compact: boolean }) {
  const { page, navigate, drawerOpen, setDrawerOpen } = useApp();
  return (
    <>
      {drawerOpen && <div className="fixed inset-0 top-[76px] z-30 bg-black/60 lg:hidden" onClick={() => setDrawerOpen(false)} aria-hidden="true" />}
      <aside
        aria-label="Primary"
        className={cn(
          "fixed bottom-0 left-0 top-[76px] z-40 flex flex-col border-r border-line bg-sidebar transition-[width,transform] duration-200 ease-out",
          "max-lg:w-[272px]", drawerOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full",
          compact ? "lg:w-[76px]" : "lg:w-[252px]",
        )}
      >
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3 pt-4" aria-label="Main navigation">
          <ul className="space-y-1.5">
            {MAIN.map((it) => (
              <li key={it.id}>
                <NavButton item={it} active={page === it.id} compact={compact} badge={it.id === "tickets" ? ticketCount : undefined} onClick={() => navigate(it.id)} />
              </li>
            ))}
          </ul>
          <div className="my-4 border-t border-line/70" role="separator" />
          <div className={cn("mb-1 flex h-10 items-center", compact ? "justify-center" : "px-3.5")}>
            <Tooltip label="AI Tools" disabled={!compact}>
              <span className="flex items-center gap-3 text-[15px] font-semibold text-ink">
                <Sparkles size={20} className="text-primary drop-shadow-[0_0_6px_#00d9ff]" aria-hidden="true" />
                {!compact && <span>AI Tools</span>}
              </span>
            </Tooltip>
          </div>
          <ul className="space-y-1">
            {AI_TOOLS.map((it) => (
              <li key={it.id}>
                <NavButton item={it} small active={page === it.id} compact={compact} onClick={() => navigate(it.id)} />
              </li>
            ))}
          </ul>
        </nav>

        {/* Pro card */}
        <div className="p-3">
          {compact ? (
            <Tooltip label="AI SupportPro Pro · v2.0.0">
              <div className="grid h-12 w-full place-items-center rounded-xl border border-line bg-card2">
                <Crown size={20} className="text-warn" aria-hidden="true" />
              </div>
            </Tooltip>
          ) : (
            <div className="rounded-xl border border-line bg-gradient-to-b from-card3 to-card p-4 shadow-[0_0_20px_rgba(0,217,255,0.06)]">
              <div className="flex items-center gap-2">
                <Crown size={20} className="text-warn drop-shadow-[0_0_6px_rgba(245,158,11,0.7)]" aria-hidden="true" />
                <p className="text-[15px] font-bold">AI SupportPro</p>
                <span className="rounded-full bg-gradient-to-r from-primary to-blue px-2 py-0.5 text-[11px] font-bold text-[#021018]">Pro</span>
              </div>
              <p className="mt-2 text-xs text-ink/90">Smarter support. Better business.</p>
              <p className="mt-4 text-xs text-mute">v2.0.0</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
