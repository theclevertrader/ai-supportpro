/**
 * Development transport. Used ONLY when VITE_API_BASE is not configured.
 * Every handler mirrors the JSON contract of the real /api/* endpoints so
 * the UI can be pointed at a backend without code changes.
 */
import type {
  AIToolsDTO, AnalyticsDTO, ChatAnswer, ChartSeries, ConversationDTO, CustomerDTO, DashboardDTO,
  KBDTO, MetricDTO, NotificationDTO, RangeKey, SecurityDTO, TicketDTO, UserProfileDTO,
} from "./types";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const conversations: ConversationDTO[] = [
  {
    id: "c1", customer: "Sarah", type: "VIP Retail Customer", email: "sarah@retailhub.com", plan: "VIP Retail",
    preview: "Hello! Where is my order? It's taking too long...", time: "2m ago", online: true, unread: true, tone: "mint", sentiment: "Negative",
    messages: [
      { id: "m1", role: "customer", text: "Hello! Where is my order? It's taking too long...", time: "10:41" },
      { id: "m2", role: "ai", text: "Hi Sarah, I'm sorry for the wait. Order #ORD-88213 left our warehouse yesterday and is currently in transit with Express Carrier. The estimated delivery is tomorrow before 6 PM.", time: "10:41", citations: [{ title: "Shipping Policy Guide", score: 0.94 }, { title: "Order Tracking FAQ", score: 0.88 }] },
      { id: "m3", role: "customer", text: "It was supposed to arrive three days ago. I'd like a refund.", time: "10:43" },
    ],
  },
  {
    id: "c2", customer: "Ahmed Khan", type: "Business Customer", email: "ahmed@khanlogistics.pk", plan: "Business",
    preview: "Thanks for the quick response!", time: "12m ago", online: true, unread: false, tone: "ai", sentiment: "Positive",
    messages: [
      { id: "m1", role: "customer", text: "How do I add a new team member to my workspace?", time: "10:30" },
      { id: "m2", role: "ai", text: "Open Settings → Workspace → Members and choose Invite. Pick a role (Admin, Agent or Viewer) and they will receive an email invitation.", time: "10:30", citations: [{ title: "Roles & Permissions", score: 0.91 }] },
      { id: "m3", role: "customer", text: "Thanks for the quick response!", time: "10:31" },
    ],
  },
  {
    id: "c3", customer: "Fatima Ali", type: "Starter Plan", email: "fatima.ali@mail.com", plan: "Starter",
    preview: "I need help with a refund please.", time: "28m ago", online: true, unread: true, tone: "warn", sentiment: "Neutral",
    messages: [
      { id: "m1", role: "customer", text: "I need help with a refund please.", time: "10:14" },
      { id: "m2", role: "ai", text: "I can help with that. Refunds are available within 30 days of purchase. Could you share your order number so I can check eligibility?", time: "10:14", citations: [{ title: "Refund & Returns Policy", score: 0.96 }] },
    ],
  },
  {
    id: "c4", customer: "Usman Raza", type: "Enterprise", email: "usman.raza@acmecorp.com", plan: "Enterprise",
    preview: "How can I track my shipment?", time: "1h ago", online: true, unread: false, tone: "blue", sentiment: "Neutral",
    messages: [
      { id: "m1", role: "customer", text: "How can I track my shipment?", time: "09:40" },
      { id: "m2", role: "ai", text: "You can track any shipment from Orders → Tracking, or paste the tracking number into the widget. Want me to look it up for you?", time: "09:40", citations: [{ title: "Order Tracking FAQ", score: 0.93 }] },
    ],
  },
  {
    id: "c5", customer: "Ayesha Siddiqui", type: "Business Customer", email: "ayesha@brightmart.io", plan: "Business",
    preview: "Is there an invoice I can download?", time: "2h ago", online: false, unread: false, tone: "pink", sentiment: "Positive",
    messages: [
      { id: "m1", role: "customer", text: "Is there an invoice I can download?", time: "08:55" },
      { id: "m2", role: "ai", text: "Yes — Billing → Invoices lets you download PDF invoices for any month.", time: "08:55", citations: [{ title: "Billing & Invoices", score: 0.9 }] },
    ],
  },
];

