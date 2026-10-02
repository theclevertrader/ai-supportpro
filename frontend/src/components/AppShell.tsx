import type { ReactNode } from "react";
import { useApp } from "../context/AppContext";
import { useMediaQuery } from "../hooks/hooks";
import { useRealtime } from "../realtime/RealtimeProvider";
import { cn } from "../utils/cn";
import { Sidebar } from "./Sidebar";
import { TopHeader } from "./TopHeader";

function ConnectionBar() {
  const rt = useRealtime();
  const live = rt.status === "live";
  return (
    <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-4 text-xs text-mute" aria-label="Connection status">
      <span className="flex items-center gap-2">
        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider", live ? "bg-mint/15 text-mint" : "bg-warn/15 text-warn")}>{live ? "LIVE" : rt.status.toUpperCase()}</span>
        {live ? "Connected" : rt.status === "connecting" ? "Connecting…" : "Reconnecting…"}
      </span>
      <span>Latency: <b className="font-medium text-ink">{rt.latency === null ? "—" : `${rt.latency} ms`}</b></span>
      <span>Last updated: <b className="font-medium text-ink">{rt.lastUpdated ? rt.lastUpdated.toLocaleTimeString() : "—"}</b></span>
    </footer>
  );
}

export function AppShell({ children, ticketCount }: { children: ReactNode; ticketCount?: number }) {
  const { collapsed } = useApp();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const compact = collapsed && isDesktop;
  return (
    <div className="min-h-full">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-bg">Skip to content</a>
      <TopHeader />
      <Sidebar ticketCount={ticketCount} compact={compact} />
      <main id="main" tabIndex={-1} className={cn("min-h-screen px-3 pb-8 pt-[92px] outline-none transition-[padding] duration-200 sm:px-5", compact ? "lg:pl-[96px]" : "lg:pl-[272px]")}>
        <div className="mx-auto max-w-[1600px]">
          {children}
          <ConnectionBar />
        </div>
      </main>
    </div>
  );
}
