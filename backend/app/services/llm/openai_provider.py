import httpx
from typing import List, Optional
from app.services.llm.base import BaseLLMProvider, LLMResponse, ModelConfig


class OpenAIProvider(BaseLLMProvider):
    """OpenAI API Provider adapter using direct HTTP requests."""

    def __init__(self, api_key: str, model: str = "gpt-4o-mini", embedding_model: str = "text-embedding-3-small"):
        self.api_key = api_key
        self.model = model
        self.embedding_model = embedding_model
        self.base_url = "https://api.openai.com/v1"

    async def generate_response(
        self,
        system_prompt: str,
        user_prompt: str,
        context_chunks: List[str],
        config: Optional[ModelConfig] = None
    ) -> LLMResponse:
        cfg = config or ModelConfig()
        grounded_context = "\n\n---\n\n".join(context_chunks) if context_chunks else "No specific document context available."
        
        messages = [
            {"role": "system", "content": f"{system_prompt}\n\n[AUTHORIZED KNOWLEDGE CONTEXT]:\n{grounded_context}"},
            {"role": "user", "content": user_prompt}
        ]

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model,
                    "messages": messages,
                    "temperature": cfg.temperature,
                    "max_tokens": cfg.max_tokens,
                    "top_p": cfg.top_p
                }
            )
            resp.raise_for_status()
            data = resp.json()

        choice = data["choices"][0]
        usage = data.get("usage", {})
        return LLMResponse(
            content=choice["message"]["content"],
            input_tokens=usage.get("prompt_tokens", 0),
            output_tokens=usage.get("completion_tokens", 0),
            model_name=self.model,
            raw_response=data
        )

    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.base_url}/embeddings",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.embedding_model,
                    "input": texts
                }
            )
            resp.raise_for_status()
            data = resp.json()

        embeddings = [item["embedding"] for item in data["data"]]
        return embeddings