const mockUserProfile: UserProfileDTO = {
  id: "u1",
  name: "Acme Support Admin",
  firstName: "Acme",
  email: "admin@acmestore.com",
  role: "Tenant Admin",
  phone: "+1 (555) 234-5678",
  title: "Lead Support Operations",
  twoFactorEnabled: true,
};

const dashboard: DashboardDTO = {
  user: { name: "Acme Support Admin", firstName: "Acme", role: "Tenant Admin" },
  ticketBadge: 22,
  aiHandledPct: 41.2,
  metrics: [
    { id: "conv", title: "Total Conversations", value: "34", delta: 12, deltaLabel: "vs. yesterday", tone: "cyan", icon: "conversations", series: [8, 10, 9, 13, 11, 15, 14, 18, 16, 21, 19, 26] },
    { id: "ground", title: "AI Grounding Success", value: "41.2%", delta: 8.5, deltaLabel: "vs. yesterday", tone: "mint", icon: "grounding", series: [10, 12, 11, 14, 13, 17, 15, 19, 18, 22, 21, 25] },
    { id: "tickets", title: "Active Tickets", value: "21", delta: 5, deltaLabel: "vs. yesterday", tone: "warn", icon: "tickets", series: [14, 13, 15, 12, 16, 14, 18, 15, 19, 17, 20, 22] },
    { id: "kb", title: "Knowledge Base", value: "3", delta: 0, deltaLabel: "new articles", tone: "ai", icon: "knowledge", series: [10, 11, 10, 12, 13, 12, 14, 13, 15, 14, 16, 17] },
    { id: "tokens", title: "AI Token Consumption", value: "10,962", delta: -18, deltaLabel: "vs. yesterday", goodWhen: "down", badge: "Est. Cost: $0.0031", tone: "pink", icon: "tokens", series: [20, 18, 22, 17, 19, 15, 18, 13, 16, 12, 14, 11] },
  ],
  activity: [
    { label: "Mon", conversations: 6, escalated: 2 },
    { label: "Tue", conversations: 7, escalated: 3 },
    { label: "Wed", conversations: 5, escalated: 2 },
    { label: "Thu", conversations: 8, escalated: 4 },
    { label: "Today", conversations: 12, escalated: 7 },
  ],
  categories: [
    { name: "REFUND", count: 13, percent: 59, tone: "blue" },
    { name: "GENERAL", count: 9, percent: 41, tone: "mint" },
    { name: "SHIPPING", count: 6, percent: 29, tone: "ai" },
    { name: "BILLING", count: 4, percent: 18, tone: "warn" },
    { name: "TECHNICAL", count: 3, percent: 14, tone: "pink" },
  ],
  conversations: conversations.slice(0, 4).map(({ messages: _m, ...rest }) => rest),
  performance: [
    { id: "acc", label: "Grounded Accuracy", value: 89, tone: "cyan" },
    { id: "int", label: "Escalation Control", value: 85, tone: "warn" },
    { id: "gro", label: "Knowledge Grounding", value: 87, tone: "mint" },
    { id: "cs", label: "Resolution Rate", value: 82, tone: "mint" },
  ],
  feed: [
    { id: "f1", kind: "ticket", title: "Ticket #TK-1024 Created", detail: "Refund - Order delayed delivery", time: "2m ago" },
    { id: "f2", kind: "kb", title: "Policy Document Uploaded", detail: "Shipping Policy Guide (5 chunks)", time: "12m ago" },
    { id: "f3", kind: "customer", title: "Customer Session Active", detail: "Live chat initiated via widget", time: "18m ago" },
    { id: "f4", kind: "security", title: "Audit Verification", detail: "SOC2 Compliance Log Clean", time: "1h ago" },
  ],
};

