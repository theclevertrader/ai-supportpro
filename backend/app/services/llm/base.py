from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class LLMResponse(BaseModel):
    content: str
    input_tokens: int
    output_tokens: int
    model_name: str
    finish_reason: str = "stop"
    raw_response: Optional[Dict[str, Any]] = None


class ModelConfig(BaseModel):
    temperature: float = 0.2
    max_tokens: int = 1000
    top_p: float = 0.95


class BaseLLMProvider(ABC):
    @abstractmethod
    async def generate_response(
        self,
        system_prompt: str,
        user_prompt: str,
        context_chunks: List[str],
        config: Optional[ModelConfig] = None
    ) -> LLMResponse:
        """Generates a grounded LLM response using the provided context chunks."""
        pass

    @abstractmethod
    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generates normalized vector embeddings for a list of text strings."""
        pass
