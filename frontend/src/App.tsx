import { Component, type ErrorInfo, type ReactNode } from "react";
import { dashboardApi } from "./api/services";
import { AppShell } from "./components/AppShell";
import { AuthModal } from "./components/AuthModal";
import { Toast } from "./components/Toast";
import { AppProvider, useApp } from "./context/AppContext";
import { useAsync } from "./hooks/hooks";
import { RealtimeProvider } from "./realtime/RealtimeProvider";
import { DashboardPage } from "./pages/DashboardPage";
import { AIToolPage, AnalyticsPage, ChatPage, CustomersPage, KnowledgePage, SettingsPage, TicketsPage } from "./pages/Pages";

interface ErrorBoundaryProps { children: ReactNode }
interface ErrorBoundaryState { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("UI Runtime Error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#020817] p-6 text-center text-white">
          <div className="max-w-md rounded-2xl border border-[rgba(0,217,255,0.25)] bg-[#0b1628] p-8 shadow-2xl">
            <h1 className="text-xl font-bold mb-2 text-[#00d9ff]">Application Error</h1>
            <p className="text-sm text-slate-400 mb-6">{this.state.error?.message || "An unexpected error occurred while rendering the dashboard."}</p>
            <button
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              className="rounded-xl bg-[#00d9ff] px-6 py-2.5 font-semibold text-[#020817] transition hover:opacity-90 active:scale-95"
            >
              Reset Session & Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
      <AuthModal />
      <Toast />
    </AppShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <RealtimeProvider>
          <Routes />
        </RealtimeProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}