const tickets: TicketDTO[] = [
  { id: "TK-1024", customer: "Sarah", subject: "Refund request – order delayed 3 days", category: "Refund", priority: "Urgent", status: "Escalated", aiConfidence: 62, created: "2m ago", assignee: "Priya Nair" },
  { id: "TK-1023", customer: "Ahmed Khan", subject: "Add team members to workspace", category: "General", priority: "Low", status: "Resolved", aiConfidence: 94, created: "14m ago", assignee: "AI Assistant" },
  { id: "TK-1022", customer: "Fatima Ali", subject: "Refund eligibility for damaged item", category: "Refund", priority: "High", status: "Open", aiConfidence: 78, created: "28m ago", assignee: "Unassigned" },
  { id: "TK-1021", customer: "Usman Raza", subject: "Shipment tracking not updating", category: "Shipping", priority: "Medium", status: "Pending", aiConfidence: 84, created: "1h ago", assignee: "Daniel Cho" },
  { id: "TK-1020", customer: "Ayesha Siddiqui", subject: "Invoice PDF missing tax details", category: "Billing", priority: "Medium", status: "Open", aiConfidence: 71, created: "2h ago", assignee: "Priya Nair" },
  { id: "TK-1019", customer: "Bilal Ahmed", subject: "Widget not loading on checkout page", category: "Technical", priority: "High", status: "Escalated", aiConfidence: 48, created: "3h ago", assignee: "Marcus Webb" },
  { id: "TK-1018", customer: "Zainab Malik", subject: "Change billing email address", category: "Billing", priority: "Low", status: "Resolved", aiConfidence: 97, created: "4h ago", assignee: "AI Assistant" },
  { id: "TK-1017", customer: "Hamza Sheikh", subject: "Duplicate charge on last invoice", category: "Billing", priority: "Urgent", status: "Open", aiConfidence: 55, created: "5h ago", assignee: "Daniel Cho" },
  { id: "TK-1016", customer: "Noor Fatima", subject: "International shipping times", category: "Shipping", priority: "Low", status: "Resolved", aiConfidence: 92, created: "6h ago", assignee: "AI Assistant" },
  { id: "TK-1015", customer: "Omar Farooq", subject: "API rate limit exceeded errors", category: "Technical", priority: "High", status: "Pending", aiConfidence: 66, created: "Yesterday", assignee: "Marcus Webb" },
  { id: "TK-1014", customer: "Hira Javed", subject: "How to export conversation history", category: "General", priority: "Low", status: "Resolved", aiConfidence: 90, created: "Yesterday", assignee: "AI Assistant" },
  { id: "TK-1013", customer: "Tariq Mehmood", subject: "Refund not received after 10 days", category: "Refund", priority: "High", status: "Open", aiConfidence: 59, created: "Yesterday", assignee: "Priya Nair" },
];

