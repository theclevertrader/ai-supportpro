import { useState } from "react";
import { Check, Download, FileText, Loader, Play, Plus, Reply, Workflow, WandSparkles } from "lucide-react";
import type { AIToolsDTO } from "../api/types";
import { aiApi } from "../api/services";
import { ChatBubbleDemo } from "./ChatDemo";
import { Badge, Button, EmptyState, IconBadge, Overlay, Panel, PanelHeader, ProgressBar, SearchField, Toggle } from "../components/ui";

export type AITool = "prompt" | "escalation" | "replies" | "reports";

function PromptAssistant({ data }: { data: AIToolsDTO["prompt"] }) {
  const [system, setSystem] = useState(data.system);
  const [temp, setTemp] = useState(data.temperature);
  const [test, setTest] = useState("Where is my order?");
  const [ran, setRan] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await aiApi.savePrompt({ system, temperature: temp });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-5">
      <Panel className="p-4 sm:p-5 xl:col-span-3">
        <PanelHeader
          icon={WandSparkles}
          title="System prompt"
          subtitle="Defines tone, grounding rules and escalation behaviour"
          action={
            <Button variant="primary" size="sm" onClick={save} disabled={saving} icon={saved ? Check : undefined}>
              {saved ? "Saved!" : saving ? "Saving..." : "Save prompt"}
            </Button>
          }
        />
        <textarea
          aria-label="System prompt"
          value={system}
          onChange={(e) => setSystem(e.target.value)}
          rows={9}
          className="field mt-4 w-full resize-none p-3 font-mono text-[13px] leading-relaxed outline-none"
        />
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Template variables">
          {data.variables.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setSystem((s) => `${s} ${v}`)}
              className="rounded-md border border-ai/30 bg-ai/10 px-2 py-1 font-mono text-[11px] text-[#c4b5fd] transition hover:bg-ai/20"
            >
              {v}
            </button>
          ))}
        </div>
        <label className="mt-5 block text-xs text-mute">
          <span className="flex justify-between">
            <span>Temperature</span>
            <b className="text-primary">{temp.toFixed(1)}</b>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={temp}
            onChange={(e) => setTemp(+e.target.value)}
            className="mt-2 w-full accent-[#00d9ff]"
          />
        </label>
      </Panel>
      <Panel className="p-4 sm:p-5 xl:col-span-2">
        <PanelHeader icon={Play} tone="mint" title="Test prompt" subtitle="Preview how the assistant would respond" />
        <input
          aria-label="Test message"
          value={test}
          onChange={(e) => {
            setTest(e.target.value);
            setRan(false);
          }}
          className="field mt-4 h-10 w-full px-3 text-sm outline-none"
        />
        <Button className="mt-3 w-full" variant="primary" icon={Play} onClick={() => setRan(true)}>
          Run test
        </Button>
        {ran && (
          <div className="mt-4">
            <ChatBubbleDemo prompt={test} />
          </div>
        )}
      </Panel>
    </div>
  );
}

function AutoEscalation({ data }: { data: AIToolsDTO["rules"] }) {
  const [rules, setRules] = useState(data);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const toggle = async (id: string) => {
    try {
      await aiApi.toggleRule(id);
    } catch { /* fallback */ }
    setRules((list) => list.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)));
  };

  const addRule = async () => {
    if (!form.name.trim()) return;
    try {
      const res = await aiApi.addRule(form);
      setRules((list) => [...list, res.rule]);
    } catch {
      setRules((list) => [
        ...list,
        { id: `r-${Date.now()}`, name: form.name, description: form.description || "Custom trigger", enabled: true }
      ]);
    }
    setModal(false);
    setForm({ name: "", description: "" });
  };

  return (
    <>
      <Panel className="p-4 sm:p-5">
        <PanelHeader
          icon={Workflow}
          tone="warn"
          title="Escalation rules"
          subtitle="When the AI should hand a conversation to a human"
          action={
            <Button size="sm" icon={Plus} onClick={() => setModal(true)}>
              Add rule
            </Button>
          }
        />
        <ul className="mt-4 divide-y divide-white/[0.05]">
          {rules.map((r) => (
            <li key={r.id} className="flex items-center gap-4 py-3.5">
              <IconBadge icon={Workflow} tone={r.enabled ? "warn" : "blue"} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{r.name}</p>
                <p className="text-xs text-mute">{r.description}</p>
              </div>
              <Badge tone={r.enabled ? "mint" : "blue"}>{r.enabled ? "Active" : "Paused"}</Badge>
              <Toggle label={`Toggle ${r.name}`} checked={r.enabled} onChange={() => toggle(r.id)} />
            </li>
          ))}
        </ul>
      </Panel>

      {modal && (
        <Overlay
          title="Add Escalation Rule"
          onClose={() => setModal(false)}
          footer={
            <>
              <Button onClick={() => setModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={addRule}>Save Rule</Button>
            </>
          }
        >
          <div className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1.5 block text-mute">Rule Name</span>
              <input
                className="field h-10 w-full px-3 text-sm outline-none"
                placeholder="e.g. VIP Customer Complaint"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-mute">Trigger Description</span>
              <textarea
                className="field w-full p-3 text-sm outline-none"
                rows={3}
                placeholder="Describe when this rule triggers escalation..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
          </div>
        </Overlay>
      )}
    </>
  );
}

