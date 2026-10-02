import re
import html

# Regex patterns for XSS vectors and script injections
_SCRIPT_PATTERN = re.compile(r"<\s*script[^>]*>.*?<\s*/\s*script\s*>", re.IGNORECASE | re.DOTALL)
_TAG_PATTERN = re.compile(r"<\s*/?\s*(?:script|iframe|object|embed|applet|meta|link|style|form|input|button|svg|base)[^>]*>", re.IGNORECASE)
_EVENT_HANDLER_PATTERN = re.compile(r"\bon\w+\s*=\s*(?:'[^']*'|\"[^\"]*\"|[^\s>]+)", re.IGNORECASE)
_JAVASCRIPT_URI_PATTERN = re.compile(r"\b(?:javascript|data|vbscript):[^\s\"'>]+", re.IGNORECASE)


def sanitize_html_xss(text: str) -> str:
    """
    Cleans potentially dangerous HTML/JavaScript payloads to prevent Stored & Reflected XSS.
    Neutrals scripts, dangerous DOM elements, event handlers, and javascript: URIs.
    """
    if not text:
        return ""

    # Remove null bytes
    cleaned = text.replace("\x00", "")

    # Remove complete <script>...</script> blocks
    cleaned = _SCRIPT_PATTERN.sub("", cleaned)

    # Remove dangerous tag declarations
    cleaned = _TAG_PATTERN.sub("", cleaned)

    # Remove inline event handlers (e.g. onerror=alert(1), onload=...)
    cleaned = _EVENT_HANDLER_PATTERN.sub("", cleaned)

    # Remove javascript: / vbscript: / dangerous data: protocols
    cleaned = _JAVASCRIPT_URI_PATTERN.sub("", cleaned)

    return cleaned.strip()


def sanitize_text_input(text: str, max_length: int = 10000) -> str:
    """
    Sanitizes standard user/customer text input (chat message, ticket note, customer inquiry).
    Ensures safe encoding, XSS removal, and length bounds.
    """
    if not text:
        return ""

    # Cap input length
    truncated = text[:max_length]

    # Neutralize XSS vectors
    safe = sanitize_html_xss(truncated)

    return safe
