from app.core.config import settings
from app.services.llm.base import BaseLLMProvider
from app.services.llm.mock_provider import MockLLMProvider
from app.services.llm.openai_provider import OpenAIProvider
from app.services.llm.gemini_provider import GeminiProvider


def get_llm_provider(provider_name: str = None) -> BaseLLMProvider:
    """
    Factory function to instantiate the configured LLM provider.
    Defaults to MockLLMProvider if keys are absent, ensuring offline stability.
    """
    provider = (provider_name or settings.DEFAULT_LLM_PROVIDER).lower()

    if provider == "openai" and settings.OPENAI_API_KEY:
        return OpenAIProvider(
            api_key=settings.OPENAI_API_KEY,
            model=settings.OPENAI_MODEL,
            embedding_model=settings.OPENAI_EMBEDDING_MODEL
        )
    elif provider == "gemini" and settings.GEMINI_API_KEY:
        return GeminiProvider(
            api_key=settings.GEMINI_API_KEY,
            model=settings.GEMINI_MODEL,
            embedding_model=settings.GEMINI_EMBEDDING_MODEL
        )
    
    # Safe default: High-fidelity deterministic mock provider
    return MockLLMProvider()
