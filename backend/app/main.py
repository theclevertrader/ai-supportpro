from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db
from app.core.middleware import SecurityHeadersMiddleware, RateLimitMiddleware
from app.api.auth import router as auth_router
from app.api.tenants import router as tenants_router
from app.api.knowledge import router as knowledge_router
from app.api.chat import router as chat_router
from app.api.tickets import router as tickets_router
from app.api.analytics import router as analytics_router
from app.api.health import router as health_router
from app.api.audit import router as audit_router
from app.api.integrations import router as integrations_router
from app.api.portal import router as portal_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB schema
    await init_db()
    yield
    # Shutdown logic if required


app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Production-grade, Multi-tenant AI Customer Support SaaS backend. "
        "Provides grounded RAG retrieval, citations, auto-escalation ticketing, and real-time chat."
    ),
    version="1.0.0",
    lifespan=lifespan
)

# Security Middleware Stack
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware, max_requests_per_minute=200)

# CORS Middleware
origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["http://localhost:3000", "http://127.0.0.1:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins and "*" not in origins else ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health_router, prefix=settings.API_V1_STR)
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(tenants_router, prefix=settings.API_V1_STR)
app.include_router(knowledge_router, prefix=settings.API_V1_STR)
app.include_router(chat_router, prefix=settings.API_V1_STR)
app.include_router(tickets_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)
app.include_router(integrations_router, prefix=settings.API_V1_STR)
app.include_router(portal_router)


@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "tagline": "Smart Support. Happier Customers.",
        "version": "1.0.0",
        "docs_url": "/docs",
        "api_prefix": settings.API_V1_STR,
        "status": "operational"
    }
