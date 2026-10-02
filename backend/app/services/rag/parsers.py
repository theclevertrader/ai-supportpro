import io
import re
import socket
import ipaddress
from urllib.parse import urlparse
from typing import Tuple
import httpx
from pypdf import PdfReader


def is_safe_external_url(url: str) -> Tuple[bool, str]:
    """
    Validates URL to defend against Server-Side Request Forgery (SSRF).
    Blocks private IP addresses, loopbacks, link-local, cloud metadata endpoints,
    and IPv6 internal ranges.
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False, "Only HTTP and HTTPS URLs are allowed."

        hostname = parsed.hostname
        if not hostname:
            return False, "Invalid host in URL."

        # Block direct AWS/GCP/Azure cloud metadata hostnames
        if hostname.lower() in ("metadata.google.internal", "instance-data", "169.254.169.254"):
            return False, "Access to cloud instance metadata service is strictly blocked."

        # Resolve all IPs (both IPv4 and IPv6)
        addr_info = socket.getaddrinfo(hostname, None)
        if not addr_info:
            return False, "Could not resolve hostname to an IP address."

        for family, _, _, _, sockaddr in addr_info:
            ip_str = sockaddr[0]
            ip = ipaddress.ip_address(ip_str)

            if (
                ip.is_private
                or ip.is_loopback
                or ip.is_link_local
                or ip.is_multicast
                or ip.is_reserved
                or ip.is_unspecified
            ):
                return False, f"Access to private/internal IP address {ip_str} is strictly prohibited."

            # Explicit check for 169.254.0.0/16 (Link Local / Cloud Metadata)
            if ip in ipaddress.ip_network("169.254.0.0/16"):
                return False, f"Access to link-local/metadata IP {ip_str} is strictly blocked."

        return True, ""
    except Exception as e:
        return False, f"Failed to validate host: {str(e)}"


def sanitize_untrusted_text(text: str) -> str:
    """
    Cleans untrusted text from uploaded documents or web pages.
    Neutralizes common prompt-injection delimiters, role reversals, and jailbreak prefixes.
    """
    cleaned = text
    # Strip jailbreak marker attempts
    injection_patterns = [
        r'(?i)ignore\s+(all\s+)?(previous|prior)\s+instructions',
        r'(?i)system\s+override',
        r'(?i)you\s+are\s+now\s+in\s+developer\s+mode',
        r'(?i)reveal\s+(your|the)\s+(system\s+prompt|secret\s+key|api\s+key)',
        r'(?i)disregard\s+all\s+rules',
        r'(?i)new\s+system\s+directive',
        r'(?i)bypass\s+safety\s+guidelines',
        r'(?i)jailbreak\s+mode',
        r'(?i)print\s+environment\s+variables',
    ]
    for pattern in injection_patterns:
        cleaned = re.sub(pattern, "[FILTERED_UNTRUSTED_INSTRUCTION]", cleaned)

    return cleaned


def validate_file_magic_bytes(file_bytes: bytes, filename: str) -> Tuple[bool, str]:
    """
    Validates file magic header bytes to prevent polyglot files, executable masquerading,
    and corrupted uploads.
    """
    if not file_bytes:
        return False, "File is completely empty (0 bytes)."

    filename_lower = filename.lower()

    # Reject DOS/Windows PE Executables (MZ header)
    if file_bytes.startswith(b"MZ"):
        return False, "Malicious executable binary detected (PE/MZ format)."

    # Reject Linux ELF Executables (\x7fELF)
    if file_bytes.startswith(b"\x7fELF"):
        return False, "Malicious executable binary detected (ELF format)."

    # Reject Shell/Bash scripts (#!/...)
    if file_bytes.startswith(b"#!"):
        return False, "Executable script files are strictly prohibited."

    if filename_lower.endswith(".pdf"):
        # PDF must start with %PDF- (magic bytes)
        if not file_bytes.startswith(b"%PDF-"):
            return False, "Invalid PDF header. File is not a genuine PDF document."

    elif filename_lower.endswith((".txt", ".md")):
        # TXT/MD should not contain null bytes (indicates binary disguised as text)
        if b"\x00" in file_bytes[:1024]:
            return False, "Binary data detected in text document. Disallowed format."

    return True, ""


def parse_pdf_bytes(file_bytes: bytes) -> str:
    """Extracts text content from PDF file bytes."""
    is_valid, err = validate_file_magic_bytes(file_bytes, "doc.pdf")
    if not is_valid:
        raise ValueError(err)

    reader = PdfReader(io.BytesIO(file_bytes))
    extracted = []
    for idx, page in enumerate(reader.pages):
        page_text = page.extract_text() or ""
        if page_text.strip():
            extracted.append(f"--- Page {idx + 1} ---\n{page_text}")
    return "\n\n".join(extracted)


async def fetch_website_content(url: str, max_chars: int = 50000, max_redirects: int = 3) -> str:
    """
    Safely fetches and extracts readable text from an external web page.
    Defends against SSRF by validating destination IP on EVERY redirect hop.
    """
    current_url = url
    headers = {"User-Agent": "AISupportPro-KnowledgeBot/1.0 (+https://supportpro.ai)"}

    async with httpx.AsyncClient(timeout=15.0, follow_redirects=False, headers=headers) as client:
        for _ in range(max_redirects + 1):
            is_safe, error_msg = is_safe_external_url(current_url)
            if not is_safe:
                raise ValueError(f"SSRF Security Violation: {error_msg}")

            resp = await client.get(current_url)

            # Handle redirects manually to inspect destination safety
            if resp.status_code in (301, 302, 303, 307, 308):
                location = resp.headers.get("Location")
                if not location:
                    raise ValueError("Redirect header missing Location.")
                # Resolve relative redirects
                from urllib.parse import urljoin
                current_url = urljoin(current_url, location)
                continue

            resp.raise_for_status()
            html = resp.text
            break
        else:
            raise ValueError("Too many redirects encountered while fetching website.")

    # Clean HTML text extraction
    clean_html = re.sub(r'<(script|style|svg|nav|footer)[^>]*>.*?</\1>', '', html, flags=re.DOTALL | re.IGNORECASE)
    clean_text = re.sub(r'<[^>]+>', ' ', clean_html)
    clean_text = re.sub(r'\s+', ' ', clean_text).strip()

    return clean_text[:max_chars]
