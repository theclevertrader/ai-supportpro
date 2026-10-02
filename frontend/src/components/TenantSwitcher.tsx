import { useState } from "react";
import { Building2, Check, ChevronDown } from "lucide-react";
import { TENANTS, useApp } from "../context/AppContext";
import { useDismiss } from "../hooks/hooks";
import { cn } from "../utils/cn";

/** Switching tenants updates X-Tenant-ID and re-fetches every data hook (data stays isolated per tenant). */
export function TenantSwitcher({ variant = "chip", onSelected }: { variant?: "chip" | "list"; onSelected?: () => void }) {
  const { tenant, setTenantId } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));

  const options = (
    <ul role="listbox" aria-label="Tenants" className="space-y-1">
      {TENANTS.map((t) => (
        <li key={t.id} role="option" aria-selected={t.id === tenant.id}>
          <button type="button" onClick={() => { setTenantId(t.id); setOpen(false); onSelected?.(); }}
            className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition", t.id === tenant.id ? "bg-primary/15 text-primary" : "text-ink hover:bg-white/5")}>
            <Building2 size={15} aria-hidden="true" />
            <span className="flex-1">{t.name}</span>
            {t.id === tenant.id && <Check size={15} aria-hidden="true" />}
          </button>
        </li>
      ))}
    </ul>
  );

  if (variant === "list") return <div><p className="mb-2 text-xs font-medium uppercase tracking-wide text-mute">Tenant switcher</p>{options}</div>;

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="field flex h-10 items-center gap-2 px-3 text-left">
        <Building2 size={16} className="text-primary" aria-hidden="true" />
        <span className="leading-tight">
          <span className="block text-[10px] uppercase tracking-wide text-mute">Current Tenant</span>
          <span className="block text-[13px] font-semibold">{tenant.name}</span>
        </span>
        <ChevronDown size={14} className="text-mute" aria-hidden="true" />
      </button>
      {open && <div className="panel absolute right-0 top-12 z-50 w-56 bg-card p-2 animate-fade-up">{options}</div>}
    </div>
  );
}
