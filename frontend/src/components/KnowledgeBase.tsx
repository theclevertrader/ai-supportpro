import { useState } from "react";
import { Boxes, Check, Database, Layers, Pencil, Plus, ScanSearch, Trash2, X, type LucideIcon } from "lucide-react";
import type { KBArticle, KBDTO } from "../api/types";
import { kbApi } from "../api/services";
import type { Tone } from "../lib/tone";
import { BookOpen } from "lucide-react";
import { Badge, Button, EmptyState, IconBadge, IconButton, Overlay, Panel, PanelHeader, ProgressBar, SearchField, Segmented, Select, StatusIndicator, type Health } from "./ui";

const STATUS_TONE: Record<KBArticle["status"], Tone> = { Published: "mint", Draft: "warn", Archived: "blue" };
const EMBED_HEALTH: Record<KBArticle["embedding"], Health> = { Embedded: "online", Indexing: "warning", Failed: "offline" };

function Stat({ icon, tone, label, value }: { icon: LucideIcon; tone: Tone; label: string; value: string }) {
  return (
    <Panel hover className="flex items-center gap-3 p-4">
      <IconBadge icon={icon} tone={tone} size="lg" />
      <div><p className="text-xs text-mute">{label}</p><p className="text-2xl font-bold leading-tight">{value}</p></div>
    </Panel>
  );
}