const customers: CustomerDTO[] = [
  { id: "u1", name: "Sarah Mitchell", email: "sarah@retailhub.com", plan: "VIP Retail", conversations: 42, tickets: 6, satisfaction: 4.2, lastActive: "2m ago", status: "At risk", sentiment: "Negative", tone: "mint",
    summary: "High-value retail customer frustrated by a delayed order (#ORD-88213). Has asked for a refund. Recommend priority handling and a goodwill credit.",
    history: [{ id: "h1", text: "Where is my order? It's taking too long...", time: "2m ago" }, { id: "h2", text: "Question about loyalty points balance", time: "3d ago" }, { id: "h3", text: "Update shipping address", time: "1w ago" }],
    ticketIds: [{ id: "TK-1024", subject: "Refund request – order delayed", status: "Escalated" }, { id: "TK-0988", subject: "Loyalty points mismatch", status: "Resolved" }],
    timeline: [{ id: "t1", text: "Opened ticket TK-1024", time: "2m ago" }, { id: "t2", text: "Chat session started", time: "5m ago" }, { id: "t3", text: "Upgraded to VIP Retail", time: "2 months ago" }] },
  { id: "u2", name: "Ahmed Khan", email: "ahmed@khanlogistics.pk", plan: "Business", conversations: 18, tickets: 2, satisfaction: 4.9, lastActive: "12m ago", status: "Active", sentiment: "Positive", tone: "ai",
    summary: "Power user managing a 14-seat workspace. Consistently positive; likely candidate for the Enterprise plan.",
    history: [{ id: "h1", text: "How do I add a new team member?", time: "12m ago" }, { id: "h2", text: "Webhook configuration help", time: "5d ago" }],
    ticketIds: [{ id: "TK-1023", subject: "Add team members to workspace", status: "Resolved" }],
    timeline: [{ id: "t1", text: "Invited 2 new members", time: "1h ago" }, { id: "t2", text: "Configured webhook", time: "5d ago" }] },
  { id: "u3", name: "Fatima Ali", email: "fatima.ali@mail.com", plan: "Starter", conversations: 7, tickets: 3, satisfaction: 4.4, lastActive: "28m ago", status: "Active", sentiment: "Neutral", tone: "warn",
    summary: "New customer exploring refund options for a damaged item. Responds well to concise step-by-step instructions.",
    history: [{ id: "h1", text: "I need help with a refund please.", time: "28m ago" }],
    ticketIds: [{ id: "TK-1022", subject: "Refund eligibility for damaged item", status: "Open" }],
    timeline: [{ id: "t1", text: "Submitted refund request", time: "28m ago" }] },
  { id: "u4", name: "Usman Raza", email: "usman.raza@acmecorp.com", plan: "Enterprise", conversations: 63, tickets: 9, satisfaction: 4.7, lastActive: "1h ago", status: "Active", sentiment: "Neutral", tone: "blue",
    summary: "Enterprise admin with high ticket volume around shipping integrations. SLA 1h response.",
    history: [{ id: "h1", text: "How can I track my shipment?", time: "1h ago" }],
    ticketIds: [{ id: "TK-1021", subject: "Shipment tracking not updating", status: "Pending" }],
    timeline: [{ id: "t1", text: "SLA check passed", time: "1h ago" }] },
  { id: "u5", name: "Ayesha Siddiqui", email: "ayesha@brightmart.io", plan: "Business", conversations: 21, tickets: 4, satisfaction: 4.8, lastActive: "2h ago", status: "Idle", sentiment: "Positive", tone: "pink",
    summary: "Finance contact at BrightMart. Mostly billing questions; very satisfied with AI answers.",
    history: [{ id: "h1", text: "Is there an invoice I can download?", time: "2h ago" }],
    ticketIds: [{ id: "TK-1020", subject: "Invoice PDF missing tax details", status: "Open" }],
    timeline: [{ id: "t1", text: "Downloaded invoice INV-2291", time: "2h ago" }] },
  { id: "u6", name: "Bilal Ahmed", email: "bilal@shopwave.co", plan: "Business", conversations: 11, tickets: 5, satisfaction: 3.6, lastActive: "3h ago", status: "At risk", sentiment: "Negative", tone: "danger",
    summary: "Developer blocked by widget embed issue on checkout. Escalated to engineering. Churn risk if not resolved today.",
    history: [{ id: "h1", text: "Widget not loading on checkout page", time: "3h ago" }],
    ticketIds: [{ id: "TK-1019", subject: "Widget not loading on checkout", status: "Escalated" }],
    timeline: [{ id: "t1", text: "Escalated to engineering", time: "3h ago" }] },
  { id: "u7", name: "Zainab Malik", email: "zainab@pixelcraft.dev", plan: "Starter", conversations: 4, tickets: 1, satisfaction: 5.0, lastActive: "4h ago", status: "Idle", sentiment: "Positive", tone: "mint",
    summary: "Solo founder on Starter. Quick resolutions; no concerns.",
    history: [{ id: "h1", text: "Change billing email address", time: "4h ago" }],
    ticketIds: [{ id: "TK-1018", subject: "Change billing email address", status: "Resolved" }],
    timeline: [{ id: "t1", text: "Billing email updated", time: "4h ago" }] },
  { id: "u8", name: "Omar Farooq", email: "omar@nexbyte.io", plan: "Enterprise", conversations: 37, tickets: 8, satisfaction: 4.1, lastActive: "Yesterday", status: "Active", sentiment: "Neutral", tone: "cyan",
    summary: "API-heavy customer hitting rate limits. Recommend raising limits as part of the Enterprise agreement.",
    history: [{ id: "h1", text: "API rate limit exceeded errors", time: "Yesterday" }],
    ticketIds: [{ id: "TK-1015", subject: "API rate limit exceeded errors", status: "Pending" }],
    timeline: [{ id: "t1", text: "Rate limit alert triggered", time: "Yesterday" }] },
];

