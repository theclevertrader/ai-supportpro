import { ActivityChart } from "../components/ActivityChart";
import { AIAssistant } from "../components/AIAssistant";
import { AIPerformance } from "../components/AIPerformance";
import { ConversationList } from "../components/ConversationList";
import { HeroBanner } from "../components/HeroBanner";
import { MetricCard, MetricCardSkeleton } from "../components/MetricCard";
import { QuickActions } from "../components/QuickActions";
import { RecentActivity } from "../components/RecentActivity";
import { TicketDistribution } from "../components/TicketDistribution";
import { AsyncBoundary, Panel, Skeleton } from "../components/ui";
import type { AsyncState } from "../hooks/hooks";
import type { DashboardDTO } from "../api/types";

const spans = [
  "lg:col-span-2 2xl:col-span-1", "lg:col-span-2 2xl:col-span-1", "lg:col-span-2 2xl:col-span-1",
  "lg:col-span-3 2xl:col-span-1", "sm:col-span-2 lg:col-span-3 2xl:col-span-1",
];
const METRIC_GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 2xl:grid-cols-5";

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading dashboard">
      <Skeleton className="h-[128px] rounded-[14px]" />
      <div className={METRIC_GRID}>{spans.map((s) => <div key={s} className={s}><MetricCardSkeleton /></div>)}</div>
      <div className="grid gap-4 xl:grid-cols-12"><Panel className="h-[330px] xl:col-span-7"><Skeleton className="m-5 h-[290px]" /></Panel><Panel className="h-[330px] xl:col-span-5"><Skeleton className="m-5 h-[290px]" /></Panel></div>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Panel key={i} className="h-[290px]"><Skeleton className="m-4 h-[258px]" /></Panel>)}</div>
    </div>
  );
}

export function DashboardPage({ state }: { state: AsyncState<DashboardDTO> }) {
  return (
    <AsyncBoundary state={state} skeleton={<DashboardSkeleton />} emptyMessage="No dashboard data for this tenant yet.">
      {(d) => (
        <div className="space-y-4">
          <HeroBanner name={d.user.firstName} />

          <section aria-label="Key metrics" className={METRIC_GRID}>
            {d.metrics.map((m, i) => <MetricCard key={m.id} metric={m} className={spans[i]} />)}
          </section>

          <div className="grid gap-4 xl:grid-cols-12 2xl:grid-cols-[minmax(0,2.05fr)_minmax(0,1.7fr)_minmax(0,1.1fr)]">
            <div className="xl:col-span-7 2xl:col-span-1"><ActivityChart data={d.activity} className="h-full p-4 sm:p-5" /></div>
            <div className="xl:col-span-5 2xl:col-span-1"><TicketDistribution data={d.categories} /></div>
            <div className="xl:col-span-12 2xl:col-span-1"><QuickActions /></div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.1fr)]">
            <ConversationList data={d.conversations} />
            <AIPerformance gauges={d.performance} aiHandledPct={d.aiHandledPct} />
            <RecentActivity data={d.feed} />
            <AIAssistant />
          </div>
        </div>
      )}
    </AsyncBoundary>
  );
}
