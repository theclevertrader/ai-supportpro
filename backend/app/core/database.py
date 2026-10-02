from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# Normalize sqlite URL for aiosqlite if sqlite is provided
db_url = settings.DATABASE_URL
if db_url.startswith("sqlite://") and not db_url.startswith("sqlite+aiosqlite://"):
    db_url = db_url.replace("sqlite://", "sqlite+aiosqlite://", 1)

engine = create_async_engine(
    db_url,
    echo=settings.DATABASE_ECHO,
    future=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for providing an async database session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """Initializes database schema and tables."""
    # Import all models to ensure they are registered with Base metadata
    import app.models.tenant  # noqa
    import app.models.user  # noqa
    import app.models.customer  # noqa
    import app.models.conversation  # noqa
    import app.models.document  # noqa
    import app.models.ticket  # noqa
    import app.models.analytics  # noqa
    import app.models.audit_log  # noqa

    from sqlalchemy import text
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Safe migration for existing SQLite tables
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0"))
        except Exception:
            pass
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN locked_until DATETIME"))
        except Exception:
            pass
