import { useState } from "react";
import { Check, Code2, Copy, Globe, MessageCircle, Palette, Plus, Send, X } from "lucide-react";
import type { SecurityDTO } from "../api/types";
import { cn } from "../utils/cn";
import { Mascot } from "./Logo";
import { Button, IconButton, Panel, PanelHeader, Segmented, StatusIndicator } from "./ui";

const SWATCHES = [
  { name: "Cyan", hex: "#00D9FF" }, { name: "Mint", hex: "#00E5A8" }, { name: "Purple", hex: "#8B5CF6" },
  { name: "Pink", hex: "#EC4899" }, { name: "Orange", hex: "#F59E0B" },
];

export function EmbedWidget({ data }: { data: SecurityDTO["embed"] }) {
  const [domains, setDomains] = useState(data.domains);
  const [newDomain, setNewDomain] = useState("");
  const [accent, setAccent] = useState(SWATCHES[0].hex);
  const [pos, setPos] = useState<"Right" | "Left">("Right");
  const [greeting, setGreeting] = useState("Hi there! How can we help?");
  const [copied, setCopied] = useState(false);

  const code = `<script
  src="${data.scriptUrl}"
  data-key="${data.publicKey}"
  data-accent="${accent}"
  data-position="${pos.toLowerCase()}"
  async></script>`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); } catch { /* clipboard unavailable */ }
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  };
  const addDomain = () => {
    const d = newDomain.trim().toLowerCase();
    if (d && !domains.includes(d)) setDomains([...domains, d]);
    setNewDomain("");
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="space-y-4">
        <Panel className="p-4 sm:p-5">
          <PanelHeader icon={Code2} title="Installation code" subtitle="Paste before the closing </body> tag" action={<Button size="sm" icon={copied ? Check : Copy} onClick={copy} variant={copied ? "success" : "outline"}>{copied ? "Copied" : "Copy"}</Button>} />
          <pre className="mt-4 overflow-x-auto rounded-lg border border-line bg-bg p-4 text-xs leading-relaxed text-[#8be8ff]"><code>{code}</code></pre>
        </Panel>

        <Panel className="p-4 sm:p-5">
          <PanelHeader icon={Globe} tone="mint" title="Allowed domains" subtitle="The widget only loads on these origins" action={<StatusIndicator status="online" label="Origin check on" />} />
          <ul className="mt-4 space-y-2">
            {domains.map((d) => (
              <li key={d} className="flex items-center justify-between rounded-lg border border-line bg-card3/60 px-3 py-2 text-sm"><span>{d}</span><IconButton label={`Remove ${d}`} icon={X} onClick={() => setDomains(domains.filter((x) => x !== d))} /></li>
            ))}
          </ul>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); addDomain(); }}>
            <input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} aria-label="Add allowed domain" placeholder="example.com" className="field h-10 min-w-0 flex-1 px-3 text-sm outline-none placeholder:text-dim" />
            <Button type="submit" icon={Plus}>Add</Button>
          </form>
        </Panel>

        <Panel className="p-4 sm:p-5">
          <PanelHeader icon={Palette} tone="pink" title="Theme customization" />
          <div className="mt-4 space-y-4">
            <div><p className="mb-2 text-xs text-mute">Accent colour</p>
              <div className="flex gap-2" role="radiogroup" aria-label="Accent colour">
                {SWATCHES.map((s) => (
                  <button key={s.hex} type="button" role="radio" aria-checked={accent === s.hex} aria-label={s.name} onClick={() => setAccent(s.hex)}
                    className={cn("h-8 w-8 rounded-full border-2 transition", accent === s.hex ? "scale-110 border-white" : "border-transparent hover:scale-105")} style={{ background: s.hex, boxShadow: accent === s.hex ? `0 0 14px ${s.hex}` : undefined }} />
                ))}
              </div></div>
            <div><p className="mb-2 text-xs text-mute">Position</p><Segmented label="Widget position" options={["Right", "Left"] as const} value={pos} onChange={setPos} /></div>
            <label className="block text-xs text-mute">Greeting message<input value={greeting} onChange={(e) => setGreeting(e.target.value)} className="field mt-2 h-10 w-full px-3 text-sm text-ink outline-none" /></label>
          </div>
        </Panel>
      </div>

      <Panel className="flex flex-col p-4 sm:p-5">
        <PanelHeader icon={MessageCircle} title="Live Chat Widget · Preview" subtitle="Updates as you change the theme" />
        <div className="relative mt-4 min-h-[480px] flex-1 overflow-hidden rounded-xl border border-line bg-gradient-to-b from-[#0a1626] to-bg">
          <div className="flex items-center gap-1.5 border-b border-line bg-card px-3 py-2"><span className="h-2.5 w-2.5 rounded-full bg-danger/70" /><span className="h-2.5 w-2.5 rounded-full bg-warn/70" /><span className="h-2.5 w-2.5 rounded-full bg-mint/70" /><span className="ml-3 rounded bg-white/5 px-3 py-0.5 text-[11px] text-mute">{domains[0] ?? "your-site.com"}</span></div>
          <div className="space-y-3 p-5" aria-hidden="true">{[70, 90, 55].map((w) => <div key={w} className="h-3 rounded bg-white/[0.05]" style={{ width: `${w}%` }} />)}</div>
          <div className={cn("absolute bottom-4 flex w-[280px] max-w-[85%] flex-col items-end gap-3", pos === "Right" ? "right-4" : "left-4 items-start")}>
            <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-card shadow-2xl">
              <div className="flex items-center gap-2 px-3 py-2.5 text-[#021018]" style={{ background: accent }}><Mascot size={26} glow={false} /><div className="leading-tight"><p className="text-[13px] font-bold">AI SupportPro</p><p className="text-[10px] opacity-80">Typically replies instantly</p></div></div>
              <div className="space-y-2 p-3"><p className="max-w-[85%] rounded-lg rounded-tl-sm bg-card3 px-3 py-2 text-xs">{greeting}</p><p className="ml-auto max-w-[75%] rounded-lg rounded-tr-sm px-3 py-2 text-xs text-[#021018]" style={{ background: accent }}>Where's my order?</p></div>
              <div className="flex items-center gap-2 border-t border-white/5 p-2"><span className="flex-1 rounded-md bg-white/5 px-2 py-1.5 text-[11px] text-dim">Type your message...</span><span className="grid h-7 w-7 place-items-center rounded-full text-[#021018]" style={{ background: accent }}><Send size={12} /></span></div>
            </div>
            <span className="grid h-12 w-12 place-items-center rounded-full text-[#021018] shadow-lg" style={{ background: accent, boxShadow: `0 0 20px ${accent}88` }}><MessageCircle size={22} aria-hidden="true" /></span>
          </div>
        </div>
      </Panel>
    </div>
  );
}