const kb: KBDTO = {
  stats: { articles: 48, chunks: 1286, embeddings: 1286, retrieval: 91.4 },
  categories: ["Shipping", "Refunds", "Billing", "Account", "Technical", "General"],
  articles: [
    { id: "a1", title: "Shipping Policy Guide", category: "Shipping", updated: "12m ago", usage: 412, chunks: 24, status: "Published", embedding: "Embedded", body: "Standard shipping takes 3–5 business days. Express shipping takes 1–2 business days." },
    { id: "a2", title: "Refund & Returns Policy", category: "Refunds", updated: "2d ago", usage: 538, chunks: 31, status: "Published", embedding: "Embedded", body: "Refunds are available within 30 days of purchase for unused items." },
    { id: "a3", title: "Order Tracking FAQ", category: "Shipping", updated: "4d ago", usage: 366, chunks: 18, status: "Published", embedding: "Embedded", body: "Track any order from Orders → Tracking or via the chat widget." },
    { id: "a4", title: "Billing & Invoices", category: "Billing", updated: "1w ago", usage: 217, chunks: 22, status: "Published", embedding: "Embedded", body: "Invoices are generated on the 1st of each month." },
    { id: "a5", title: "Roles & Permissions", category: "Account", updated: "1w ago", usage: 143, chunks: 15, status: "Published", embedding: "Embedded", body: "Owner, Admin, Agent and Viewer roles with granular permissions." },
    { id: "a6", title: "Widget Installation Guide", category: "Technical", updated: "3h ago", usage: 98, chunks: 12, status: "Published", embedding: "Indexing", body: "Paste the script tag before the closing body tag." },
    { id: "a7", title: "Webhook Event Reference", category: "Technical", updated: "Just now", usage: 0, chunks: 0, status: "Draft", embedding: "Indexing", body: "List of webhook events and payload schema." },
    { id: "a8", title: "Loyalty Program FAQ", category: "General", updated: "3w ago", usage: 61, chunks: 9, status: "Archived", embedding: "Failed", body: "Earn 1 point per $1 spent." },
  ],
};

