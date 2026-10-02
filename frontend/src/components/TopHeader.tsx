import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Menu, Search, Settings, ShieldCheck } from "lucide-react";
import avatar from "../assets/avatar.jpg";
import { useApp } from "../context/AppContext";
import { useDismiss, useMediaQuery } from "../hooks/hooks";
import { useRealtime } from "../realtime/RealtimeProvider";
import { Logo } from "./Logo";
import { NotificationBell } from "./NotificationBell";
import { TenantSwitcher } from "./TenantSwitcher";
import { Avatar, StatusIndicator } from "./ui";

function ConnectionPopover() {
  const rt = useRealtime();
  const live = rt.status === "live";
  return (
    <div role="tooltip" className="panel invisible absolute right-0 top-11 z-50 w-64 bg-card p-4 text-xs opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-semibold text-ink">Realtime connection</span>
        <span className={live ? "rounded bg-mint/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-mint" : "rounded bg-warn/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-warn"}>{live ? "LIVE" : rt.status.toUpperCase()}</span>
      </div>
      <dl className="space-y-1.5 text-mute">
        <div className="flex justify-between"><dt>Transport</dt><dd className="text-ink">{rt.transport === "websocket" ? "WebSocket" : "HTTP / SSE-ready"}</dd></div>
        <div className="flex justify-between"><dt>Latency</dt><dd className="text-ink">{rt.latency === null ? "—" : `${rt.latency} ms`}</dd></div>
        <div className="flex justify-between"><dt>Last updated</dt><dd className="text-ink">{rt.lastUpdated ? rt.lastUpdated.toLocaleTimeString() : "—"}</dd></div>
      </dl>
    </div>
  );
}

export function TopHeader() {
  const { setCollapsed, setDrawerOpen, drawerOpen, collapsed, tenant, navigate } = useApp();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [menu, setMenu] = useState(false);
  const menuRef = useDismiss<HTMLDivElement>(menu, () => setMenu(false));
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); input.current?.focus(); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-[76px] items-center gap-3 border-b border-line bg-bg2/95 px-3 backdrop-blur sm:gap-4 sm:px-5">
      <button type="button" aria-label={isDesktop ? (collapsed ? "Expand sidebar" : "Collapse sidebar") : drawerOpen ? "Close menu" : "Open menu"} aria-expanded={isDesktop ? !collapsed : drawerOpen}
        onClick={() => (isDesktop ? setCollapsed((c) => !c) : setDrawerOpen(!drawerOpen))}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-ink transition hover:bg-primary/10 hover:text-primary active:scale-95">
        <Menu size={28} strokeWidth={1.8} aria-hidden="true" />
      </button>

      <div className="shrink-0 xl:w-[300px]"><Logo /></div>

      <div className="mx-auto hidden min-w-0 max-w-[575px] flex-1 md:block">
        <label className="field flex h-12 items-center gap-3 px-4 shadow-[0_0_20px_rgba(0,217,255,0.06)]">
          <Search size={20} className="shrink-0 text-ink/80" aria-hidden="true" />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} type="search" aria-label="Search conversations, tickets, or customers"
            placeholder="Search conversations, tickets, or customers..." className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-mute" />
          <kbd className="hidden shrink-0 rounded-md border border-line bg-white/[0.03] px-2 py-1 text-xs text-mute lg:block">Ctrl + K</kbd>
        </label>
      </div>
      <div className="flex-1 md:hidden" />

      <div className="ml-auto flex items-center gap-2 sm:gap-3 md:ml-0">
        <div className="hidden 2xl:block"><TenantSwitcher /></div>
        <div className="group relative hidden sm:block">
          <button type="button" aria-label="System status: online. Show connection details" className="rounded-full">
            <StatusIndicator pill status="online" label="System Online" />
          </button>
          <ConnectionPopover />
        </div>
        <NotificationBell />
        <div ref={menuRef} className="relative">
          <button type="button" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}
            className="flex h-14 items-center gap-3 rounded-xl px-2 text-left transition hover:bg-primary/10">
            <Avatar name="Shafaan" src={avatar} size={44} />
            <span className="hidden leading-tight lg:block">
              <span className="block text-[15px] font-semibold">Shafaan Tariq</span>
              <span className="block text-xs text-mute">Admin</span>
            </span>
            <ChevronDown size={18} className="hidden text-ink sm:block" aria-hidden="true" />
          </button>
          {menu && (
            <div role="menu" className="panel absolute right-0 top-16 z-50 w-64 bg-card p-2 animate-fade-up">
              <div className="border-b border-line px-3 pb-3 pt-2">
                <p className="text-sm font-semibold">Shafaan Tariq</p>
                <p className="text-xs text-mute">shafaan@acme-store.com · Admin</p>
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-[11px] text-primary"><ShieldCheck size={12} aria-hidden="true" />Tenant: {tenant.name}</p>
              </div>
              <div className="border-b border-line p-2"><TenantSwitcher variant="list" onSelected={() => setMenu(false)} /></div>
              <button role="menuitem" type="button" onClick={() => { navigate("settings"); setMenu(false); }} className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-white/5"><Settings size={15} aria-hidden="true" />Account settings</button>
              <button role="menuitem" type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger/10"><LogOut size={15} aria-hidden="true" />Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
