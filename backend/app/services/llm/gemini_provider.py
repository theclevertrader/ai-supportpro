import httpx
from typing import List, Optional
from app.services.llm.base import BaseLLMProvider, LLMResponse, ModelConfig


class GeminiProvider(BaseLLMProvider):
    """Google Gemini API Provider adapter."""

    def __init__(self, api_key: str, model: str = "gemini-1.5-flash", embedding_model: str = "text-embedding-004"):
        self.api_key = api_key
        self.model = model
        self.embedding_model = embedding_model
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"

    async def generate_response(
        self,
        system_prompt: str,
        user_prompt: str,
        context_chunks: List[str],
        config: Optional[ModelConfig] = None
    ) -> LLMResponse:
        cfg = config or ModelConfig()
        grounded_context = "\n\n---\n\n".join(context_chunks) if context_chunks else "No specific document context available."
        
        full_prompt = (
            f"[SYSTEM DIRECTIVE]:\n{system_prompt}\n\n"
            f"[AUTHORIZED KNOWLEDGE BASE CONTEXT]:\n{grounded_context}\n\n"
            f"[CUSTOMER INQUIRY]:\n{user_prompt}"
        )

        url = f"{self.base_url}/models/{self.model}:generateContent?key={self.api_key}"
        payload = {
            "contents": [{"parts": [{"text": full_prompt}]}],
            "generationConfig": {
                "temperature": cfg.temperature,
                "maxOutputTokens": cfg.max_tokens,
                "topP": cfg.top_p
            }
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()

        candidate = data.get("candidates", [{}])[0]
        parts = candidate.get("content", {}).get("parts", [{}])
        content = parts[0].get("text", "")
        usage = data.get("usageMetadata", {})

        return LLMResponse(
            content=content,
            input_tokens=usage.get("promptTokenCount", len(full_prompt) // 4),
            output_tokens=usage.get("candidatesTokenCount", len(content) // 4),
            model_name=self.model,
            raw_response=data
        )

    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        url = f"{self.base_url}/models/{self.embedding_model}:batchEmbedContents?key={self.api_key}"
        requests = [{"model": f"models/{self.embedding_model}", "content": {"parts": [{"text": t}]}} for t in texts]
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json={"requests": requests})
            resp.raise_for_status()
            data = resp.json()

        embeddings = [item["values"] for item in data.get("embeddings", [])]
        return embeddings
