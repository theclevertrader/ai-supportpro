# AI SupportPro — Technical Interview Preparation Guide

This guide provides direct, senior-level explanations for explaining the architecture, design choices, security decisions, and trade-offs of **AI SupportPro** in technical interviews.

---

## 1. 60-Second Elevator Pitch
> *"AI SupportPro is a multi-tenant AI customer support SaaS engineered to solve the hallucination and governance challenges of conversational AI in business. Instead of relying on open-ended chatbots, it uses a deterministic RAG pipeline where every response is strictly grounded in authorized company documentation with verifiable citations. When customer queries involve complex disputes, refund claims, or low retrieval confidence, our rule-based escalation engine automatically flags the session, generates a prioritized support ticket, and hands over context to human agents with zero context loss. It features a Vite 7 + React 19 frontend, a FastAPI/SQLAlchemy async backend, and dual-mode vector support with PostgreSQL+pgvector and standalone local fallbacks."*

---

## 2. 3-Minute Architectural Deep-Dive
1. **Frontend Layer (Vite 7 / React 19 / TypeScript):**
   - Implements both the authenticated admin SaaS portal and the embeddable customer chat widget.
   - Embeddable widget communicates with the backend exclusively via public tenant widget keys (`wgt_...`), preventing private API secret exposure in the browser DOM.
2. **Backend & AI Orchestration (Python 3.11 / FastAPI):**
   - Implements a modular monolith design with strict domain boundaries: `auth_tenant`, `knowledge_rag`, `chat_widget`, `ticketing_escalation`, and `analytics`.
   - Async request processing with Pydantic v2 schemas and native bcrypt password hashing.
3. **Multi-Tenancy & Authorization:**
   - Every single database table maintains a foreign key to `tenant_id`.
   - Access control is verified at the database query level rather than relying on frontend filtering.
   - JWT tokens carry verified `tenant_id` and `role` claims checked by dependency injection guards.
4. **RAG & Vector Retrieval Engine:**
   - Text chunking with sliding token overlap.
   - Provider abstraction supporting OpenAI, Google Gemini, Anthropic, and a zero-dependency deterministic offline mock provider for testability.
   - Computes cosine similarity scores, enforces similarity thresholds (`SIMILARITY_THRESHOLD = 0.65`), and maps traceable citations back to specific document sections.
5. **Deterministic Escalation & Ticketing:**
   - Never allows the LLM to make sensitive business decisions on its own.
   - Keyword triggers (e.g., "damaged", "broken", "fraud", "speak to human") and low similarity scores automatically transition conversations to `ESCALATED` and generate support tickets in the database.

---

## 3. Key Technical Decisions & Justifications

### Q: Why a dedicated Python FastAPI backend instead of a pure Node.js fullstack?
> *"While Node.js works well for simple CRUD, customer support AI requires heavy document parsing (PDF extraction, text chunking, token counting, vector matrix math, and NLP sanitization). Python provides an unmatched ecosystem for AI pipelines (`pypdf`, `sentence-transformers`, `numpy`, and native vector manipulation) that can be easily extended to Celery/Redis workers without blocking event loops."*

### Q: Why PostgreSQL + pgvector?
> *"Rather than introducing an external vector-only database (like Pinecone or Qdrant) which causes dual-write synchronization issues and fragmented backups, pgvector keeps business entities (Tenants, Customers, Tickets) and vector embeddings inside the same ACID-compliant relational database. This makes multi-tenant data deletion, transactions, and foreign key cascades trivial and reliable."*

### Q: How do you defend against Prompt Injection?
> *"We treat all customer messages and uploaded documents as untrusted data, never executable instructions. In our prompt templates, there is an absolute structural separation between `[SYSTEM DIRECTIVE]`, `[POLICY RULES]`, `[UNTRUSTED CONTEXT]`, and `[CUSTOMER QUERY]`. In addition, our document ingestion parser runs regex sanitization to strip jailbreak markers (`'ignore all previous instructions'`), and our low-confidence grounding policy prevents unverified instructions from overriding business rules."*

### Q: How is multi-tenant isolation guaranteed?
> *"Every ORM query explicitly includes `WHERE tenant_id == :authenticated_tenant_id`. Route handlers never accept `tenant_id` from client query parameters or request bodies; they extract it strictly from the cryptographically verified JWT payload. Our automated test suite explicitly proves that Tenant A cannot read, search, or delete Tenant B's documents."*

### Q: What was the hardest bug you solved during development?
> *"Two notable challenges were addressed: First, an incompatibility between Passlib and modern Bcrypt (>v4.0) where Passlib's internal wrap-detection probed Bcrypt with a 100-byte string, triggering Bcrypt's strict 72-byte limit exception. We eliminated this by transitioning to native bcrypt hashing. Second, handling lazy-loading in async SQLAlchemy: when returning a ticket after updating its status, eager-loading related collections (`selectinload(Ticket.notes)`) was required to prevent `MissingGreenlet` async loop errors. Both were resolved with clean, explicit engineering patterns."*

### Q: How do you defend the platform against Account Takeover and Botnet Brute-Forcing?
> *"We implement a dual-layer defense: First, an in-memory sliding window rate limiter throttles traffic to 25 requests per minute on `/auth/login` per IP. Second, to defend against distributed botnets that rotate IP addresses against a single user account, our Account Lockout Policy automatically freezes any account for 15 minutes upon 5 consecutive failed password attempts (HTTP 423 Locked). Furthermore, upon user logout, our cryptographic token blacklist immediately revokes the session to neutralize stolen token replay attacks."*

### Q: How do you prevent Malware Uploads and Web Scraping Vulnerabilities?
> *"In our knowledge ingestion pipeline, we don't rely on file extensions which can be trivially faked. We perform direct magic-byte inspection: rejecting DOS/Windows PE executables (`MZ`), Linux ELF binaries (`\x7fELF`), and validating that PDF files start with `%PDF-` and text files contain zero binary null bytes. For web scraping, our SSRF defense strictly resolves DNS and blocks private subnets (`10.0.0.0/8`, `192.168.0.0/16`), link-local IPs, and cloud metadata (`169.254.169.254`) across every individual redirect hop."*

### Q: How is regulatory compliance (SOC2 / ISO 27001) guaranteed?
> *"Every sensitive operation—including user registration, successful and failed logins, ticket status transitions, internal notes, and document uploads—is recorded into an append-only, immutable `audit_logs` table capturing timestamp, tenant ID, user ID, IP address, user-agent, and action details. Tenant administrators can inspect and export these logs directly from the dashboard."*

