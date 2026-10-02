import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { AlertTriangle, ChevronDown, Inbox, RefreshCw, Search, X, type LucideIcon } from "lucide-react";
import { cn } from "../utils/cn";
import { toneHex, toneSoft, type Tone } from "../lib/tone";

/* ───────────── Panel ───────────── */
export function Panel({ className, children, hover = false, ...rest }: { className?: string; children: ReactNode; hover?: boolean } & Omit<React.HTMLAttributes<HTMLElement>, "className" | "children">) {
  return (
    <section className={cn("panel", hover && "panel-hover", className)} {...rest}>
      {children}
    </section>
  );
}

export function IconBadge({ icon: Icon, tone = "cyan", size = "md", className }: { icon: LucideIcon | React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>; tone?: Tone; size?: "sm" | "md" | "lg"; className?: string }) {
  const hex = toneHex[tone];
  const box = size === "lg" ? "h-12 w-12 rounded-xl" : size === "md" ? "h-10 w-10 rounded-[10px]" : "h-8 w-8 rounded-lg";
  const ico = size === "lg" ? 24 : size === "md" ? 20 : 17;
  return (
    <span
      aria-hidden="true"
      className={cn("inline-grid shrink-0 place-items-center border", box, className)}
      style={{ background: `linear-gradient(145deg, ${hex}38, ${hex}0d)`, borderColor: `${hex}66`, color: hex, boxShadow: `0 0 16px ${hex}30, inset 0 1px 0 ${hex}33` }}
    >
      <Icon size={ico} strokeWidth={1.9} />
    </span>
  );
}