function QuickReplies({ data }: { data: AIToolsDTO["replies"] }) {
  const [replies, setReplies] = useState(data);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ shortcut: "", title: "", body: "" });

  const list = replies.filter((r) => `${r.title} ${r.body} ${r.shortcut}`.toLowerCase().includes(q.toLowerCase()));

  const addReply = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    try {
      const res = await aiApi.addReply(form);
      setReplies((prev) => [res.reply, ...prev]);
    } catch {
      setReplies((prev) => [
        {
          id: `q-${Date.now()}`,
          shortcut: form.shortcut.startsWith("/") ? form.shortcut : `/${form.shortcut || "quick"}`,
          title: form.title,
          body: form.body,
          uses: 0,
        },
        ...prev,
      ]);
    }
    setModal(false);
    setForm({ shortcut: "", title: "", body: "" });
  };

  return (
    <>
      <Panel className="p-4 sm:p-5">
        <PanelHeader
          icon={Reply}
          tone="cyan"
          title="Quick replies"
          subtitle="Saved responses agents and the AI can insert"
          action={
            <Button size="sm" variant="primary" icon={Plus} onClick={() => setModal(true)}>
              New reply
            </Button>
          }
        />
        <SearchField value={q} onChange={setQ} placeholder="Search replies..." className="mt-4 sm:w-72" />
        {list.length === 0 ? (
          <EmptyState title="No replies found" />
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {list.map((r) => (
              <li key={r.id} className="panel panel-hover bg-card2 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-semibold">{r.title}</h3>
                  <code className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">{r.shortcut}</code>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-mute">{r.body}</p>
                <p className="mt-3 text-xs text-dim">Used {r.uses} times</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {modal && (
        <Overlay
          title="Create Quick Reply"
          onClose={() => setModal(false)}
          footer={
            <>
              <Button onClick={() => setModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={addReply}>Create Reply</Button>
            </>
          }
        >
          <div className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1.5 block text-mute">Shortcut</span>
              <input
                className="field h-10 w-full px-3 text-sm outline-none"
                placeholder="e.g. /shipping"
                value={form.shortcut}
                onChange={(e) => setForm({ ...form, shortcut: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-mute">Title</span>
              <input
                className="field h-10 w-full px-3 text-sm outline-none"
                placeholder="e.g. Delivery ETA"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-mute">Response Text</span>
              <textarea
                className="field w-full p-3 text-sm outline-none"
                rows={4}
                placeholder="Type the canned answer text..."
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </label>
          </div>
        </Overlay>
      )}
    </>
  );
}

function Reports({ data }: { data: AIToolsDTO["reports"] }) {
  const [reports, setReports] = useState(data);

  const generate = async () => {
    try {
      const res = await aiApi.generateReport();
      setReports((l) => [res.report, ...l]);
    } catch {
      setReports((l) => [
        {
          id: `p-${Date.now()}`,
          name: `Audit Report (${new Date().toLocaleDateString()})`,
          period: "Last 7 days",
          size: "1.2 MB",
          status: "Ready",
        },
        ...l,
      ]);
    }
  };

  const download = (id: string) => {
    window.open(`/api/ai/reports/${id}/download`, "_blank");
  };

  return (
    <Panel className="p-4 sm:p-5">
      <PanelHeader
        icon={FileText}
        tone="ai"
        title="Reports"
        subtitle="Scheduled and on-demand exports"
        action={
          <Button size="sm" variant="primary" icon={Plus} onClick={generate}>
            Generate report
          </Button>
        }
      />
      <ul className="mt-4 divide-y divide-white/[0.05]">
        {reports.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-4 py-3.5">
            <IconBadge icon={FileText} tone={r.status === "Ready" ? "ai" : "warn"} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{r.name}</p>
              <p className="text-xs text-mute">{r.period} · {r.size}</p>
            </div>
            {r.status === "Ready" ? (
              <Button size="sm" icon={Download} onClick={() => download(r.id)} aria-label={`Download ${r.name}`}>
                Download
              </Button>
            ) : (
              <div className="flex w-36 items-center gap-2 text-xs text-warn">
                <Loader size={14} className="animate-spin" aria-hidden="true" />
                <ProgressBar value={55} tone="warn" label="Generating" />
              </div>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function AIToolView({ tool, data }: { tool: AITool; data: AIToolsDTO }) {
  if (tool === "prompt") return <PromptAssistant data={data.prompt} />;
  if (tool === "escalation") return <AutoEscalation data={data.rules} />;
  if (tool === "replies") return <QuickReplies data={data.replies} />;
  return <Reports data={data.reports} />;
}
