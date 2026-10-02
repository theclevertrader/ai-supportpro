import { dashboardApi } from "./api/services";
import { AppShell } from "./components/AppShell";
import { AppProvider, useApp } from "./context/AppContext";
import { useAsync } from "./hooks/hooks";
import { RealtimeProvider } from "./realtime/RealtimeProvider";
import { DashboardPage } from "./pages/DashboardPage";
import { AIToolPage, AnalyticsPage, ChatPage, CustomersPage, KnowledgePage, SettingsPage, TicketsPage } from "./pages/Pages";

function Routes() {
  const { page } = useApp();
  const dashboard = useAsync(dashboardApi.get);
  return (
    <AppShell ticketCount={dashboard.data?.ticketBadge}>
      {page === "dashboard" && <DashboardPage state={dashboard} />}
      {page === "chat" && <ChatPage />}
      {page === "tickets" && <TicketsPage />}
      {page === "knowledge" && <KnowledgePage />}
      {page === "customers" && <CustomersPage />}
      {page === "analytics" && <AnalyticsPage />}
      {page === "settings" && <SettingsPage />}
      {(page === "prompt" || page === "escalation" || page === "replies" || page === "reports") && <AIToolPage tool={page} />}
    </AppShell>
  );
}

export default function App() {
  return (
    <AppProvider>
      <RealtimeProvider>
        <Routes />
      </RealtimeProvider>
    </AppProvider>
  );
}
