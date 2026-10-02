import { useState } from "react";
import { Download, FileText, Loader, Play, Plus, Reply, Workflow, WandSparkles } from "lucide-react";
import type { AIToolsDTO } from "../api/types";
import { ChatBubbleDemo } from "./ChatDemo";
import { Badge, Button, EmptyState, IconBadge, Panel, PanelHeader, ProgressBar, SearchField, Toggle } from "../components/ui";

export type AITool = "prompt" | "escalation" | "replies" | "reports";

function PromptAssistant({ data }: { data: AIToolsDTO["prompt"] }) {
  const [system, setSystem] = useState(data.system);
  const [temp, setTemp] = useState(data.temperature);
  const [test, setTest] = useState("Where is my order?");
  const [ran, setRan] = useState(false);
  return (
    <div className="grid gap-4 xl:grid-cols-5">
      <Panel className="p-4 sm:p-5 xl:col-span-3">
        <PanelHeader icon={WandSparkles} title="System prompt" subtitle="Defines tone, grounding rules and escalation behaviour" action={<Button variant="primary" size="sm">Save prompt</Button>} />
        <textarea aria-label="System prompt" value={system} onChange={(e) => setSystem(e.target.value)} rows={9} className="field mt-4 w-full resize-none p-3 font-mono text-[13px] leading-relaxed outline-none" />
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Template variables">
          {data.variables.map((v) => <button key={v} type="button" onClick={() => setSystem((s) => `${s} ${v}`)} className="rounded-md border border-ai/30 bg-ai/10 px-2 py-1 font-mono text-[11px] text-[#c4b5fd] transition hover:bg-ai/20">{v}</button>)}
        </div>
        <label className="mt-5 block text-xs text-mute"><span className="flex justify-between"><span>Temperature</span><b className="text-primary">{temp.toFixed(1)}</b></span>
          <input type="range" min={0} max={1} step={0.1} value={temp} onChange={(e) => setTemp(+e.target.value)} className="mt-2 w-full accent-[#00d9ff]" /></label>
      </Panel>
      <Panel className="p-4 sm:p-5 xl:col-span-2">
        <PanelHeader icon={Play} tone="mint" title="Test prompt" subtitle="Preview how the assistant would respond" />
        <input aria-label="Test message" value={test} onChange={(e) => { setTest(e.target.value); setRan(false); }} className="field mt-4 h-10 w-full px-3 text-sm outline-none" />
        <Button className="mt-3 w-full" variant="primary" icon={Play} onClick={() => setRan(true)}>Run test</Button>
        {ran && <div className="mt-4"><ChatBubbleDemo prompt={test} /></div>}
      </Panel>
    </div>
  );
}

function AutoEscalation({ data }: { data: AIToolsDTO["rules"] }) {
  const [rules, setRules] = useState(data);
  return (
    <Panel className="p-4 sm:p-5">
      <PanelHeader icon={Workflow} tone="warn" title="Escalation rules" subtitle="When the AI should hand a conversation to a human" action={<Button size="sm" icon={Plus}>Add rule</Button>} />
      <ul className="mt-4 divide-y divide-white/[0.05]">
        {rules.map((r) => (
          <li key={r.id} className="flex items-center gap-4 py-3.5">
            <IconBadge icon={Workflow} tone={r.enabled ? "warn" : "blue"} size="sm" />
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{r.name}</p><p className="text-xs text-mute">{r.description}</p></div>
            <Badge tone={r.enabled ? "mint" : "blue"}>{r.enabled ? "Active" : "Paused"}</Badge>
            <Toggle label={`Toggle ${r.name}`} checked={r.enabled} onChange={(v) => setRules(rules.map((x) => (x.id === r.id ? { ...x, enabled: v } : x)))} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function QuickReplies({ data }: { data: AIToolsDTO["replies"] }) {
  const [q, setQ] = useState("");
  const list = data.filter((r) => `${r.title} ${r.body} ${r.shortcut}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Panel className="p-4 sm:p-5">
      <PanelHeader icon={Reply} tone="cyan" title="Quick replies" subtitle="Saved responses agents and the AI can insert" action={<Button size="sm" variant="primary" icon={Plus}>New reply</Button>} />
      <SearchField value={q} onChange={setQ} placeholder="Search replies..." className="mt-4 sm:w-72" />
      {list.length === 0 ? <EmptyState title="No replies found" /> : (
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {list.map((r) => (
            <li key={r.id} className="panel panel-hover bg-card2 p-4">
              <div className="flex items-center justify-between"><h3 className="text-[15px] font-semibold">{r.title}</h3><code className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">{r.shortcut}</code></div>
              <p className="mt-2 text-[13px] leading-relaxed text-mute">{r.body}</p>
              <p className="mt-3 text-xs text-dim">Used {r.uses} times</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Reports({ data }: { data: AIToolsDTO["reports"] }) {
  return (
    <Panel className="p-4 sm:p-5">
      <PanelHeader icon={FileText} tone="ai" title="Reports" subtitle="Scheduled and on-demand exports" action={<Button size="sm" variant="primary" icon={Plus}>Generate report</Button>} />
      <ul className="mt-4 divide-y divide-white/[0.05]">
        {data.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-4 py-3.5">
            <IconBadge icon={FileText} tone={r.status === "Ready" ? "ai" : "warn"} size="sm" />
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{r.name}</p><p className="text-xs text-mute">{r.period} · {r.size}</p></div>
            {r.status === "Ready" ? <Button size="sm" icon={Download} aria-label={`Download ${r.name}`}>Download</Button> : <div className="flex w-36 items-center gap-2 text-xs text-warn"><Loader size={14} className="animate-spin" aria-hidden="true" /><ProgressBar value={55} tone="warn" label="Generating" /></div>}
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
