import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { setActiveTenant } from "../api/client";

export type PageId =
  | "dashboard" | "chat" | "tickets" | "knowledge" | "customers" | "analytics" | "settings"
  | "prompt" | "escalation" | "replies" | "reports";

const PAGES: PageId[] = ["dashboard", "chat", "tickets", "knowledge", "customers", "analytics", "settings", "prompt", "escalation", "replies", "reports"];

export const TENANTS = [
  { id: "acme", name: "Acme Store" },
  { id: "demo", name: "Demo Store" },
  { id: "ent", name: "Enterprise Store" },
];

interface AppValue {
  page: PageId;
  navigate: (p: PageId) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean | ((c: boolean) => boolean)) => void;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  tenant: (typeof TENANTS)[number];
  setTenantId: (id: string) => void;
}

const Ctx = createContext<AppValue | null>(null);

const readHash = (): PageId => {
  const h = window.location.hash.replace(/^#\/?/, "") as PageId;
  return PAGES.includes(h) ? h : "dashboard";
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<PageId>(readHash);
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1280);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tenantId, setTenant] = useState("acme");

  useEffect(() => {
    const on = () => { setPage(readHash()); setDrawerOpen(false); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const navigate = useCallback((p: PageId) => {
    window.location.hash = `/${p}`;
    setDrawerOpen(false);
    window.scrollTo({ top: 0 });
  }, []);

  const setTenantId = useCallback((id: string) => { setActiveTenant(id); setTenant(id); }, []);
  const tenant = TENANTS.find((t) => t.id === tenantId) ?? TENANTS[0];

  const value = useMemo(
    () => ({ page, navigate, collapsed, setCollapsed, drawerOpen, setDrawerOpen, tenant, setTenantId }),
    [page, navigate, collapsed, drawerOpen, tenant, setTenantId],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used within AppProvider");
  return v;
}
