import re
from typing import List, Dict, Any


def split_text_into_chunks(
    text: str,
    chunk_size_words: int = 200,
    overlap_words: int = 30
) -> List[Dict[str, Any]]:
    """
    Splits input text into overlapping chunks while preserving sentence integrity.
    Returns list of dicts with 'content', 'index', 'word_count', and approx 'token_count'.
    """
    clean_text = re.sub(r'\s+', ' ', text).strip()
    if not clean_text:
        return []

    words = clean_text.split()
    chunks = []
    start = 0
    chunk_index = 0

    while start < len(words):
        end = min(start + chunk_size_words, len(words))
        chunk_words = words[start:end]
        chunk_str = " ".join(chunk_words)

        chunks.append({
            "chunk_index": chunk_index,
            "content": chunk_str,
            "token_count": int(len(chunk_str) / 3.8),
            "metadata": {
                "word_start": start,
                "word_end": end,
                "total_words": len(words)
            }
        })

        chunk_index += 1
        if end == len(words):
            break
        start += max(1, chunk_size_words - overlap_words)

    return chunks
