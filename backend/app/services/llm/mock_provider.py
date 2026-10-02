import hashlib
import math
from typing import List, Optional
from app.services.llm.base import BaseLLMProvider, LLMResponse, ModelConfig


class MockLLMProvider(BaseLLMProvider):
    """
    High-fidelity offline deterministic LLM & Embedding provider.
    Enables 100% of RAG retrieval, cosine vector ranking, citation mapping,
    and grounded synthesis to be verified without requiring paid cloud API keys.
    """

    STOP_WORDS = {"what", "is", "your", "the", "a", "an", "and", "or", "in", "on", "to", "for", "with", "of", "at", "by"}

    KEYWORD_BOOSTS = {
        "refund": 3.0,
        "return": 3.0,
        "shipping": 3.0,
        "delivery": 3.0,
        "warranty": 3.0,
        "policy": 2.0,
        "order": 2.0,
        "exchange": 2.5,
        "support": 2.0,
        "defective": 2.5,
        "damaged": 2.5
    }

    def __init__(self, dimension: int = 128):
        self.dimension = dimension
        self.model_name = "mock-semantic-llm-v1"

    async def generate_response(
        self,
        system_prompt: str,
        user_prompt: str,
        context_chunks: List[str],
        config: Optional[ModelConfig] = None
    ) -> LLMResponse:
        prompt_len = len(system_prompt) + len(user_prompt) + sum(len(c) for c in context_chunks)
        input_tokens = max(10, prompt_len // 4)
        lower_prompt = user_prompt.lower()

        # Check explicit human handoff triggers
        escalation_keywords = ["human", "agent", "representative", "manager", "lawyer", "speak to someone", "real person"]
        if any(kw in lower_prompt for kw in escalation_keywords):
            content = (
                "I understand you would like to speak directly with a human team member. "
                "I have prioritized your request and initiated an escalation. "
                "A support agent will take over this conversation shortly."
            )
            output_tokens = len(content) // 4
            return LLMResponse(
                content=content,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                model_name=self.model_name
            )

        if not context_chunks:
            content = (
                "I couldn't find verified information regarding your question in the available knowledge base. "
                "To ensure you receive accurate details, I can open a support ticket or connect you with a team member."
            )
            output_tokens = len(content) // 4
            return LLMResponse(
                content=content,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                model_name=self.model_name
            )

        # Synthesize grounded response using context chunks
        primary_context = context_chunks[0].strip()
        sentences = [s.strip() for s in primary_context.split(".") if len(s.strip()) > 10]
        summary_sentences = ". ".join(sentences[:3]) if sentences else primary_context[:250]

        content = (
            f"Based on our official support documentation: {summary_sentences}. "
            f"Please let me know if you need further clarification on this policy or any additional assistance."
        )

        output_tokens = max(15, len(content) // 4)
        return LLMResponse(
            content=content,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            model_name=self.model_name
        )

    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generates deterministic normalized positive dense embedding vectors with feature hashing.
        Guarantees mathematically sound cosine similarity for overlapping semantic terms.
        """
        results = []
        for text in texts:
            words = text.lower().replace(",", " ").replace(".", " ").replace("?", " ").replace("!", " ").split()
            vector = [0.0] * self.dimension

            for word in words:
                clean_word = word.strip()
                if not clean_word:
                    continue
                weight = 0.2 if clean_word in self.STOP_WORDS else self.KEYWORD_BOOSTS.get(clean_word, 1.0)
                h = int(hashlib.md5(clean_word.encode("utf-8")).hexdigest(), 16)
                idx = h % self.dimension
                vector[idx] += weight

            # Also add character bigrams for subword robustness
            for i in range(len(text) - 2):
                gram = text[i:i+3].lower()
                h_gram = int(hashlib.md5(gram.encode("utf-8")).hexdigest(), 16)
                vector[h_gram % self.dimension] += 0.05

            # Normalize vector to unit length (L2 norm)
            norm = math.sqrt(sum(v * v for v in vector))
            if norm > 0:
                vector = [round(v / norm, 5) for v in vector]
            else:
                vector = [round(1.0 / math.sqrt(self.dimension), 5)] * self.dimension

            results.append(vector)

        return results
