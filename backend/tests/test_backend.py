import pytest
import pytest_asyncio
import httpx
from app.main import app
from app.core.database import init_db


@pytest.fixture(scope="session", autouse=True)
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db():
    await init_db()


@pytest.mark.asyncio
async def test_health_check():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "online"
        assert data["database"] == "healthy"


@pytest.mark.asyncio
async def test_seed_demo_tenant_and_login():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Seed demo
        seed_resp = await client.post("/api/v1/auth/seed-demo")
        assert seed_resp.status_code == 200
        seed_data = seed_resp.json()
        assert "widget_key" in seed_data
        assert seed_data["demo_email"] == "admin@acmestore.com"

        # Login with demo user
        login_resp = await client.post("/api/v1/auth/login", json={
            "email": "admin@acmestore.com",
            "password": "Password123!"
        })
        assert login_resp.status_code == 200
        token_data = login_resp.json()
        assert "access_token" in token_data
        assert token_data["user"]["role"] == "TENANT_OWNER"


@pytest.mark.asyncio
async def test_customer_chat_and_citations():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Get widget key
        seed_resp = await client.post("/api/v1/auth/seed-demo")
        widget_key = seed_resp.json()["widget_key"]

        # Ask a policy question that exists in the knowledge base
        chat_resp = await client.post("/api/v1/chat/message", json={
            "widget_key": widget_key,
            "customer_name": "Test Customer",
            "customer_email": "customer@test.com",
            "message": "What is your refund policy?"
        })
        assert chat_resp.status_code == 200
        data = chat_resp.json()
        assert data["sender_type"] == "AI"
        assert len(data["content"]) > 10
        # Check citations
        assert len(data["citations"]) > 0
        assert "Acme Refund & Return Policy" in data["citations"][0]["source_title"]
        assert data["is_escalated"] is False


@pytest.mark.asyncio
async def test_customer_escalation_on_refund_complaint():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        seed_resp = await client.post("/api/v1/auth/seed-demo")
        widget_key = seed_resp.json()["widget_key"]

        # Ask a refund question with damaged complaint keyword
        chat_resp = await client.post("/api/v1/chat/message", json={
            "widget_key": widget_key,
            "customer_name": "Unhappy Buyer",
            "customer_email": "buyer@test.com",
            "message": "My item arrived damaged and broken, I want an immediate refund!"
        })
        assert chat_resp.status_code == 200
        data = chat_resp.json()
        # System must detect escalation and generate ticket
        assert data["is_escalated"] is True
        assert data["ticket_id"] is not None


@pytest.mark.asyncio
async def test_multi_tenant_isolation():
    import uuid
    uid = uuid.uuid4().hex[:6]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Register Tenant A
        reg_a = await client.post("/api/v1/auth/register", json={
            "email": f"owner_{uid}@tenanta.com",
            "password": "Password123!",
            "full_name": "Owner A",
            "tenant_name": f"Company Alpha {uid}",
            "tenant_slug": f"company-alpha-{uid}"
        })
        assert reg_a.status_code == 201
        token_a = reg_a.json()["access_token"]

        # Register Tenant B
        reg_b = await client.post("/api/v1/auth/register", json={
            "email": f"owner_{uid}@tenantb.com",
            "password": "Password123!",
            "full_name": "Owner B",
            "tenant_name": f"Company Beta {uid}",
            "tenant_slug": f"company-beta-{uid}"
        })
        assert reg_b.status_code == 201
        token_b = reg_b.json()["access_token"]

        # Tenant A uploads private document
        upload_a = await client.post(
            "/api/v1/knowledge/upload-text",
            headers={"Authorization": f"Bearer {token_a}"},
            data={"title": "Alpha Secret Vault Policy", "content": "The master secret code for Alpha is XYZ-999."}
        )
        assert upload_a.status_code == 200
        doc_a_id = upload_a.json()["id"]

        # Tenant B lists documents: must NOT contain Tenant A's document
        docs_b = await client.get(
            "/api/v1/knowledge/documents",
            headers={"Authorization": f"Bearer {token_b}"}
        )
        assert docs_b.status_code == 200
        b_doc_ids = [d["id"] for d in docs_b.json()]
        assert doc_a_id not in b_doc_ids

        # Tenant B attempts to delete Tenant A's document: must return 404
        del_attempt = await client.delete(
            f"/api/v1/knowledge/documents/{doc_a_id}",
            headers={"Authorization": f"Bearer {token_b}"}
        )
        assert del_attempt.status_code == 404


