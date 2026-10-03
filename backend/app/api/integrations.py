import json
from typing import Optional
from fastapi import APIRouter, Header, Request, HTTPException, status, Query, Response
from app.services.integrations.webhook_verifier import verify_hmac_sha256_signature
from app.core.config import settings

router = APIRouter(prefix="/integrations", tags=["External Integrations & Webhooks"])

def _get_whatsapp_credentials() -> tuple[str, str]:
    token = settings.WHATSAPP_VERIFY_TOKEN
    secret = settings.WHATSAPP_APP_SECRET
    if not token or not secret:
        if settings.APP_ENV == "production":
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="WhatsApp webhook credentials are not configured in production."
            )
        # Development fallback defaults
        token = token or "ai_supportpro_meta_verify_token_dev"
        secret = secret or "whatsapp_cloud_api_app_secret_dev"
    return token, secret


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
    verify_token, _ = _get_whatsapp_credentials()
    if hub_mode == "subscribe" and hub_verify_token == verify_token:
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
    _, app_secret = _get_whatsapp_credentials()
    body_bytes = await request.body()

    # Cryptographic signature validation
    is_valid, err_msg = verify_hmac_sha256_signature(
        payload_bytes=body_bytes,
        signature_header=x_hub_signature_256 or "",
        secret=app_secret
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
