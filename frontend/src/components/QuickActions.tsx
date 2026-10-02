import { BookOpen, ChevronRight, Ticket, UserPlus, WandSparkles, Zap, type LucideIcon } from "lucide-react";
import { useApp, type PageId } from "../context/AppContext";
import type { Tone } from "../lib/tone";
import { IconBadge, Panel, PanelHeader } from "./ui";

const ACTIONS: { label: string; icon: LucideIcon; tone: Tone; to: PageId }[] = [
  { label: "Generate AI Response", icon: WandSparkles, tone: "cyan", to: "chat" },
  { label: "Search Knowledge Base", icon: BookOpen, tone: "ai", to: "knowledge" },
  { label: "Create Support Ticket", icon: Ticket, tone: "warn", to: "tickets" },
  { label: "Add New Customer", icon: UserPlus, tone: "mint", to: "customers" },
];

export function QuickActions() {
  const { navigate } = useApp();
  return (
    <Panel className="p-4 sm:p-5">
      <PanelHeader icon={Zap} title="Quick Actions" />
      <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-1">
        {ACTIONS.map(({ label, icon, tone, to }) => (
          <li key={label}>
            <button type="button" onClick={() => navigate(to)}
              className="group flex h-[46px] w-full items-center gap-3 rounded-[10px] border border-line/70 bg-card3/80 px-2.5 text-left text-[13px] font-medium text-ink transition duration-150 hover:translate-x-0.5 hover:border-primary/50 hover:bg-primary/[0.08] hover:shadow-[0_0_18px_rgba(0,217,255,0.12)] active:scale-[0.99]">
              <IconBadge icon={icon} tone={tone} size="sm" />
              <span className="flex-1 truncate">{label}</span>
              <ChevronRight size={18} className="text-ink/80 transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
