import { Activity, Building2, Check, Cpu, Database, Fingerprint, KeyRound, Layers, Lock, Network, ScrollText, ShieldCheck, ShieldHalf, Webhook, X, Gauge, Server, type LucideIcon } from "lucide-react";
import type { SecurityDTO, ServiceState } from "../api/types";
import { TENANTS, useApp } from "../context/AppContext";
import type { Tone } from "../lib/tone";
import { BookOpen, Radio, Brain } from "lucide-react";
import { TenantSwitcher } from "./TenantSwitcher";
import { Avatar, Badge, Panel, PanelHeader, IconBadge, StatusIndicator, healthFromService } from "./ui";

const ICONS: Record<string, LucideIcon> = { keys: KeyRound, auth: Fingerprint, rbac: ShieldHalf, tenant: Building2, hooks: Webhook, audit: ScrollText, rate: Gauge, enc: Lock };
const INFRA_ICONS: Record<string, LucideIcon> = { llm: Cpu, vec: Database, emb: Layers, rag: Network, kb: BookOpen, stream: Radio, db: Server, queue: Activity, wh: Webhook };
const STATE_TONE: Record<ServiceState, Tone> = { Online: "mint", Warning: "warn", Offline: "danger" };

function Summary({ items, label }: { items: { status: ServiceState }[]; label: string }) {
  const n = (s: ServiceState) => items.filter((i) => i.status === s).length;
  return (
    <div className="flex flex-wrap items-center gap-3" role="group" aria-label={label}>
      {(["Online", "Warning", "Offline"] as const).map((s) => <Badge key={s} tone={STATE_TONE[s]} dot>{n(s)} {s}</Badge>)}
    </div>
  );
}

export function SecurityPanel({ data }: { data: SecurityDTO }) {
  return (
    <div className="space-y-4">
      <Panel className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3"><IconBadge icon={ShieldCheck} tone="mint" size="lg" /><div><h2 className="text-[15px] font-semibold">Security posture</h2><p className="text-xs text-mute">Enterprise controls enforced for tenant data, API access and AI usage.</p></div></div>
        <Summary items={data.controls} label="Security status summary" />
      </Panel>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.controls.map((c) => (
          <li key={c.id}>
            <Panel hover className="flex h-full flex-col p-4">
              <div className="flex items-start justify-between gap-2"><IconBadge icon={ICONS[c.id] ?? ShieldCheck} tone={STATE_TONE[c.status]} size="md" /><StatusIndicator status={healthFromService(c.status)} /></div>
              <h3 className="mt-3 text-[15px] font-semibold">{c.title}</h3>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-mute">{c.description}</p>
              <p className="mt-3 border-t border-white/[0.06] pt-3 text-xs font-medium text-ink/90">{c.detail}</p>
            </Panel>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InfraStatus({ data }: { data: SecurityDTO }) {
  return (
    <div className="space-y-4">
      <Panel className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3"><IconBadge icon={Brain} tone="ai" size="lg" /><div><h2 className="text-[15px] font-semibold">AI / RAG infrastructure</h2><p className="text-xs text-mute">Live health of every service in the retrieval-augmented generation pipeline.</p></div></div>
        <Summary items={data.infra} label="Infrastructure status summary" />
      </Panel>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.infra.map((s) => (
          <li key={s.id}>
            <Panel hover className="flex items-center gap-3 p-4">
              <IconBadge icon={INFRA_ICONS[s.id] ?? Server} tone={STATE_TONE[s.status]} size="md" />
              <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{s.name}</h3><p className="truncate text-xs text-mute">{s.detail}</p></div>
              <div className="text-right"><StatusIndicator status={healthFromService(s.status)} /><p className="mt-1 text-[11px] text-mute">{s.latency}</p></div>
            </Panel>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WorkspacePanel({ data }: { data: SecurityDTO }) {
  const { tenant } = useApp();
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Panel className="p-4 sm:p-5">
        <PanelHeader icon={Building2} title="Tenant" subtitle={`Current Tenant: ${tenant.name}`} />
        <div className="mt-4"><TenantSwitcher variant="list" /></div>
        <ul className="mt-4 space-y-2 border-t border-line pt-4 text-xs text-mute">
          {data.tenants.filter((t) => TENANTS.some((x) => x.id === t.id)).map((t) => (
            <li key={t.id} className="flex justify-between"><span className={t.id === tenant.id ? "font-semibold text-primary" : ""}>{t.name}</span><span>{t.plan} · {t.region}</span></li>
          ))}
        </ul>
        <p className="mt-4 rounded-lg border border-mint/25 bg-mint/[0.07] p-3 text-xs text-mint"><ShieldCheck size={13} className="mr-1 inline" aria-hidden="true" />All requests carry X-Tenant-ID. Rows, vector namespaces and caches are isolated per tenant.</p>
      </Panel>
      <Panel className="p-4 sm:p-5 xl:col-span-2">
        <PanelHeader icon={ShieldHalf} tone="ai" title="Users & roles" subtitle="Workspace members and permissions" />
        <ul className="mt-4 divide-y divide-white/[0.05]">
          {data.members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2.5"><Avatar name={m.name} size={34} tone="cyan" /><div className="min-w-0 flex-1"><p className="text-[13px] font-semibold">{m.name}</p><p className="truncate text-xs text-mute">{m.email}</p></div><Badge tone={m.role === "Owner" ? "warn" : m.role === "Admin" ? "ai" : "cyan"}>{m.role}</Badge></li>
          ))}
        </ul>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-xs">
            <caption className="sr-only">Role permission matrix</caption>
            <thead><tr className="border-b border-line text-mute"><th scope="col" className="py-2 font-medium">Permission</th>{data.permissions.map((p) => <th key={p.role} scope="col" className="py-2 text-center font-medium">{p.role}</th>)}</tr></thead>
            <tbody>
              {Object.keys(data.permissions[0].perms).map((perm) => (
                <tr key={perm} className="border-b border-white/[0.04]"><th scope="row" className="py-2 font-normal text-ink/90">{perm}</th>
                  {data.permissions.map((p) => <td key={p.role} className="py-2 text-center">{p.perms[perm] ? <Check size={15} className="inline text-mint" aria-label="Allowed" /> : <X size={15} className="inline text-dim" aria-label="Denied" />}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
