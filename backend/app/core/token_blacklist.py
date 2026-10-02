import time
import hashlib
import threading
from typing import Dict

# Thread-safe in-memory token blacklist with timestamp expiration
_lock = threading.Lock()
# token_hash -> expiry_timestamp
_revoked_tokens: Dict[str, float] = {}


def _get_token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def revoke_token(token: str, expires_in_seconds: int = 86400) -> None:
    """
    Revokes an active JWT token.
    Ensures that logged-out or compromised tokens cannot be reused.
    """
    token_hash = _get_token_hash(token)
    expiry = time.time() + expires_in_seconds
    with _lock:
        _cleanup_expired()
        _revoked_tokens[token_hash] = expiry


def is_token_revoked(token: str) -> bool:
    """Checks whether a JWT token has been revoked."""
    token_hash = _get_token_hash(token)
    now = time.time()
    with _lock:
        if token_hash in _revoked_tokens:
            if _revoked_tokens[token_hash] > now:
                return True
            else:
                del _revoked_tokens[token_hash]
    return False


def _cleanup_expired() -> None:
    """Removes tokens whose validity window has naturally expired."""
    now = time.time()
    to_delete = [h for h, exp in _revoked_tokens.items() if exp <= now]
    for h in to_delete:
        del _revoked_tokens[h]