const security: SecurityDTO = {
  controls: [
    { id: "keys", title: "API Keys", description: "Scoped secret keys with rotation and per-key rate limits.", status: "Online", detail: "3 active · rotated 12d ago" },
    { id: "auth", title: "Authentication", description: "SSO (SAML/OIDC), MFA enforcement and session policies.", status: "Online", detail: "MFA enforced · 100% of admins" },
    { id: "rbac", title: "Role-Based Access", description: "Owner, Admin, Agent and Viewer roles with permission sets.", status: "Online", detail: "4 roles · 12 members" },
    { id: "tenant", title: "Tenant Isolation", description: "Row-level isolation and per-tenant vector namespaces.", status: "Online", detail: "Namespace: acme-store" },
    { id: "hooks", title: "Webhooks", description: "Signed outbound events with retries and dead-letter queue.", status: "Warning", detail: "1 endpoint failing (HTTP 502)" },
    { id: "audit", title: "Audit Logs", description: "Immutable record of admin and API activity, 365 day retention.", status: "Online", detail: "2,481 events this week" },
    { id: "rate", title: "Rate Limits", description: "Adaptive request throttling per key, IP and tenant.", status: "Online", detail: "1,000 req/min · 18% used" },
    { id: "enc", title: "Data Encryption", description: "AES-256 at rest and TLS 1.3 in transit, customer-managed keys.", status: "Online", detail: "AES-256 · TLS 1.3" },
  ],
  infra: [
    { id: "llm", name: "LLM", detail: "Primary model gateway", status: "Online", latency: "412 ms" },
    { id: "vec", name: "Vector Database", detail: "Namespace acme-store", status: "Online", latency: "28 ms" },
    { id: "emb", name: "Embeddings", detail: "Embedding service", status: "Online", latency: "96 ms" },
    { id: "rag", name: "RAG", detail: "Retrieval pipeline", status: "Online", latency: "184 ms" },
    { id: "kb", name: "Knowledge Base", detail: "Indexer", status: "Warning", latency: "2 jobs pending" },
    { id: "stream", name: "Streaming", detail: "SSE gateway", status: "Online", latency: "12 ms" },
    { id: "db", name: "Database", detail: "Primary + replica", status: "Online", latency: "9 ms" },
    { id: "queue", name: "Queue", detail: "Background workers", status: "Online", latency: "0 backlog" },
    { id: "wh", name: "Webhooks", detail: "Outbound delivery", status: "Offline", latency: "Endpoint 502" },
  ],
  embed: { domains: ["acme-store.com", "shop.acme-store.com", "staging.acme-store.com"], publicKey: "pk_live_acme_8f3c2a91d7", scriptUrl: "https://cdn.aisupportpro.com/widget.js" },
  tenants: [
    { id: "acme", name: "Acme Store", plan: "Enterprise", region: "us-east-1" },
    { id: "demo", name: "Demo Store", plan: "Business", region: "eu-west-1" },
    { id: "ent", name: "Enterprise Store", plan: "Enterprise", region: "ap-south-1" },
  ],
  members: [
    { id: "m1", name: "Acme Owner", email: "admin@acmestore.com", role: "Owner" },
    { id: "m2", name: "Priya Nair", email: "priya@acme-store.com", role: "Admin" },
    { id: "m3", name: "Daniel Cho", email: "daniel@acme-store.com", role: "Agent" },
    { id: "m4", name: "Marcus Webb", email: "marcus@acme-store.com", role: "Agent" },
    { id: "m5", name: "Lena Fischer", email: "lena@acme-store.com", role: "Viewer" },
  ],
  permissions: [
    { role: "Owner", perms: { "View conversations": true, "Reply to customers": true, "Manage knowledge base": true, "Manage billing": true, "Manage API keys": true } },
    { role: "Admin", perms: { "View conversations": true, "Reply to customers": true, "Manage knowledge base": true, "Manage billing": false, "Manage API keys": true } },
    { role: "Agent", perms: { "View conversations": true, "Reply to customers": true, "Manage knowledge base": false, "Manage billing": false, "Manage API keys": false } },
    { role: "Viewer", perms: { "View conversations": true, "Reply to customers": false, "Manage knowledge base": false, "Manage billing": false, "Manage API keys": false } },
  ],
};

const notifications: NotificationDTO[] = [
  { id: "n1", title: "Ticket #TK-1024 escalated", detail: "Refund request from Sarah needs a human agent", time: "2m ago", tone: "warn", unread: true },
  { id: "n2", title: "Webhook endpoint failing", detail: "https://hooks.acme-store.com returned 502", time: "21m ago", tone: "danger", unread: true },
  { id: "n3", title: "Embedding job completed", detail: "Shipping Policy Guide indexed (24 chunks)", time: "1h ago", tone: "mint", unread: true },
];

const aiTools: AIToolsDTO = {
  prompt: {
    system: "You are AI SupportPro, a helpful, concise support assistant for {{tenant.name}}.\nAnswer ONLY using the retrieved knowledge base context. If confidence is below {{threshold}}, offer a human handoff.\nAlways cite the sources you used and keep a friendly, professional tone.",
    variables: ["{{tenant.name}}", "{{customer.name}}", "{{customer.plan}}", "{{threshold}}", "{{kb.context}}"],
    temperature: 0.2,
  },
  rules: [
    { id: "r1", name: "Low AI confidence", description: "Escalate when grounding confidence is below 60%.", enabled: true },
    { id: "r2", name: "Negative sentiment", description: "Escalate VIP customers after two negative messages.", enabled: true },
    { id: "r3", name: "Refund over $500", description: "Route high-value refund requests to a human approver.", enabled: true },
    { id: "r4", name: "Customer asks for a human", description: "Immediately hand off when requested by the customer.", enabled: true },
    { id: "r5", name: "Repeated contact", description: "Escalate after three contacts about the same issue in 24h.", enabled: false },
  ],
  replies: [
    { id: "q1", shortcut: "/refund", title: "Refund policy", body: "Refunds are available within 30 days of purchase for unused items. I can start one for you right now.", uses: 184 },
    { id: "q2", shortcut: "/ship", title: "Shipping times", body: "Standard shipping takes 3–5 business days, express takes 1–2 business days.", uses: 152 },
    { id: "q3", shortcut: "/track", title: "Track my order", body: "You can track your order from Orders → Tracking. Share the order number and I'll look it up.", uses: 131 },
    { id: "q4", shortcut: "/human", title: "Live agent", body: "Of course! I'm connecting you with a member of our support team now.", uses: 97 },
  ],
  reports: [
    { id: "p1", name: "Weekly Support Summary", period: "Last 7 days", size: "1.2 MB", status: "Ready" },
    { id: "p2", name: "AI Accuracy & Grounding", period: "Last 30 days", size: "860 KB", status: "Ready" },
    { id: "p3", name: "Token Usage & Cost", period: "This month", size: "310 KB", status: "Ready" },
    { id: "p4", name: "Customer Satisfaction", period: "Last 90 days", size: "—", status: "Generating" },
  ],
};