@pytest.mark.asyncio
async def test_unknown_question_safety_escalation():
    """Verifies that queries with no matching knowledge base context do not hallucinate and escalate safely."""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        seed_resp = await client.post("/api/v1/auth/seed-demo")
        widget_key = seed_resp.json()["widget_key"]

        # Completely unrelated ungrounded inquiry
        chat_resp = await client.post("/api/v1/chat/message", json={
            "widget_key": widget_key,
            "customer_name": "Curious Customer",
            "customer_email": "curious@test.com",
            "message": "Do you sell nuclear submarine propulsion parts in Tokyo?"
        })
        assert chat_resp.status_code == 200
        data = chat_resp.json()
        assert data["is_escalated"] is True
        assert data["ticket_id"] is not None
        assert "couldn't find verified information" in data["content"] or "support ticket" in data["content"]


@pytest.mark.asyncio
async def test_ticket_lifecycle_and_notes():
    """Verifies ticket retrieval, status transition, and adding internal notes."""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Login as demo owner
        login_resp = await client.post("/api/v1/auth/login", json={
            "email": "admin@acmestore.com",
            "password": "Password123!"
        })
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # List tickets
        tickets_resp = await client.get("/api/v1/tickets", headers=headers)
        assert tickets_resp.status_code == 200
        tickets = tickets_resp.json()
        assert len(tickets) > 0
        first_ticket_id = tickets[0]["id"]

        # Add internal note
        note_resp = await client.post(
            f"/api/v1/tickets/{first_ticket_id}/notes",
            headers=headers,
            json={"note": "Investigated tracking info. Contacted shipping provider.", "is_internal": True}
        )
        assert note_resp.status_code == 200
        assert note_resp.json()["note"] == "Investigated tracking info. Contacted shipping provider."

        # Update ticket status to IN_PROGRESS
        patch_resp = await client.patch(
            f"/api/v1/tickets/{first_ticket_id}",
            headers=headers,
            json={"status": "IN_PROGRESS"}
        )
        assert patch_resp.status_code == 200
        assert patch_resp.json()["status"] == "IN_PROGRESS"


@pytest.mark.asyncio
async def test_security_headers_and_cors():
    """Verifies that all required OWASP security headers are present on responses."""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/health")
        assert resp.status_code == 200
        headers = resp.headers
        assert headers.get("X-Content-Type-Options") == "nosniff"
        assert headers.get("X-Frame-Options") == "SAMEORIGIN"
        assert headers.get("X-XSS-Protection") == "1; mode=block"
        assert "default-src" in headers.get("Content-Security-Policy", "")


@pytest.mark.asyncio
async def test_ssrf_validator_blocks_internal_and_metadata_ips():
    """Verifies that the SSRF protection engine strictly blocks 127.0.0.1 and cloud metadata 169.254.169.254."""
    from app.services.rag.parsers import is_safe_external_url

    # Loopback
    safe_local, _ = is_safe_external_url("http://127.0.0.1:8000/admin")
    assert safe_local is False

    # Link-local / AWS / GCP Metadata
    safe_meta, _ = is_safe_external_url("http://169.254.169.254/latest/meta-data/")
    assert safe_meta is False

    # Metadata hostname
    safe_host, _ = is_safe_external_url("http://metadata.google.internal/computeMetadata/v1/")
    assert safe_host is False


@pytest.mark.asyncio
async def test_chat_sse_streaming():
    """Verifies that the /chat/stream SSE endpoint streams metadata and token events."""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        seed_resp = await client.post("/api/v1/auth/seed-demo")
        widget_key = seed_resp.json()["widget_key"]

        resp = await client.post("/api/v1/chat/stream", json={
            "widget_key": widget_key,
            "customer_name": "Stream Tester",
            "customer_email": "stream@test.com",
            "message": "What is your shipping policy?"
        })
        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers.get("content-type", "")
        body_text = resp.text
        assert "data:" in body_text
        assert "metadata" in body_text
        assert "done" in body_text


