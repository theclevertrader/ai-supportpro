import { useState } from "react";
import { Bell } from "lucide-react";
import { notificationsApi } from "../api/services";
import { useAsync, useDismiss } from "../hooks/hooks";
import { toneBg } from "../lib/tone";
import { cn } from "../utils/cn";
import { EmptyState, ErrorState, Skeleton } from "./ui";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  const state = useAsync(notificationsApi.list);
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  const unread = seen ? 0 : (state.data ?? []).filter((n) => n.unread).length;

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-haspopup="true" aria-expanded={open}
        onClick={() => { setOpen((o) => !o); setSeen(true); }}
        className="relative grid h-11 w-11 place-items-center rounded-xl text-ink transition hover:bg-primary/10 hover:text-primary active:scale-95">
        <Bell size={24} strokeWidth={1.7} aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[11px] font-bold text-white">
            <span className="absolute inset-0 rounded-full bg-danger" style={{ animation: "ping-badge 2s ease-out infinite" }} aria-hidden="true" />
            <span className="relative">{unread}</span>
          </span>
        )}
      </button>
      {open && (
        <div className="panel absolute right-0 top-14 z-50 w-[min(360px,calc(100vw-24px))] bg-card animate-fade-up">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold">Notifications</h2>
            <span className="text-xs text-mute">Live updates</span>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {state.loading && <div className="space-y-2 p-2"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>}
            {state.error && <ErrorState message={state.error} onRetry={state.reload} />}
            {state.data && state.data.length === 0 && <EmptyState title="You're all caught up" />}
            {state.data?.map((n) => (
              <div key={n.id} className="flex gap-3 rounded-lg p-3 transition hover:bg-white/5">
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", toneBg[n.tone])} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-mute">{n.detail}</p>
                  <p className="mt-1 text-[11px] text-dim">{n.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
