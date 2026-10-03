import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { setActiveTenant, getAuthToken, setAuthToken } from "../api/client";
import { userApi, authApi } from "../api/services";
import type { UserProfileDTO } from "../api/types";

export type PageId =
  | "dashboard" | "chat" | "tickets" | "knowledge" | "customers" | "analytics" | "settings"
  | "prompt" | "escalation" | "replies" | "reports";

const PAGES: PageId[] = ["dashboard", "chat", "tickets", "knowledge", "customers", "analytics", "settings", "prompt", "escalation", "replies", "reports"];

export const TENANTS = [
  { id: "acme", name: "Acme Store", plan: "Professional", region: "US-East (Primary)" },
  { id: "demo", name: "Demo Store", plan: "Starter", region: "EU-Central" },
  { id: "ent", name: "Enterprise Store", plan: "Enterprise", region: "US-West" },
];

export interface ToastMessage {
  id: string;
  message: string;
  tone?: "mint" | "warn" | "danger" | "ai";
}

export const DEMO_USERS: UserProfileDTO[] = [
  {
    id: "u1",
    name: "Acme Support Admin",
    firstName: "Admin",
    email: "admin@acmestore.com",
    role: "Admin",
    phone: "+1 (555) 234-5678",
    title: "Lead Support Operations",
    twoFactorEnabled: true,
  },
  {
    id: "u2",
    name: "Sarah Khan",
    firstName: "Sarah",
    email: "admin@acmestore.com",
    role: "Owner",
    phone: "+1 (555) 876-5432",
    title: "Principal Support Lead",
    twoFactorEnabled: true,
  },
  {
    id: "u3",
    name: "Priya Nair",
    firstName: "Priya",
    email: "priya@acmestore.com",
    role: "Agent",
    phone: "+1 (555) 345-6789",
    title: "Senior Escalation Specialist",
    twoFactorEnabled: false,
  },
];

interface AppValue {
  page: PageId;
  navigate: (p: PageId, tab?: string) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean | ((c: boolean) => boolean)) => void;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  tenant: (typeof TENANTS)[number];
  setTenantId: (id: string) => void;
  user: UserProfileDTO;
  updateUser: (patch: Partial<UserProfileDTO>) => Promise<boolean>;
  settingsTab: string;
  setSettingsTab: (t: string) => void;
  toast: ToastMessage | null;
  notify: (message: string, tone?: "mint" | "warn" | "danger" | "ai") => void;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  signOut: () => Promise<void>;
  signInAs: (user: UserProfileDTO) => void;
}

const Ctx = createContext<AppValue | null>(null);

const readHash = (): PageId => {
  const h = window.location.hash.replace(/^#\/?/, "").split("?")[0] as PageId;
  return PAGES.includes(h) ? h : "dashboard";
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<PageId>(readHash);
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1280);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tenantId, setTenant] = useState("acme");
  const [settingsTab, setSettingsTab] = useState("Account");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Load user from localStorage or fallback to default
  const [user, setUser] = useState<UserProfileDTO>(() => {
    try {
      const saved = localStorage.getItem("aisp_user");
      if (saved) return JSON.parse(saved) as UserProfileDTO;
    } catch { /* ignore */ }
    return DEMO_USERS[0];
  });

  // Attempt to fetch fresh profile from backend on mount, logging in if needed
  useEffect(() => {
    const initSession = async () => {
      let token = getAuthToken();
      if (!token) {
        try {
          const res = await authApi.login("admin@acmestore.com", "Password123!");
          if (res?.access_token) {
            token = res.access_token;
            setAuthToken(token);
          }
        } catch { /* offline dev mode */ }
      }

      userApi.getProfile()
        .then((data) => {
          if (data && data.name) {
            setUser((prev) => {
              const next = { ...prev, ...data };
              localStorage.setItem("aisp_user", JSON.stringify(next));
              return next;
            });
          }
        })
        .catch(() => { /* fallback to current user */ });
    };

    initSession();
  }, []);

  const notify = useCallback((message: string, tone: "mint" | "warn" | "danger" | "ai" = "mint") => {
    const id = String(Date.now());
    setToast({ id, message, tone });
    setTimeout(() => {
      setToast((cur) => (cur?.id === id ? null : cur));
    }, 3800);
  }, []);

  useEffect(() => {
    const on = () => {
      setPage(readHash());
      setDrawerOpen(false);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const navigate = useCallback((p: PageId, tab?: string) => {
    if (tab) setSettingsTab(tab);
    window.location.hash = `/${p}`;
    setDrawerOpen(false);
    window.scrollTo({ top: 0 });
  }, []);

  const setTenantId = useCallback((id: string) => {
    setActiveTenant(id);
    setTenant(id);
    const matched = TENANTS.find((t) => t.id === id);
    if (matched) {
      notify(`Switched workspace to ${matched.name} (${matched.plan})`, "ai");
    }
  }, [notify]);

  const updateUser = useCallback(async (patch: Partial<UserProfileDTO>): Promise<boolean> => {
    try {
      const updated = await userApi.updateProfile(patch);
      const nextUser = { ...user, ...updated };
      setUser(nextUser);
      localStorage.setItem("aisp_user", JSON.stringify(nextUser));
      notify("Account settings updated successfully.", "mint");
      return true;
    } catch {
      // Offline fallback
      const nextUser = {
        ...user,
        ...patch,
        firstName: patch.name ? patch.name.split(" ")[0] : user.firstName,
      };
      setUser(nextUser);
      localStorage.setItem("aisp_user", JSON.stringify(nextUser));
      notify("Account profile saved.", "mint");
      return true;
    }
  }, [user, notify]);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch { /* proceed */ }
    setAuthToken(null);
    localStorage.removeItem("aisp_user");
    notify("Signed out from active session.", "warn");
    setAuthModalOpen(true);
  }, [notify]);

  const signInAs = useCallback((chosenUser: UserProfileDTO) => {
    setUser(chosenUser);
    localStorage.setItem("aisp_user", JSON.stringify(chosenUser));
    setAuthModalOpen(false);
    notify(`Signed in as ${chosenUser.name} (${chosenUser.role})`, "mint");
  }, [notify]);

  const tenant = TENANTS.find((t) => t.id === tenantId) ?? TENANTS[0];

  const value = useMemo(
    () => ({
      page,
      navigate,
      collapsed,
      setCollapsed,
      drawerOpen,
      setDrawerOpen,
      tenant,
      setTenantId,
      user,
      updateUser,
      settingsTab,
      setSettingsTab,
      toast,
      notify,
      authModalOpen,
      setAuthModalOpen,
      signOut,
      signInAs,
    }),
    [
      page,
      navigate,
      collapsed,
      drawerOpen,
      tenant,
      setTenantId,
      user,
      updateUser,
      settingsTab,
      toast,
      notify,
      authModalOpen,
      signOut,
      signInAs,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used within AppProvider");
  return v;
}
