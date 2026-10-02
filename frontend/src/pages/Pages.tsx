import { useState } from "react";
import { Calendar } from "lucide-react";
import { aiApi, analyticsApi, conversationsApi, customersApi, kbApi, securityApi, ticketsApi } from "../api/services";
import type { RangeKey } from "../api/types";
import { AnalyticsCharts } from "../components/AnalyticsCharts";
import { CustomerTable } from "../components/CustomerTable";
import { EmbedWidget } from "../components/EmbedWidget";
import { KnowledgeBase } from "../components/KnowledgeBase";
import { InfraStatus, SecurityPanel, WorkspacePanel } from "../components/SecurityPanel";
import { TicketTable } from "../components/TicketTable";
import { AsyncBoundary, PageHeader, Panel, Segmented, Skeleton } from "../components/ui";
import { useAsync } from "../hooks/hooks";
import { AIToolView, type AITool } from "./AIToolsPage";
import { LiveChat } from "./LiveChatPage";

const PageSkeleton = ({ rows = 6 }: { rows?: number }) => (
  <Panel className="space-y-3 p-5" aria-busy="true"><Skeleton className="h-10 w-1/3" />{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-12" />)}</Panel>
);

export function ChatPage() {
  const state = useAsync(conversationsApi.list);
  return (
    <div className="space-y-4">
      <PageHeader title="Live Chat" subtitle="Monitor AI conversations, stream responses and hand off to a human when needed." />
      <AsyncBoundary state={state} skeleton={<PageSkeleton />} isEmpty={(d) => d.length === 0} emptyMessage="No conversations yet. Customer chats will appear here.">
        {(list) => <LiveChat list={list} />}
      </AsyncBoundary>
    </div>
  );
}

export function TicketsPage() {
  const state = useAsync(ticketsApi.list);
  return (
    <div className="space-y-4">
      <PageHeader title="Tickets" subtitle="Enterprise ticket management with AI confidence scoring and automatic escalation." />
      <AsyncBoundary state={state} skeleton={<PageSkeleton rows={8} />} isEmpty={(d) => d.length === 0} emptyMessage="No tickets yet.">
        {(rows) => <TicketTable rows={rows} />}
      </AsyncBoundary>
    </div>
  );
}

export function KnowledgePage() {
  const state = useAsync(kbApi.get);
  return (
    <div className="space-y-4">
      <PageHeader title="Knowledge Base" subtitle="Manage the articles your AI assistant retrieves from. Every edit is re-chunked and re-embedded." />
      <AsyncBoundary state={state} skeleton={<PageSkeleton />}>{(d) => <KnowledgeBase data={d} />}</AsyncBoundary>
    </div>
  );
}

export function CustomersPage() {
  const state = useAsync(customersApi.list);
  return (
    <div className="space-y-4">
      <PageHeader title="Customers" subtitle="Profiles, sentiment and AI-generated summaries for every customer." />
      <AsyncBoundary state={state} skeleton={<PageSkeleton rows={8} />} isEmpty={(d) => d.length === 0} emptyMessage="No customers yet.">
        {(rows) => <CustomerTable rows={rows} />}
      </AsyncBoundary>
    </div>
  );
}

const RANGES: { label: string; key: RangeKey }[] = [
  { label: "Today", key: "today" }, { label: "7 Days", key: "7d" }, { label: "30 Days", key: "30d" }, { label: "90 Days", key: "90d" }, { label: "Custom", key: "custom" },
];

export function AnalyticsPage() {
  const [label, setLabel] = useState("7 Days");
  const [dates, setDates] = useState({ from: "", to: "" });
  const key = RANGES.find((r) => r.label === label)?.key ?? "7d";
  const state = useAsync(() => analyticsApi.get(key), [key]);
  return (
    <div className="space-y-4">
      <PageHeader title="Analytics" subtitle="Advanced performance, AI quality and cost analytics."
        actions={<>
          {key === "custom" && (
            <div className="flex items-center gap-2 text-xs text-mute">
              <Calendar size={14} aria-hidden="true" />
              <input type="date" aria-label="From date" value={dates.from} onChange={(e) => setDates({ ...dates, from: e.target.value })} className="field h-9 px-2 text-xs [color-scheme:dark]" />
              <span>to</span>
              <input type="date" aria-label="To date" value={dates.to} onChange={(e) => setDates({ ...dates, to: e.target.value })} className="field h-9 px-2 text-xs [color-scheme:dark]" />
            </div>
          )}
          <Segmented label="Date range" options={RANGES.map((r) => r.label)} value={label} onChange={setLabel} />
        </>} />
      <AsyncBoundary state={state} skeleton={<PageSkeleton rows={5} />}>{(d) => <AnalyticsCharts data={d} loading={state.loading} />}</AsyncBoundary>
    </div>
  );
}

const TABS = ["Security", "Embed", "AI Infrastructure", "Workspace"] as const;
export function SettingsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Security");
  const state = useAsync(securityApi.get);
  return (
    <div className="space-y-4">
      <PageHeader title="Settings" subtitle="Security, embeddable widget, AI infrastructure and workspace administration." actions={<Segmented label="Settings section" options={TABS} value={tab} onChange={setTab} />} />
      <AsyncBoundary state={state} skeleton={<PageSkeleton />}>
        {(d) => tab === "Security" ? <SecurityPanel data={d} /> : tab === "Embed" ? <EmbedWidget data={d.embed} /> : tab === "AI Infrastructure" ? <InfraStatus data={d} /> : <WorkspacePanel data={d} />}
      </AsyncBoundary>
    </div>
  );
}

const TOOL_META: Record<AITool, { title: string; subtitle: string }> = {
  prompt: { title: "Prompt Assistant", subtitle: "Craft and test the system prompt that powers your AI support agent." },
  escalation: { title: "Auto Escalation", subtitle: "Define when conversations are routed to human agents." },
  replies: { title: "Quick Replies", subtitle: "Reusable responses with keyboard shortcuts." },
  reports: { title: "Reports", subtitle: "Download support, AI quality and cost reports." },
};
export function AIToolPage({ tool }: { tool: AITool }) {
  const state = useAsync(aiApi.tools);
  const m = TOOL_META[tool];
  return (
    <div className="space-y-4">
      <PageHeader title={m.title} subtitle={m.subtitle} />
      <AsyncBoundary state={state} skeleton={<PageSkeleton rows={4} />}>{(d) => <AIToolView key={tool} tool={tool} data={d} />}</AsyncBoundary>
    </div>
  );
}
