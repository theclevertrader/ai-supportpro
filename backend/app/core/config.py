import json
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator, ConfigDict


class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "AI SupportPro"
    APP_ENV: str = "development"
    APP_PORT: int = 8000
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Security & Auth
    AUTH_SECRET: str = "super-secret-key-change-in-production-supportpro-2026-secure"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./ai_supportpro.db"
    DATABASE_ECHO: bool = False

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # AI Configuration
    DEFAULT_LLM_PROVIDER: str = "mock"  # mock | openai | gemini | anthropic
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    GEMINI_EMBEDDING_MODEL: str = "text-embedding-004"

    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-3-haiku-20240307"

    # RAG Settings
    SIMILARITY_THRESHOLD: float = 0.35
    MAX_CONTEXT_CHUNKS: int = 4
    CHUNK_SIZE_TOKENS: int = 500
    CHUNK_OVERLAP_TOKENS: int = 50

    # Integrations
    EMAIL_PROVIDER: str = "mock"
    SUPPORT_EMAIL_ADDRESS: str = "support@example.com"
    WHATSAPP_PROVIDER: str = "mock"

    # Cost Tracking (USD per 1k tokens estimate)
    INPUT_TOKEN_COST_USD: float = 0.00015 / 1000
    OUTPUT_TOKEN_COST_USD: float = 0.0006 / 1000

    @field_validator("CORS_ORIGINS", mode="before")
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    model_config = ConfigDict(env_file=".env", case_sensitive=True, extra="ignore")


settings = Settings()