/* ---------- analytics (deterministic generator, scaled by range) ---------- */
const rangeLabels: Record<RangeKey, string[]> = {
  today: ["12a", "3a", "6a", "9a", "12p", "3p", "6p", "9p"],
  "7d": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  "30d": ["1–3", "4–6", "7–9", "10–12", "13–15", "16–18", "19–21", "22–24", "25–27", "28–30"],
  "90d": ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12"],
  custom: ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "D11", "D12", "D13", "D14"],
};
const rangeScale: Record<RangeKey, number> = { today: 1, "7d": 7, "30d": 30, "90d": 90, custom: 14 };

const gen = (n: number, base: number, amp: number, phase: number, trend = 0) =>
  Array.from({ length: n }, (_, i) => Math.max(0, +(base + amp * Math.sin(i * 1.15 + phase) + trend * i).toFixed(1)));

function buildAnalytics(range: RangeKey): AnalyticsDTO {
  const labels = rangeLabels[range];
  const n = labels.length;
  const s = rangeScale[range];
  const sp = (a: number, b: number, c: number) => gen(n, a, b, c, b / 6);
  const kpi = (m: Omit<MetricDTO, "series" | "deltaLabel"> & { deltaLabel?: string }, seed: number): MetricDTO => ({
    deltaLabel: "vs. previous period", ...m, series: sp(10, 4, seed),
  });
  const series = (key: string, label: string, tone: ChartSeries["tone"], base: number, amp: number, ph: number): ChartSeries =>
    ({ key, label, tone, values: gen(n, base, amp, ph, amp / 8).map((v) => +v.toFixed(1)) });
  return {
    range, labels,
    kpis: [
      kpi({ id: "k1", title: "Total Conversations", value: (34 * s).toLocaleString(), delta: 12, tone: "cyan", icon: "conversations" }, 0),
      kpi({ id: "k2", title: "Resolution Rate", value: "87.4%", delta: 3.1, tone: "mint", icon: "resolution" }, 1),
      kpi({ id: "k3", title: "Avg. Response Time", value: "1m 42s", delta: -14, goodWhen: "down", tone: "blue", icon: "clock" }, 2),
      kpi({ id: "k4", title: "AI Automation Rate", value: "41.2%", delta: 8.5, tone: "ai", icon: "automation" }, 3),
      kpi({ id: "k5", title: "Escalation Rate", value: "9.8%", delta: -2.2, goodWhen: "down", tone: "warn", icon: "escalation" }, 4),
      kpi({ id: "k6", title: "CSAT", value: "4.8 / 5", delta: 0.4, tone: "mint", icon: "csat" }, 5),
      kpi({ id: "k7", title: "Token Usage", value: (10962 * s).toLocaleString(), delta: -18, goodWhen: "down", tone: "pink", icon: "tokens" }, 6),
      kpi({ id: "k8", title: "Estimated AI Cost", value: `$${(0.0031 * s).toFixed(4)}`, delta: -18, goodWhen: "down", tone: "danger", icon: "cost" }, 7),
    ],
    charts: {
      volume: [series("conv", "Conversations", "cyan", 30, 12, 0.2)],
      tickets: [series("created", "Created", "warn", 12, 5, 0.9), series("resolved", "Resolved", "mint", 10, 4, 1.6)],
      ai: [series("acc", "Accuracy", "cyan", 94, 3, 0.4), series("ground", "Grounding", "mint", 85, 4, 1.1), series("intent", "Intent", "ai", 90, 3, 2)],
      csat: [series("csat", "CSAT", "mint", 4.6, 0.25, 0.8)],
      resolution: [series("res", "Minutes", "blue", 8, 3, 1.3)],
      tokens: [series("tok", "Tokens (k)", "pink", 11, 3, 0.1)],
    },
  };
}

