import io
import re
import socket
import ipaddress
import unicodedata
from urllib.parse import urlparse, urljoin
from typing import Tuple, Optional
import httpx
from pypdf import PdfReader


def normalize_filename(filename: str, max_length: int = 100) -> str:
    """
    Normalizes and sanitizes uploaded filename:
    - Strips directory path traversal characters (/ \\ ..)
    - Normalizes unicode characters to ASCII
    - Replaces whitespace with underscores and strips dangerous shell/special characters
    - Enforces max length while preserving extension
    """
    if not filename:
        return "unnamed_document.txt"

    # Strip directory paths
    base_name = filename.replace("\\", "/").split("/")[-1].strip()

    # Normalize unicode to NFKD
    normalized = unicodedata.normalize("NFKD", base_name).encode("ascii", "ignore").decode("ascii")

    # Replace spaces with underscores
    clean = re.sub(r"\s+", "_", normalized)

    # Allow only alphanumeric, dashes, underscores, and dots
    clean = re.sub(r"[^a-zA-Z0-9_\-\.]", "", clean)

    # Collapse multiple dots to prevent extension obfuscation
    clean = re.sub(r"\.{2,}", ".", clean)

    if not clean or clean.startswith("."):
        clean = f"document_{clean.lstrip('.')}" if clean.lstrip(".") else "document.txt"

    # Enforce max length while preserving extension
    if len(clean) > max_length:
        parts = clean.rsplit(".", 1)
        if len(parts) == 2:
            name_part, ext_part = parts
            clean = f"{name_part[:max_length - len(ext_part) - 1]}.{ext_part}"
        else:
            clean = clean[:max_length]

    return clean


