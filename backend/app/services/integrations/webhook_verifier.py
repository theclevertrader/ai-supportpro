import hmac
import hashlib
from typing import Tuple


def verify_hmac_sha256_signature(payload_bytes: bytes, signature_header: str, secret: str) -> Tuple[bool, str]:
    """
    Validates HMAC SHA-256 signature (e.g. Meta WhatsApp Cloud API X-Hub-Signature-256, GitHub, Stripe).
    Uses timing-attack resistant hmac.compare_digest.
    """
    if not signature_header:
        return False, "Missing signature header."

    if not secret:
        return False, "Webhook secret not configured."

    # Parse prefix if present (e.g., 'sha256=abcdef...')
    expected_hash = signature_header
    if "=" in signature_header:
        parts = signature_header.split("=", 1)
        expected_hash = parts[1]

    # Compute actual HMAC
    computed = hmac.new(
        key=secret.encode("utf-8"),
        msg=payload_bytes,
        digestmod=hashlib.sha256
    ).hexdigest()

    # Timing-safe comparison to prevent timing side-channel attacks
    if not hmac.compare_digest(computed.lower(), expected_hash.lower()):
        return False, "Invalid cryptographic signature."

    return True, "Signature verified."