/* ---------- chat answers ---------- */
export function mockAnswer(prompt: string): ChatAnswer {
  const p = prompt.toLowerCase();
  if (/(agent|human|person)/.test(p))
    return { text: "Of course. I'm handing this conversation to a human agent now. Priya from the support team will join in under two minutes, with the full conversation context.", citations: [], escalate: true };
  if (/(refund|money back|return)/.test(p))
    return { text: "Refunds are available within 30 days of purchase for unused items. I can start the process now. It usually takes 3–5 business days for the funds to appear on your statement.", citations: [{ title: "Refund & Returns Policy", score: 0.96 }], escalate: false };
  if (/(ship|delivery|how long|time)/.test(p))
    return { text: "Standard shipping takes 3–5 business days and express shipping takes 1–2 business days. International orders typically arrive within 7–10 business days.", citations: [{ title: "Shipping Policy Guide", score: 0.95 }], escalate: false };
  if (/(track|order|where)/.test(p))
    return { text: "I can help you track it. Open Orders → Tracking, or share your order number and I'll look it up. Your latest order is in transit and expected tomorrow.", citations: [{ title: "Order Tracking FAQ", score: 0.92 }, { title: "Shipping Policy Guide", score: 0.81 }], escalate: false };
  return { text: "Thanks for reaching out. I couldn't find a confident answer in the knowledge base for that. Would you like me to connect you with a human agent?", citations: [{ title: "General Support FAQ", score: 0.52 }], escalate: false };
}

/* ---------- router ---------- */
export async function mockRequest<T>(path: string, init?: RequestInit): Promise<T> {
  await wait(380);
  const url = new URL(path, "http://local");
  const p = url.pathname;
  const method = (init?.method ?? "GET").toUpperCase();
  const body = init?.body ? JSON.parse(String(init.body)) : undefined;
  let out: unknown;

  if (p === "/api/dashboard") out = dashboard;
  else if (p === "/api/user/profile" && method === "GET") out = mockUserProfile;
  else if (p === "/api/user/profile" && method === "PUT") {
    if (body) {
      Object.assign(mockUserProfile, body);
      if (body.name) {
        mockUserProfile.firstName = String(body.name).split(" ")[0];
        dashboard.user.name = String(body.name);
        dashboard.user.firstName = mockUserProfile.firstName;
      }
    }
    out = mockUserProfile;
  }
  else if (p === "/api/user/change-password") out = { ok: true, message: "Password updated successfully." };
  else if (p === "/api/auth/logout") out = { ok: true, message: "Successfully signed out." };
  else if (p === "/api/auth/login") out = { ok: true, user: mockUserProfile };
  else if (p === "/api/conversations") out = conversations;
  else if (p === "/api/tickets") out = tickets;
  else if (p === "/api/customers") out = customers;
  else if (p === "/api/knowledge-base" && method === "GET") out = kb;
  else if (p.startsWith("/api/knowledge-base") && method !== "GET") out = { ok: true, id: body?.id ?? `a${Date.now()}` };
  else if (p === "/api/analytics") out = buildAnalytics((url.searchParams.get("range") as RangeKey) ?? "7d");
  else if (p === "/api/security") out = security;
  else if (p === "/api/notifications") out = notifications;
  else if (p === "/api/ai/tools") out = aiTools;
  else throw new Error(`No mock handler for ${method} ${p}`);
  return structuredClone(out) as T;
}
