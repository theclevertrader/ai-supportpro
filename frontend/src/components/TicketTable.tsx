import { useMemo, useState } from "react";
import { Eye, Flag, Plus, UserCheck, Ellipsis } from "lucide-react";
import type { TicketDTO, TicketPriority, TicketStatus } from "../api/types";
import { post } from "../api/client";
import type { Tone } from "../lib/tone";
import { toneText } from "../lib/tone";
import { cn } from "../utils/cn";
import { Badge, Button, EmptyState, IconButton, Overlay, Panel, ProgressBar, SearchField, Segmented, Select } from "./ui";

export const STATUS_TONE: Record<TicketStatus, Tone> = { Open: "cyan", Pending: "warn", Resolved: "mint", Escalated: "danger" };
const PRIORITY_TONE: Record<TicketPriority, Tone> = { Low: "blue", Medium: "ai", High: "warn", Urgent: "danger" };
const FILTERS = ["All", "Open", "Pending", "Resolved", "Escalated"] as const;
type Filter = (typeof FILTERS)[number];
const PRIORITIES: TicketPriority[] = ["Low", "Medium", "High", "Urgent"];
const CATEGORIES = ["General", "Refund", "Shipping", "Billing", "Technical"] as const;

const confTone = (n: number): Tone => (n >= 80 ? "mint" : n >= 60 ? "warn" : "danger");

export function TicketTable({ rows: initial, createSignal }: { rows: TicketDTO[]; createSignal?: number }) {
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<Filter>("All");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<TicketDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [lastSignal, setLastSignal] = useState(createSignal ?? 0);
  if ((createSignal ?? 0) !== lastSignal) { setLastSignal(createSignal ?? 0); setCreating(true); }

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { All: rows.length, Open: 0, Pending: 0, Resolved: 0, Escalated: 0 };
    rows.forEach((r) => { c[r.status]++; });
    return c;
  }, [rows]);

  const visible = rows.filter((r) =>
    (filter === "All" || r.status === filter) &&
    `${r.id} ${r.customer} ${r.subject} ${r.category}`.toLowerCase().includes(q.toLowerCase()));

  const [form, setForm] = useState({ customer: "", subject: "", category: "General" as (typeof CATEGORIES)[number], priority: "Medium" as TicketPriority });
  const create = async () => {
    const next: TicketDTO = {
      id: `TK-${1025 + rows.length - initial.length}`, customer: form.customer || "Unknown customer", subject: form.subject || "Untitled ticket",
      category: form.category, priority: form.priority, status: "Open", aiConfidence: 0, created: "Just now", assignee: "Unassigned",
    };
    setRows((r) => [next, ...r]);
    setCreating(false);
    setForm({ customer: "", subject: "", category: "General", priority: "Medium" });
    try { await post("/api/tickets", next); } catch { /* optimistic: surfaced via realtime reconcile */ }
  };

  return (
    <>
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <Segmented label="Filter tickets by status" options={FILTERS} value={filter} onChange={setFilter} counts={counts} />
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <SearchField value={q} onChange={setQ} placeholder="Search tickets..." className="flex-1 sm:w-64" />
            <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>New</Button>
          </div>
        </div>

        {visible.length === 0 ? <EmptyState title="No tickets match" message="Try a different filter or search term." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-[13px]">
              <caption className="sr-only">Support tickets</caption>
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wider text-mute">
                  {["Ticket ID", "Customer", "Subject", "Category", "Priority", "Status", "AI Confidence", "Created", "Assigned To", "Actions"].map((h) => (
                    <th key={h} scope="col" className="whitespace-nowrap px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => (
                  <tr key={t.id} className="border-b border-white/[0.04] transition hover:bg-primary/[0.05]">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-primary">#{t.id}</td>
                    <td className="whitespace-nowrap px-4 py-3">{t.customer}</td>
                    <td className="max-w-[280px] truncate px-4 py-3 text-ink/90" title={t.subject}>{t.subject}</td>
                    <td className="px-4 py-3 text-mute">{t.category}</td>
                    <td className="px-4 py-3"><span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", toneText[PRIORITY_TONE[t.priority]])}><Flag size={12} aria-hidden="true" />{t.priority}</span></td>
                    <td className="px-4 py-3"><Badge tone={STATUS_TONE[t.status]} dot>{t.status}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex w-28 items-center gap-2">
                        <ProgressBar value={t.aiConfidence} tone={confTone(t.aiConfidence)} label={`AI confidence ${t.aiConfidence}%`} height={5} />
                        <span className={cn("w-9 text-xs font-semibold", toneText[confTone(t.aiConfidence)])}>{t.aiConfidence}%</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-mute">{t.created}</td>
                    <td className="whitespace-nowrap px-4 py-3">{t.assignee === "AI Assistant" ? <Badge tone="ai">AI Assistant</Badge> : <span className={t.assignee === "Unassigned" ? "text-dim" : ""}>{t.assignee}</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <IconButton label={`View ticket ${t.id}`} icon={Eye} onClick={() => setSelected(t)} />
                        <IconButton label={`Assign ticket ${t.id}`} icon={UserCheck} />
                        <IconButton label={`More actions for ${t.id}`} icon={Ellipsis} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3 text-xs text-mute">
          <span>Showing <b className="text-ink">{visible.length}</b> of {rows.length} tickets</span>
          <span>Updates in real time</span>
        </div>
      </Panel>

      {selected && (
        <Overlay title={`Ticket #${selected.id}`} side="right" onClose={() => setSelected(null)}
          footer={<><Button variant="outline" onClick={() => setSelected(null)}>Close</Button><Button variant="warn">Escalate</Button><Button variant="primary">Resolve</Button></>}>
          <h3 className="text-lg font-semibold">{selected.subject}</h3>
          <div className="mt-3 flex flex-wrap gap-2"><Badge tone={STATUS_TONE[selected.status]} dot>{selected.status}</Badge><Badge tone={PRIORITY_TONE[selected.priority]}>{selected.priority}</Badge><Badge tone="cyan">{selected.category}</Badge></div>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
            {[["Customer", selected.customer], ["Assigned to", selected.assignee], ["Created", selected.created], ["AI confidence", `${selected.aiConfidence}%`]].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-line bg-card3/60 p-3"><dt className="text-xs text-mute">{k}</dt><dd className="mt-1 font-medium">{v}</dd></div>
            ))}
          </dl>
        </Overlay>
      )}
      {creating && (
        <Overlay title="Create support ticket" onClose={() => setCreating(false)}
          footer={<><Button onClick={() => setCreating(false)}>Cancel</Button><Button variant="primary" onClick={create}>Create ticket</Button></>}>
          <div className="space-y-4">
            <label className="block text-sm"><span className="mb-1.5 block text-mute">Customer</span><input className="field h-10 w-full px-3 text-sm outline-none" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} /></label>
            <label className="block text-sm"><span className="mb-1.5 block text-mute">Subject</span><input className="field h-10 w-full px-3 text-sm outline-none" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></label>
            <div className="flex gap-3">
              <div className="flex-1"><span className="mb-1.5 block text-sm text-mute">Category</span><Select label="Category" className="w-full" value={form.category} options={CATEGORIES} onChange={(v) => setForm({ ...form, category: v })} /></div>
              <div className="flex-1"><span className="mb-1.5 block text-sm text-mute">Priority</span><Select label="Priority" className="w-full" value={form.priority} options={PRIORITIES} onChange={(v) => setForm({ ...form, priority: v })} /></div>
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
}