export function PanelHeader({ icon, tone = "cyan", title, suffix, subtitle, action, className }: { icon?: LucideIcon; tone?: Tone; title: string; suffix?: string; subtitle?: string; action?: ReactNode; className?: string }) {
  return (
    <header className={cn("flex items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {icon && <IconBadge icon={icon} tone={tone} size="md" />}
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold leading-tight text-ink">
            {title} {suffix && <span className="font-normal text-mute">{suffix}</span>}
          </h2>
          {subtitle && <p className="mt-0.5 truncate text-xs text-mute">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

/* ───────────── Buttons ───────────── */
type BtnVariant = "primary" | "outline" | "ghost" | "warn" | "danger" | "success";
const btn: Record<BtnVariant, string> = {
  primary: "bg-gradient-to-b from-primary to-[#0aa6e8] text-[#021018] font-semibold shadow-[0_0_18px_rgba(0,217,255,0.28)] hover:brightness-110",
  outline: "border border-line bg-primary/5 text-ink hover:border-primary/50 hover:bg-primary/10",
  ghost: "text-mute hover:bg-white/5 hover:text-ink",
  warn: "border border-warn/50 bg-warn/12 text-warn hover:bg-warn/20 shadow-[0_0_16px_rgba(245,158,11,0.12)]",
  danger: "border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20",
  success: "border border-mint/40 bg-mint/10 text-mint hover:bg-mint/20",
};
export function Button({ variant = "outline", size = "md", icon: Icon, className, children, ...rest }: { variant?: BtnVariant; size?: "sm" | "md"; icon?: LucideIcon } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[9px] text-[13px] font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-8 px-3" : "h-10 px-4",
        btn[variant], className,
      )}
      {...rest}
    >
      {Icon && <Icon size={16} aria-hidden="true" />}
      {children}
    </button>
  );
}

export function IconButton({ label, icon: Icon, className, ...rest }: { label: string; icon: LucideIcon } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" aria-label={label} title={label} className={cn("grid h-8 w-8 place-items-center rounded-lg text-mute transition hover:bg-primary/10 hover:text-primary active:scale-95", className)} {...rest}>
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}

export function PillButton({ children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={cn("h-7 rounded-lg border border-line bg-primary/5 px-3 text-xs font-medium text-ink transition hover:border-primary/50 hover:bg-primary/10", className)} {...rest}>
      {children}
    </button>
  );
}

/* ───────────── Badges / status ───────────── */
export function Badge({ tone = "cyan", children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium", toneSoft[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export type Health = "online" | "warning" | "offline";
const healthTone: Record<Health, Tone> = { online: "mint", warning: "warn", offline: "danger" };
export const healthFromService = (s: "Online" | "Warning" | "Offline"): Health => s.toLowerCase() as Health;

export function StatusIndicator({ status = "online", label, pill = false, className, pulse = true }: { status?: Health; label?: string; pill?: boolean; className?: string; pulse?: boolean }) {
  const tone = healthTone[status];
  const hex = toneHex[tone];
  const text = label ?? status[0].toUpperCase() + status.slice(1);
  return (
    <span
      role="status"
      className={cn("inline-flex items-center gap-2 text-xs font-medium", pill && "h-8 rounded-full border px-3", className)}
      style={{ color: hex, ...(pill ? { borderColor: `${hex}66`, background: `${hex}14`, boxShadow: `0 0 14px ${hex}2a` } : {}) }}
    >
      <span className={cn("h-2 w-2 rounded-full", pulse && status === "online" && "animate-pulse-dot")} style={{ background: hex, boxShadow: `0 0 8px ${hex}` }} aria-hidden="true" />
      <span className={pill ? "text-ink" : ""}>{text}</span>
    </span>
  );
}

/* ───────────── Avatar ───────────── */
export function Avatar({ name, tone = "cyan", src, size = 36, online, className }: { name: string; tone?: Tone; src?: string; size?: number; online?: boolean; className?: string }) {
  const hex = toneHex[tone];
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center rounded-full font-semibold text-white", className)} style={{ width: size, height: size, fontSize: size * 0.42, background: `linear-gradient(145deg, ${hex}, ${hex}99)`, boxShadow: `0 0 0 2px ${hex}33` }} aria-hidden="true">
      {src ? <img src={src} alt="" className="h-full w-full rounded-full object-cover" /> : name.trim()[0]?.toUpperCase()}
      {online !== undefined && (
        <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card", online ? "bg-mint" : "bg-dim")} />
      )}
    </span>
  );
}

export function ProgressBar({ value, tone = "cyan", className, label, height = 6 }: { value: number; tone?: Tone; className?: string; label?: string; height?: number }) {
  const hex = toneHex[tone];
  return (
    <div role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label} className={cn("w-full overflow-hidden rounded-full bg-white/[0.06]", className)} style={{ height }}>
      <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${Math.min(100, value)}%`, background: `linear-gradient(90deg, ${hex}, ${hex}cc)`, boxShadow: `0 0 10px ${hex}66` }} />
    </div>
  );
}

/* ───────────── Tooltip ───────────── */
export function Tooltip({ label, children, side = "right", disabled }: { label: string; children: ReactNode; side?: "right" | "bottom" | "top"; disabled?: boolean }) {
  const pos = side === "right" ? "left-full top-1/2 ml-3 -translate-y-1/2" : side === "bottom" ? "top-full left-1/2 mt-2 -translate-x-1/2" : "bottom-full left-1/2 mb-2 -translate-x-1/2";
  return (
    <span className="group/tt relative flex">
      {children}
      {!disabled && (
        <span role="tooltip" className={cn("pointer-events-none absolute z-[80] whitespace-nowrap rounded-md border border-line bg-card3 px-2.5 py-1 text-xs font-medium text-ink opacity-0 shadow-lg transition-opacity duration-150 group-focus-within/tt:opacity-100 group-hover/tt:opacity-100", pos)}>
          {label}
        </span>
      )}
    </span>
  );
}

/* ───────────── Loading / empty / error ───────────── */
export const Skeleton = ({ className }: { className?: string }) => <div aria-hidden="true" className={cn("shimmer", className)} />;

export function EmptyState({ title = "Nothing here yet", message, icon: Icon = Inbox, action }: { title?: string; message?: string; icon?: LucideIcon; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <IconBadge icon={Icon} tone="cyan" size="lg" />
      <p className="mt-2 text-sm font-semibold text-ink">{title}</p>
      {message && <p className="max-w-xs text-xs text-mute">{message}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <IconBadge icon={AlertTriangle} tone="danger" size="lg" />
      <p className="mt-2 text-sm font-semibold text-ink">We couldn't load this data</p>
      <p className="max-w-xs text-xs text-mute">{message ?? "Please check your connection and try again."}</p>
      {onRetry && <Button size="sm" icon={RefreshCw} onClick={onRetry}>Retry</Button>}
    </div>
  );
}

/** Renders skeleton → error → empty → content for any useAsync state. */
export function AsyncBoundary<T>({ state, skeleton, isEmpty, emptyMessage, children }: {
  state: { data: T | null; loading: boolean; error: string | null; reload: () => void };
  skeleton: ReactNode;
  isEmpty?: (d: T) => boolean;
  emptyMessage?: string;
  children: (d: T) => ReactNode;
}) {
  if (state.loading && !state.data) return <>{skeleton}</>;
  if (state.error) return <Panel><ErrorState message={state.error} onRetry={state.reload} /></Panel>;
  if (!state.data || (isEmpty && isEmpty(state.data))) return <Panel><EmptyState message={emptyMessage} /></Panel>;
  return <>{children(state.data)}</>;
}

/* ───────────── Form controls ───────────── */
export function SearchField({ value, onChange, placeholder, label, className }: { value: string; onChange: (v: string) => void; placeholder: string; label?: string; className?: string }) {
  return (
    <label className={cn("field flex h-10 items-center gap-2 px-3", className)}>
      <Search size={16} className="shrink-0 text-mute" aria-hidden="true" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label ?? placeholder} className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-dim focus-visible:outline-none" />
    </label>
  );
}

export function Select<T extends string>({ value, onChange, options, label, className }: { value: T; onChange: (v: T) => void; options: readonly T[]; label: string; className?: string }) {
  return (
    <span className={cn("field relative inline-flex h-9 items-center", className)}>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as T)} className="h-full w-full cursor-pointer appearance-none rounded-[10px] bg-transparent pl-3 pr-8 text-[13px] font-medium text-ink outline-none">
        {options.map((o) => <option key={o} value={o} className="bg-card text-ink">{o}</option>)}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 text-mute" aria-hidden="true" />
    </span>
  );
}

export function Segmented<T extends string>({ options, value, onChange, label, counts }: { options: readonly T[]; value: T; onChange: (v: T) => void; label: string; counts?: Partial<Record<T, number>> }) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-[10px] border border-line bg-bg2/70 p-1">
      {options.map((o) => (
        <button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(o)}
          className={cn("flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition", value === o ? "bg-primary/15 text-primary shadow-[0_0_14px_rgba(0,217,255,0.18)] ring-1 ring-primary/40" : "text-mute hover:bg-white/5 hover:text-ink")}>
          {o}
          {counts?.[o] !== undefined && <span className={cn("rounded px-1.5 text-[10px]", value === o ? "bg-primary/20" : "bg-white/5")}>{counts[o]}</span>}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cn("relative h-5 w-9 shrink-0 rounded-full border transition", checked ? "border-primary/60 bg-primary/30" : "border-white/10 bg-white/5")}>
      <span className={cn("absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all", checked ? "left-[18px] bg-primary shadow-[0_0_8px_#00d9ff]" : "left-0.5 bg-mute")} />
    </button>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-mute">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ───────────── Modal / Drawer ───────────── */
export function Overlay({ title, onClose, children, side = "center", footer }: { title: string; onClose: () => void; children: ReactNode; side?: "center" | "right"; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className={cn("fixed inset-0 z-[70] flex bg-black/60 backdrop-blur-[2px]", side === "right" ? "justify-end" : "items-center justify-center p-4")} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
        className={cn("panel flex max-h-full flex-col overflow-hidden bg-card outline-none animate-fade-up", side === "right" ? "h-full w-full max-w-[460px] rounded-r-none" : "w-full max-w-lg")}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <IconButton label="Close" icon={X} onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ViewAll({ onClick, label = "View All" }: { onClick?: () => void; label?: string }) {
  return <PillButton onClick={onClick} aria-label={label}>{label}</PillButton>;
}
