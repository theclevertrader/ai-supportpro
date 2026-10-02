import json
from typing import Optional
from fastapi import APIRouter, Header, Request, HTTPException, status, Query, Response
from app.services.integrations.webhook_verifier import verify_hmac_sha256_signature
from app.core.config import settings

router = APIRouter(prefix="/integrations", tags=["External Integrations & Webhooks"])

# Default verification token for Meta WhatsApp Cloud API webhooks
WHATSAPP_VERIFY_TOKEN = "ai_supportpro_meta_verify_token_2026"
WHATSAPP_APP_SECRET = "whatsapp_cloud_api_app_secret_supportpro_secure"


@router.get("/whatsapp/webhook")
async def verify_whatsapp_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
):
    """
    Meta WhatsApp Cloud API Webhook Handshake Verification.
    Validates hub.verify_token and returns hub.challenge integer to establish the webhook subscription.
    """
    if hub_mode == "subscribe" and hub_verify_token == WHATSAPP_VERIFY_TOKEN:
        return Response(content=hub_challenge or "", media_type="text/plain")

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Verification token mismatch or invalid subscribe mode."
    )


@router.post("/whatsapp/webhook")
async def receive_whatsapp_webhook(
    request: Request,
    x_hub_signature_256: Optional[str] = Header(None, alias="X-Hub-Signature-256"),
):
    """
    Receives incoming WhatsApp Cloud API events.
    Enforces HMAC SHA-256 cryptographic signature verification on every single incoming payload.
    """
    body_bytes = await request.body()

    # Cryptographic signature validation
    is_valid, err_msg = verify_hmac_sha256_signature(
        payload_bytes=body_bytes,
        signature_header=x_hub_signature_256 or "",
        secret=WHATSAPP_APP_SECRET
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Webhook HMAC Signature Verification Failed: {err_msg}"
        )

    try:
        payload = json.loads(body_bytes.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    # Process verified WhatsApp inbound message event
    return {
        "status": "success",
        "verified": True,
        "message": "Webhook cryptographically authenticated and processed.",
        "entry_count": len(payload.get("entry", []))
    }
