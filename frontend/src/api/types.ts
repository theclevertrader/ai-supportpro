import type { Tone } from "../lib/tone";

export type MetricIcon =
  | "conversations" | "grounding" | "tickets" | "knowledge" | "tokens"
  | "resolution" | "clock" | "automation" | "escalation" | "csat" | "cost";

export interface MetricDTO {
  id: string;
  title: string;
  value: string;
  delta: number;
  deltaLabel: string;
  /** Which direction of change is "good" (defaults to up). */
  goodWhen?: "up" | "down";
  badge?: string;
  series: number[];
  tone: Tone;
  icon: MetricIcon;
}

export interface ActivityPoint { label: string; conversations: number; escalated: number }
export interface CategoryStat { name: string; count: number; percent: number; tone: Tone }
export interface GaugeDTO { id: string; label: string; value: number; tone: Tone }

export type ChatRole = "ai" | "customer" | "agent";
export interface Citation { title: string; score: number }
export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  time?: string;
  citations?: Citation[];
  escalated?: boolean;
  streaming?: boolean;
}

export interface ConversationDTO {
  id: string;
  customer: string;
  type: string;
  email: string;
  plan: string;
  preview: string;
  time: string;
  online: boolean;
  unread: boolean;
  tone: Tone;
  sentiment: "Positive" | "Neutral" | "Negative";
  messages: ChatMessage[];
}

export type FeedKind = "ticket" | "ai" | "kb" | "customer" | "backup";
export interface FeedEvent { id: string; kind: FeedKind; title: string; detail: string; time: string }

export interface DashboardDTO {
  user: { name: string; role: string; firstName: string };
  ticketBadge: number;
  aiHandledPct: number;
  metrics: MetricDTO[];
  activity: ActivityPoint[];
  categories: CategoryStat[];
  conversations: Omit<ConversationDTO, "messages">[];
  performance: GaugeDTO[];
  feed: FeedEvent[];
}

export type TicketStatus = "Open" | "Pending" | "Resolved" | "Escalated";
export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";
export interface TicketDTO {
  id: string;
  customer: string;
  subject: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  aiConfidence: number;
  created: string;
  assignee: string;
}

export interface CustomerDTO {
  id: string;
  name: string;
  email: string;
  plan: "Enterprise" | "Business" | "Starter" | "VIP Retail";
  conversations: number;
  tickets: number;
  satisfaction: number;
  lastActive: string;
  status: "Active" | "Idle" | "At risk";
  sentiment: "Positive" | "Neutral" | "Negative";
  tone: Tone;
  summary: string;
  history: { id: string; text: string; time: string }[];
  ticketIds: { id: string; subject: string; status: TicketStatus }[];
  timeline: { id: string; text: string; time: string }[];
}

export interface KBArticle {
  id: string;
  title: string;
  category: string;
  updated: string;
  usage: number;
  chunks: number;
  status: "Published" | "Draft" | "Archived";
  embedding: "Embedded" | "Indexing" | "Failed";
  body?: string;
}
export interface KBDTO {
  stats: { articles: number; chunks: number; embeddings: number; retrieval: number };
  categories: string[];
  articles: KBArticle[];
}

export type RangeKey = "today" | "7d" | "30d" | "90d" | "custom";
export interface ChartSeries { key: string; label: string; tone: Tone; values: number[] }
export interface AnalyticsDTO {
  range: RangeKey;
  labels: string[];
  kpis: MetricDTO[];
  charts: Record<"volume" | "tickets" | "ai" | "csat" | "resolution" | "tokens", ChartSeries[]>;
}

export type ServiceState = "Online" | "Warning" | "Offline";
export interface SecurityControl { id: string; title: string; description: string; status: ServiceState; detail: string }
export interface InfraService { id: string; name: string; detail: string; status: ServiceState; latency: string }
export interface SecurityDTO {
  controls: SecurityControl[];
  infra: InfraService[];
  embed: { domains: string[]; publicKey: string; scriptUrl: string };
  tenants: { id: string; name: string; plan: string; region: string }[];
  members: { id: string; name: string; email: string; role: "Owner" | "Admin" | "Agent" | "Viewer" }[];
  permissions: { role: string; perms: Record<string, boolean> }[];
}

export interface NotificationDTO { id: string; title: string; detail: string; time: string; tone: Tone; unread: boolean }

export interface AIToolsDTO {
  prompt: { system: string; variables: string[]; temperature: number };
  rules: { id: string; name: string; description: string; enabled: boolean }[];
  replies: { id: string; shortcut: string; title: string; body: string; uses: number }[];
  reports: { id: string; name: string; period: string; size: string; status: "Ready" | "Generating" }[];
}

export interface ChatAnswer { text: string; citations: Citation[]; escalate: boolean }
