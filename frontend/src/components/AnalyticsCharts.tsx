import { Activity, Brain, ChartColumn, Coins, Smile, Ticket, Timer, type LucideIcon } from "lucide-react";
import type { AnalyticsDTO } from "../api/types";
import type { Tone } from "../lib/tone";
import { BarChart } from "./BarChart";
import { LineChart } from "./LineChart";
import { MetricCard } from "./MetricCard";
import { Panel, PanelHeader } from "./ui";

function ChartCard({ icon, tone, title, subtitle, children }: { icon: LucideIcon; tone: Tone; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Panel className="p-4 sm:p-5">
      <PanelHeader icon={icon} tone={tone} title={title} subtitle={subtitle} />
      <div className="mt-4">{children}</div>
    </Panel>
  );
}

export function AnalyticsCharts({ data, loading }: { data: AnalyticsDTO; loading?: boolean }) {
  const { labels, charts, kpis } = data;
  const toBars = (keys: string[], src: typeof charts.tickets) =>
    labels.map((label, i) => ({ label, values: Object.fromEntries(keys.map((k) => [k, src.find((s) => s.key === k)?.values[i] ?? 0])) }));
  return (
    <div className={loading ? "space-y-4 opacity-60 transition-opacity" : "space-y-4 transition-opacity"} aria-busy={loading}>
      <section aria-label="Analytics KPIs" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => <MetricCard key={k.id} metric={k} />)}
      </section>
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard icon={Activity} tone="cyan" title="Conversation Volume" subtitle="Conversations started per interval">
          <LineChart labels={labels} series={charts.volume} ariaLabel="Conversation volume" format={(n) => Math.round(n).toLocaleString()} />
        </ChartCard>
        <ChartCard icon={Ticket} tone="warn" title="Ticket Volume" subtitle="Created vs. resolved tickets">
          <BarChart ariaLabel="Ticket volume" series={charts.tickets.map(({ key, label, tone }) => ({ key, label, tone }))} data={toBars(charts.tickets.map((s) => s.key), charts.tickets).map((d) => ({ ...d, values: Object.fromEntries(Object.entries(d.values).map(([k, v]) => [k, Math.round(v)])) }))} height={200} />
        </ChartCard>
        <ChartCard icon={Brain} tone="ai" title="AI Performance" subtitle="Accuracy, grounding and intent recognition (%)">
          <LineChart labels={labels} series={charts.ai} ariaLabel="AI performance" format={(n) => `${n.toFixed(1)}%`} />
        </ChartCard>
        <ChartCard icon={Smile} tone="mint" title="Customer Satisfaction" subtitle="Average CSAT score (out of 5)">
          <LineChart labels={labels} series={charts.csat} ariaLabel="Customer satisfaction" format={(n) => n.toFixed(2)} />
        </ChartCard>
        <ChartCard icon={Timer} tone="blue" title="Resolution Time" subtitle="Average minutes to resolve">
          <BarChart ariaLabel="Resolution time" series={charts.resolution.map(({ key, label, tone }) => ({ key, label, tone }))} data={toBars(["res"], charts.resolution).map((d) => ({ ...d, values: { res: Math.round(d.values.res) } }))} height={200} />
        </ChartCard>
        <ChartCard icon={Coins} tone="pink" title="Token Consumption" subtitle="Thousands of tokens per interval">
          <LineChart labels={labels} series={charts.tokens} ariaLabel="Token consumption" format={(n) => `${n.toFixed(1)}k`} />
        </ChartCard>
      </div>
      <p className="flex items-center gap-2 text-xs text-mute"><ChartColumn size={14} aria-hidden="true" />Charts are rendered from /api/analytics and resize with their container.</p>
    </div>
  );
}