@pytest.mark.asyncio
async def test_account_lockout_after_failed_attempts():
    """Verifies that an account is locked after 5 consecutive bad passwords."""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        import uuid
        uid = uuid.uuid4().hex[:6]
        victim_email = f"victim_{uid}@lockout.com"
        # Create unique user for lockout test
        reg_resp = await client.post("/api/v1/auth/register", json={
            "tenant_name": f"Lockout Corp {uid}",
            "tenant_slug": f"lockout-corp-{uid}",
            "email": victim_email,
            "password": "CorrectPassword123!",
            "full_name": "Lockout Test User"
        })
        assert reg_resp.status_code == 201

        # Attempt 5 wrong passwords
        for i in range(5):
            bad_resp = await client.post("/api/v1/auth/login", json={
                "email": victim_email,
                "password": f"WrongPassword_{i}!"
            })
            assert bad_resp.status_code == 401

        # 6th attempt should trigger 423 Locked
        locked_resp = await client.post("/api/v1/auth/login", json={
            "email": victim_email,
            "password": "CorrectPassword123!"
        })
        assert locked_resp.status_code == 423
        assert "temporarily locked" in locked_resp.json()["detail"]


@pytest.mark.asyncio
async def test_token_revocation_logout():
    """Verifies that token is revoked upon logout and rejected on subsequent requests."""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        login_resp = await client.post("/api/v1/auth/login", json={
            "email": "admin@acmestore.com",
            "password": "Password123!"
        })
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Token is valid initially
        me_resp = await client.get("/api/v1/auth/me", headers=headers)
        assert me_resp.status_code == 200

        # Perform logout (token revocation)
        logout_resp = await client.post("/api/v1/auth/logout", headers=headers)
        assert logout_resp.status_code == 200
        assert "revoked" in logout_resp.json()["message"]

        # Subsequent request with revoked token MUST be rejected
        rejected_resp = await client.get("/api/v1/auth/me", headers=headers)
        assert rejected_resp.status_code == 401
        assert "revoked" in rejected_resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_magic_byte_file_upload_validation():
    """Verifies that spoofed/polyglot files (e.g. PE .exe masked as .pdf) are rejected."""
    import asyncio
    await asyncio.sleep(1.1)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        login_resp = await client.post("/api/v1/auth/login", json={
            "email": "admin@acmestore.com",
            "password": "Password123!"
        })
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Malicious file: DOS PE executable disguised as PDF
        fake_pdf_content = b"MZ\x90\x00\x03\x00\x00\x00MaliciousPayload"
        files = {"file": ("exploit.pdf", fake_pdf_content, "application/pdf")}
        upload_resp = await client.post("/api/v1/knowledge/upload-file", headers=headers, files=files)
        assert upload_resp.status_code == 400
        assert "executable binary" in upload_resp.json()["detail"] or "validation failure" in upload_resp.json()["detail"]


@pytest.mark.asyncio
async def test_xss_input_sanitization():
    """Verifies that stored XSS payloads in chat messages and ticket notes are neutralized."""
    from app.core.sanitizer import sanitize_text_input

    xss_payload = "<script>alert('xss')</script>Hello <img src=x onerror=alert(2)> support!"
    cleaned = sanitize_text_input(xss_payload)

    assert "<script>" not in cleaned
    assert "alert('xss')" not in cleaned
    assert "onerror=" not in cleaned
    assert "Hello" in cleaned
    assert "support!" in cleaned


@pytest.mark.asyncio
async def test_audit_logging_and_query():
    """Verifies that security audit logs are recorded and retrievable by admins."""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        login_resp = await client.post("/api/v1/auth/login", json={
            "email": "admin@acmestore.com",
            "password": "Password123!"
        })
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Fetch audit logs
        audit_resp = await client.get("/api/v1/audit-logs", headers=headers)
        assert audit_resp.status_code == 200
        logs = audit_resp.json()
        assert len(logs) > 0
        actions = [log["action"] for log in logs]
        assert "USER_LOGIN_SUCCESS" in actions


@pytest.mark.asyncio
async def test_webhook_hmac_sha256_verification():
    """Verifies HMAC SHA-256 cryptographic verification for webhook security."""
    import hmac
    import hashlib
    import json
    from app.api.integrations import _get_whatsapp_credentials
    _, WHATSAPP_APP_SECRET = _get_whatsapp_credentials()

    payload = json.dumps({"entry": [{"id": "wa_123", "changes": []}]}).encode("utf-8")

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Unsigned request -> 403 Forbidden
        bad_resp = await client.post("/api/v1/integrations/whatsapp/webhook", content=payload)
        assert bad_resp.status_code == 403

        # 2. Tampered signature -> 403 Forbidden
        tampered_resp = await client.post(
            "/api/v1/integrations/whatsapp/webhook",
            content=payload,
            headers={"X-Hub-Signature-256": "sha256=invalidhash123"}
        )
        assert tampered_resp.status_code == 403

        # 3. Valid HMAC SHA-256 -> 200 OK
        valid_hash = hmac.new(
            key=WHATSAPP_APP_SECRET.encode("utf-8"),
            msg=payload,
            digestmod=hashlib.sha256
        ).hexdigest()
        good_resp = await client.post(
            "/api/v1/integrations/whatsapp/webhook",
            content=payload,
            headers={"X-Hub-Signature-256": f"sha256={valid_hash}"}
        )
        assert good_resp.status_code == 200
        assert good_resp.json()["verified"] is True