export function KnowledgeBase({ data, createSignal }: { data: KBDTO; createSignal?: number }) {
  const [articles, setArticles] = useState(data.articles);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [editing, setEditing] = useState<Partial<KBArticle> | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [lastSignal, setLastSignal] = useState(createSignal ?? 0);
  if ((createSignal ?? 0) !== lastSignal) { setLastSignal(createSignal ?? 0); setEditing({ category: data.categories[0], status: "Draft" }); }

  const embedded = articles.reduce((n, a) => n + (a.embedding === "Embedded" ? 1 : 0), 0);
  const pct = articles.length ? Math.round((embedded / articles.length) * 100) : 0;
  const indexing = articles.filter((a) => a.embedding === "Indexing").length;
  const failed = articles.filter((a) => a.embedding === "Failed").length;

  const list = articles.filter((a) => (cat === "All" || a.category === cat) && `${a.title} ${a.category}`.toLowerCase().includes(q.toLowerCase()));

  const save = async () => {
    if (!editing?.title?.trim()) return;
    if (editing.id) {
      await kbApi.update(editing as KBArticle);
      setArticles((l) => l.map((a) => (a.id === editing.id ? { ...a, ...editing, updated: "Just now", embedding: "Indexing" } as KBArticle : a)));
    } else {
      const res = await kbApi.create(editing);
      setArticles((l) => [{ id: res.id, title: editing.title!, category: editing.category ?? "General", status: editing.status ?? "Draft", body: editing.body, updated: "Just now", usage: 0, chunks: 0, embedding: "Indexing" }, ...l]);
    }
    setEditing(null);
  };
  const remove = async (id: string) => { await kbApi.remove(id); setArticles((l) => l.filter((a) => a.id !== id)); setConfirm(null); };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={BookOpen} tone="cyan" label="Articles" value={String(articles.length)} />
        <Stat icon={Layers} tone="ai" label="Chunks" value={data.stats.chunks.toLocaleString()} />
        <Stat icon={Database} tone="mint" label="Embeddings" value={data.stats.embeddings.toLocaleString()} />
        <Stat icon={ScanSearch} tone="pink" label="Retrieval success" value={`${data.stats.retrieval}%`} />
      </div>

      <Panel className="p-4 sm:p-5">
        <PanelHeader icon={Boxes} tone="ai" title="Vector Index & Embedding Status" subtitle={`${embedded} of ${articles.length} articles embedded · ${indexing} indexing · ${failed} failed`}
          action={<StatusIndicator status={failed ? "warning" : "online"} label={failed ? "Needs attention" : "Healthy"} pill />} />
        <div className="mt-4 flex items-center gap-3"><ProgressBar value={pct} tone="mint" label="Embedding coverage" height={8} /><span className="w-12 text-right text-sm font-semibold text-mint">{pct}%</span></div>
      </Panel>

      <Panel className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented label="Filter articles by category" options={["All", ...data.categories] as readonly string[]} value={cat} onChange={setCat} />
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <SearchField value={q} onChange={setQ} placeholder="Search articles..." className="flex-1 sm:w-64" />
            <Button variant="primary" icon={Plus} onClick={() => setEditing({ category: data.categories[0], status: "Draft" })}>Create article</Button>
          </div>
        </div>

        {list.length === 0 ? <EmptyState title="No articles found" message="Create an article to teach your AI assistant." /> : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {list.map((a) => (
              <li key={a.id} className="panel panel-hover flex flex-col bg-card2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[15px] font-semibold leading-snug">{a.title}</h3>
                  <Badge tone={STATUS_TONE[a.status]} dot>{a.status}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-mute"><Badge tone="cyan">{a.category}</Badge><span>Updated {a.updated}</span></div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-white/[0.03] py-2"><p className="text-base font-bold">{a.usage}</p><p className="text-mute">Uses</p></div>
                  <div className="rounded-lg bg-white/[0.03] py-2"><p className="text-base font-bold">{a.chunks}</p><p className="text-mute">Chunks</p></div>
                  <div className="flex flex-col items-center justify-center rounded-lg bg-white/[0.03] py-2"><StatusIndicator status={EMBED_HEALTH[a.embedding]} label={a.embedding} className="text-[11px]" /></div>
                </div>
                <div className="mt-4 flex items-center justify-end gap-1 border-t border-white/[0.05] pt-3">
                  {confirm === a.id ? (
                    <>
                      <span className="mr-auto text-xs text-danger">Delete this article?</span>
                      <IconButton label="Confirm delete" icon={Check} className="text-danger" onClick={() => remove(a.id)} />
                      <IconButton label="Cancel delete" icon={X} onClick={() => setConfirm(null)} />
                    </>
                  ) : (
                    <>
                      <IconButton label={`Edit ${a.title}`} icon={Pencil} onClick={() => setEditing(a)} />
                      <IconButton label={`Delete ${a.title}`} icon={Trash2} className="hover:!text-danger" onClick={() => setConfirm(a.id)} />
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {editing && (
        <Overlay title={editing.id ? "Edit article" : "Create article"} onClose={() => setEditing(null)}
          footer={<><Button onClick={() => setEditing(null)}>Cancel</Button><Button variant="primary" onClick={save} disabled={!editing.title?.trim()}>Save & index</Button></>}>
          <div className="space-y-4">
            <label className="block text-sm"><span className="mb-1.5 block text-mute">Title</span><input autoFocus className="field h-10 w-full px-3 text-sm outline-none" value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></label>
            <div className="flex gap-3">
              <div className="flex-1"><span className="mb-1.5 block text-sm text-mute">Category</span><Select label="Category" className="w-full" value={editing.category ?? data.categories[0]} options={data.categories} onChange={(v) => setEditing({ ...editing, category: v })} /></div>
              <div className="flex-1"><span className="mb-1.5 block text-sm text-mute">Status</span><Select label="Status" className="w-full" value={(editing.status ?? "Draft") as KBArticle["status"]} options={["Published", "Draft", "Archived"] as const} onChange={(v) => setEditing({ ...editing, status: v })} /></div>
            </div>
            <label className="block text-sm"><span className="mb-1.5 block text-mute">Content</span><textarea rows={6} className="field w-full resize-none p-3 text-sm outline-none" value={editing.body ?? ""} onChange={(e) => setEditing({ ...editing, body: e.target.value })} /></label>
            <p className="text-xs text-mute">Saving re-chunks the article and queues it for embedding in the tenant's vector namespace.</p>
          </div>
        </Overlay>
      )}
    </div>
  );
}