def is_safe_external_url(url: str) -> Tuple[bool, str]:
    """
    Validates URL to defend against Server-Side Request Forgery (SSRF).
    Blocks private IP addresses, loopbacks, link-local, cloud metadata endpoints,
    userinfo bypasses, and IPv6 internal ranges.
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False, "Only HTTP and HTTPS URLs are allowed."

        # Block userinfo (e.g. http://user:pass@internal-host/)
        if parsed.username or parsed.password:
            return False, "Embedded credentials/userinfo in URL are not allowed."

        hostname = parsed.hostname
        if not hostname:
            return False, "Invalid host in URL."

        hostname_lower = hostname.lower().strip()

        # Explicit block for known cloud metadata hostnames
        blocked_hostnames = {
            "metadata.google.internal",
            "metadata.google",
            "instance-data",
            "169.254.169.254",
            "ecs-metadata",
            "localhost",
        }
        if hostname_lower in blocked_hostnames or hostname_lower.endswith(".local") or hostname_lower.endswith(".internal"):
            return False, "Access to cloud instance metadata or internal domain is strictly blocked."

        # Resolve all IPs (both IPv4 and IPv6)
        try:
            addr_info = socket.getaddrinfo(hostname_lower, None)
        except Exception:
            return False, "Could not resolve hostname to an IP address."

        if not addr_info:
            return False, "Could not resolve hostname to an IP address."

        for family, _, _, _, sockaddr in addr_info:
            ip_str = sockaddr[0]
            ip = ipaddress.ip_address(ip_str)

            # Check for IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
            if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
                ip = ip.ipv4_mapped

            # Explicit check for 0.0.0.0
            if str(ip) == "0.0.0.0":
                return False, "Access to 0.0.0.0 is strictly prohibited."

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


def parse_pdf_bytes(file_bytes: bytes, max_pages: int = 50, max_chars: int = 500000) -> str:
    """
    Extracts text content from PDF file bytes with defensive resource guards:
    - Page limit (up to max_pages) to prevent PDF decompression bombs
    - Total character limit (up to max_chars)
    - Fault-tolerant page extraction
    """
    is_valid, err = validate_file_magic_bytes(file_bytes, "doc.pdf")
    if not is_valid:
        raise ValueError(err)

    try:
        reader = PdfReader(io.BytesIO(file_bytes))
    except Exception as e:
        raise ValueError(f"Corrupted or invalid PDF structure: {str(e)}")

    extracted = []
    total_chars = 0
    total_pages = len(reader.pages)
    pages_to_process = min(total_pages, max_pages)

    for idx in range(pages_to_process):
        try:
            page = reader.pages[idx]
            page_text = page.extract_text() or ""
            page_text = page_text.strip()
            if page_text:
                extracted.append(f"--- Page {idx + 1} ---\n{page_text}")
                total_chars += len(page_text)
                if total_chars >= max_chars:
                    extracted.append(f"\n[Truncated: Maximum extraction limit of {max_chars} characters reached]")
                    break
        except Exception:
            # Continue reading subsequent pages if an individual page has corrupted streams
            continue

    if not extracted:
        raise ValueError("No extractable text found in PDF document (may contain only scanned images or non-standard encodings).")

    return "\n\n".join(extracted)


async def fetch_website_content(
    url: str,
    max_chars: int = 50000,
    max_redirects: int = 3,
    max_bytes: int = 2 * 1024 * 1024  # 2MB download limit
) -> str:
    """
    Safely fetches and extracts readable text from an external web page.
    Production Hardened SSRF Defense:
    - Scheme validation (http/https only)
    - DNS resolution & IP check before initial request
    - Strict redirect re-validation: verifies destination IP on EVERY redirect hop
    - Timeout: 10s total with 3s connect and 5s read limits
    - Content-type validation (rejects binaries, audio/video, executables)
    - Streaming byte limit (max 2MB) to prevent memory exhaustion
    """
    current_url = url
    visited_urls = set()
    headers = {"User-Agent": "AISupportPro-KnowledgeBot/1.0 (+https://supportpro.ai)"}
    timeout_config = httpx.Timeout(10.0, connect=3.0, read=5.0)

    async with httpx.AsyncClient(timeout=timeout_config, follow_redirects=False, headers=headers) as client:
        for _ in range(max_redirects + 1):
            if current_url in visited_urls:
                raise ValueError("Circular redirect loop detected.")
            visited_urls.add(current_url)

            is_safe, error_msg = is_safe_external_url(current_url)
            if not is_safe:
                raise ValueError(f"SSRF Security Violation: {error_msg}")

            # Stream request to enforce max response size and validate Content-Type early
            async with client.stream("GET", current_url) as resp:
                # Handle redirects manually to inspect destination safety before fetching
                if resp.status_code in (301, 302, 303, 307, 308):
                    location = resp.headers.get("Location")
                    if not location:
                        raise ValueError("Redirect response missing Location header.")
                    current_url = urljoin(current_url, location)
                    continue

                resp.raise_for_status()

                # Validate Content-Type
                content_type = resp.headers.get("Content-Type", "").lower()
                allowed_types = ("text/html", "text/plain", "text/markdown", "application/xhtml+xml", "application/xml")
                if content_type and not any(t in content_type for t in allowed_types):
                    raise ValueError(f"Invalid Content-Type '{content_type}'. Only HTML, Markdown, and plain text are supported.")

                # Read body in chunks with size limit
                chunks = []
                bytes_read = 0
                async for chunk in resp.aiter_bytes(chunk_size=16384):
                    bytes_read += len(chunk)
                    if bytes_read > max_bytes:
                        raise ValueError(f"Web page response size exceeded maximum allowable limit ({max_bytes // (1024 * 1024)}MB).")
                    chunks.append(chunk)

                raw_bytes = b"".join(chunks)
                html = raw_bytes.decode(resp.encoding or "utf-8", errors="ignore")
                break
        else:
            raise ValueError("Too many redirects encountered while fetching website.")

    # Clean HTML text extraction
    clean_html = re.sub(r'<(script|style|svg|nav|footer)[^>]*>.*?</\1>', '', html, flags=re.DOTALL | re.IGNORECASE)
    clean_text = re.sub(r'<[^>]+>', ' ', clean_html)
    clean_text = re.sub(r'\s+', ' ', clean_text).strip()

    return clean_text[:max_chars]