@pytest.mark.asyncio
async def test_customer_public_ticket_lookup():
    """Verifies that customers can securely lookup their own ticket without leaking internal notes."""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        seed_resp = await client.post("/api/v1/auth/seed-demo")
        widget_key = seed_resp.json()["widget_key"]

        # Escalate a customer inquiry to generate a ticket
        chat_resp = await client.post("/api/v1/chat/message", json={
            "widget_key": widget_key,
            "customer_name": "Public Lookup Tester",
            "customer_email": "lookup@test.com",
            "message": "I received broken shattered glass, I demand an urgent refund!"
        })
        assert chat_resp.status_code == 200
        ticket_id = chat_resp.json()["ticket_id"]
        assert ticket_id is not None

        # Public lookup with matching email
        lookup_resp = await client.get(
            f"/api/v1/tickets/public/lookup/{ticket_id}?widget_key={widget_key}&customer_email=lookup@test.com"
        )
        assert lookup_resp.status_code == 200
        data = lookup_resp.json()
        assert data["id"] == ticket_id
        assert data["status"] in ("OPEN", "ESCALATED")

        # Wrong customer email should fail with 404 (prevents ticket enumeration)
        wrong_email_resp = await client.get(
            f"/api/v1/tickets/public/lookup/{ticket_id}?widget_key={widget_key}&customer_email=intruder@attacker.com"
        )
        assert wrong_email_resp.status_code == 404


@pytest.mark.asyncio
async def test_portal_dashboard_requires_authentication():
    """Verifies that portal endpoints strictly require JWT Bearer authentication."""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/dashboard")
        assert resp.status_code == 401
        assert "detail" in resp.json()


@pytest.mark.asyncio
async def test_portal_dashboard_authorized_by_jwt():
    """Verifies that authenticated user's JWT cryptographically authorizes tenant data."""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Login
        login_resp = await client.post("/api/v1/auth/login", json={
            "email": "admin@acmestore.com",
            "password": "Password123!"
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]

        # Request dashboard with Bearer token
        dash_resp = await client.get("/api/dashboard", headers={"Authorization": f"Bearer {token}"})
        assert dash_resp.status_code == 200
        data = dash_resp.json()
        assert "metrics" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@acmestore.com"


@pytest.mark.asyncio
async def test_portal_cross_tenant_spoofing_rejected():
    """Verifies that an authenticated user cannot access another tenant by passing a spoofed X-Tenant-ID."""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        login_resp = await client.post("/api/v1/auth/login", json={
            "email": "admin@acmestore.com",
            "password": "Password123!"
        })
        token = login_resp.json()["access_token"]

        # Attempt to spoof tenant
        spoof_resp = await client.get(
            "/api/dashboard",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Tenant-ID": "malicious-foreign-tenant-id"
            }
        )
        assert spoof_resp.status_code == 403
        assert "Unauthorized cross-tenant request" in spoof_resp.json()["detail"]


@pytest.mark.asyncio
async def test_seed_demo_disabled_in_production():
    """Verifies that /auth/seed-demo is rejected with 404 in production environment."""
    from app.core.config import settings
    orig_env = settings.APP_ENV
    try:
        settings.APP_ENV = "production"
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post("/api/v1/auth/seed-demo")
            assert resp.status_code == 404
            assert "disabled in production" in resp.json()["detail"]
    finally:
        settings.APP_ENV = orig_env


