import { useState } from "react";
import { Mail, Sparkles, Star } from "lucide-react";
import type { CustomerDTO } from "../api/types";
import type { Tone } from "../lib/tone";
import { toneText } from "../lib/tone";
import { cn } from "../utils/cn";
import { STATUS_TONE } from "./TicketTable";
import { Avatar, Badge, EmptyState, Overlay, Panel, SearchField, Segmented, Button } from "./ui";

const STATUS: Record<CustomerDTO["status"], Tone> = { Active: "mint", Idle: "blue", "At risk": "danger" };
const SENT: Record<CustomerDTO["sentiment"], Tone> = { Positive: "mint", Neutral: "warn", Negative: "danger" };
const FILTERS = ["All", "Active", "Idle", "At risk"] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-6"><h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-mute">{title}</h3>{children}</section>;
}

function CustomerDrawer({ c, onClose }: { c: CustomerDTO; onClose: () => void }) {
  return (
    <Overlay title="Customer profile" side="right" onClose={onClose} footer={<><Button onClick={onClose}>Close</Button><Button variant="primary" icon={Mail}>Contact</Button></>}>
      <div className="flex items-center gap-4">
        <Avatar name={c.name} tone={c.tone} size={60} />
        <div className="min-w-0"><p className="text-lg font-semibold">{c.name}</p><p className="truncate text-sm text-mute">{c.email}</p><div className="mt-1.5 flex gap-2"><Badge tone="ai">{c.plan}</Badge><Badge tone={STATUS[c.status]} dot>{c.status}</Badge></div></div>
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
        {[["Chats", c.conversations], ["Tickets", c.tickets], ["CSAT", c.satisfaction.toFixed(1)]].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-line bg-card3/60 py-3"><dd className="text-xl font-bold">{v}</dd><dt className="text-[11px] text-mute">{k}</dt></div>
        ))}
      </dl>

      <Section title="Customer sentiment">
        <div className="flex items-center gap-3"><Badge tone={SENT[c.sentiment]} dot>{c.sentiment}</Badge><span className="text-xs text-mute">Based on the last {c.history.length} conversations</span></div>
      </Section>
      <Section title="AI summary">
        <div className="rounded-xl border border-ai/35 bg-ai/10 p-3.5 text-[13px] leading-relaxed text-ink/90"><Sparkles size={14} className="mb-1 text-[#b79cff]" aria-hidden="true" />{c.summary}</div>
      </Section>
      <Section title="Conversation history">
        <ul className="space-y-2">{c.history.map((h) => <li key={h.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-[13px]"><span className="truncate">{h.text}</span><span className="shrink-0 text-xs text-mute">{h.time}</span></li>)}</ul>
      </Section>
      <Section title="Tickets">
        <ul className="space-y-2">{c.ticketIds.map((t) => <li key={t.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-[13px]"><span className="truncate"><b className="text-primary">#{t.id}</b> {t.subject}</span><Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge></li>)}</ul>
      </Section>
      <Section title="Activity timeline">
        <ol className="relative ml-2 space-y-4 border-l border-line pl-5">
          {c.timeline.map((t) => <li key={t.id} className="relative text-[13px]"><span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full border-2 border-card bg-primary shadow-[0_0_8px_#00d9ff]" aria-hidden="true" />{t.text}<span className="block text-xs text-mute">{t.time}</span></li>)}
        </ol>
      </Section>
    </Overlay>
  );
}

export function CustomerTable({ rows }: { rows: CustomerDTO[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [open, setOpen] = useState<CustomerDTO | null>(null);
  const list = rows.filter((r) => (filter === "All" || r.status === filter) && `${r.name} ${r.email} ${r.plan}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <Segmented label="Filter customers by status" options={FILTERS} value={filter} onChange={setFilter} />
          <SearchField value={q} onChange={setQ} placeholder="Search customers..." className="w-full sm:w-72" />
        </div>
        {list.length === 0 ? <EmptyState title="No customers found" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-[13px]">
              <caption className="sr-only">Customers</caption>
              <thead><tr className="border-b border-line text-[11px] uppercase tracking-wider text-mute">
                {["Customer", "Email", "Plan", "Conversations", "Tickets", "Satisfaction", "Last Active", "Status"].map((h) => <th key={h} scope="col" className="whitespace-nowrap px-4 py-3 font-medium">{h}</th>)}
              </tr></thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} className="border-b border-white/[0.04] transition hover:bg-primary/[0.05]">
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => setOpen(c)} className="flex items-center gap-3 text-left font-semibold hover:text-primary" aria-label={`Open profile for ${c.name}`}>
                        <Avatar name={c.name} tone={c.tone} size={32} />{c.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-mute">{c.email}</td>
                    <td className="px-4 py-3"><Badge tone="ai">{c.plan}</Badge></td>
                    <td className="px-4 py-3">{c.conversations}</td>
                    <td className="px-4 py-3">{c.tickets}</td>
                    <td className="px-4 py-3"><span className={cn("inline-flex items-center gap-1 font-semibold", toneText[c.satisfaction >= 4.5 ? "mint" : c.satisfaction >= 4 ? "warn" : "danger"])}><Star size={13} fill="currentColor" aria-hidden="true" />{c.satisfaction.toFixed(1)}</span></td>
                    <td className="whitespace-nowrap px-4 py-3 text-mute">{c.lastActive}</td>
                    <td className="px-4 py-3"><Badge tone={STATUS[c.status]} dot>{c.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {open && <CustomerDrawer c={open} onClose={() => setOpen(null)} />}
    </>
  );
}