@pytest.mark.asyncio
async def test_portal_auth_login_and_logout():
    """Verifies /api/auth/login issues token and /api/auth/logout revokes it."""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Portal login
        login_resp = await client.post("/api/auth/login", json={
            "email": "admin@acmestore.com",
            "password": "Password123!"
        })
        assert login_resp.status_code == 200
        token_data = login_resp.json()
        assert token_data["ok"] is True
        token = token_data["access_token"]

        # Access profile with token
        prof_resp = await client.get("/api/user/profile", headers={"Authorization": f"Bearer {token}"})
        assert prof_resp.status_code == 200
        assert prof_resp.json()["email"] == "admin@acmestore.com"

        # Logout to revoke
        logout_resp = await client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
        assert logout_resp.status_code == 200

        # Post-logout profile request must be rejected (revoked)
        revoked_resp = await client.get("/api/user/profile", headers={"Authorization": f"Bearer {token}"})
        assert revoked_resp.status_code == 401


@pytest.mark.asyncio
async def test_password_policy_enforcement():
    """Verifies that weak passwords are systematically rejected by registration and change-password."""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Weak password (short)
        short_resp = await client.post("/api/v1/auth/register", json={
            "tenant_name": "Weak Corp",
            "tenant_slug": "weak-corp-1",
            "email": "weak1@test.com",
            "password": "Short1!",
            "full_name": "Weak User"
        })
        assert short_resp.status_code == 422

        # Weak password (no special char)
        no_sym_resp = await client.post("/api/v1/auth/register", json={
            "tenant_name": "Weak Corp",
            "tenant_slug": "weak-corp-2",
            "email": "weak2@test.com",
            "password": "Password1234",
            "full_name": "Weak User"
        })
        assert no_sym_resp.status_code == 422


@pytest.mark.asyncio
async def test_duplicate_file_upload_detection_and_normalization():
    """Verifies filename normalization and duplicate upload rejection via SHA-256."""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        import uuid
        uid = uuid.uuid4().hex[:6]
        reg_resp = await client.post("/api/v1/auth/register", json={
            "tenant_name": f"Upload Corp {uid}",
            "tenant_slug": f"upload-corp-{uid}",
            "email": f"uploader_{uid}@test.com",
            "password": "Password123!",
            "full_name": "Uploader Admin"
        })
        assert reg_resp.status_code == 201
        token = reg_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        file_payload = b"Company Privacy Policy text content with sufficient length for knowledge base indexing."

        # First upload -> Success (200)
        up1 = await client.post(
            "/api/v1/knowledge/upload-file",
            files={"file": ("../../malicious/path/privacy policy!.txt", file_payload, "text/plain")},
            data={"title": "Privacy Policy Test"},
            headers=headers
        )
        assert up1.status_code == 200

        # Duplicate upload -> 409 Conflict
        up2 = await client.post(
            "/api/v1/knowledge/upload-file",
            files={"file": ("privacy_policy_copy.txt", file_payload, "text/plain")},
            data={"title": "Privacy Policy Copy"},
            headers=headers
        )
        assert up2.status_code == 409
        assert "Duplicate file detected" in up2.json()["detail"]


@pytest.mark.asyncio
async def test_signed_ticket_access_token_lookup():
    """Verifies that ticket can be retrieved securely using the returned signed ticket_token."""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        seed_resp = await client.post("/api/v1/auth/seed-demo")
        widget_key = seed_resp.json()["widget_key"]

        # Escalate inquiry
        chat_resp = await client.post("/api/v1/chat/message", json={
            "widget_key": widget_key,
            "customer_name": "Token Tester",
            "customer_email": "token_test@customer.com",
            "message": "My order arrived broken and defective, urgent refund needed."
        })
        assert chat_resp.status_code == 200
        ticket_id = chat_resp.json()["ticket_id"]

        # Lookup with email -> returns ticket_token
        lookup1 = await client.get(
            f"/api/v1/tickets/public/lookup/{ticket_id}?widget_key={widget_key}&customer_email=token_test@customer.com"
        )
        assert lookup1.status_code == 200
        token_val = lookup1.json().get("ticket_token")
        assert token_val is not None

        # Lookup with ticket_token (no email needed)
        lookup2 = await client.get(
            f"/api/v1/tickets/public/lookup/{ticket_id}?widget_key={widget_key}&ticket_token={token_val}"
        )
        assert lookup2.status_code == 200
        assert lookup2.json()["id"] == ticket_id

        # Tampered ticket_token -> 404
        tampered = await client.get(
            f"/api/v1/tickets/public/lookup/{ticket_id}?widget_key={widget_key}&ticket_token=invalid_forged_token_12345"
        )
        assert tampered.status_code == 404





