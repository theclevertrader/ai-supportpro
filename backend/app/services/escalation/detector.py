from typing import Tuple, Optional
import re
from app.models.ticket import TicketPriority, TicketCategory


class EscalationDetector:
    """
    Evaluates whether a customer interaction necessitates human handoff
    and determines appropriate ticket severity.
    """

    HUMAN_REQUEST_TRIGGERS = [
        "human", "representative", "agent", "real person", "operator",
        "speak to someone", "talk to a person", "customer service agent"
    ]

    URGENT_TRIGGERS = [
        "lawyer", "legal", "sue", "police", "fraud", "unauthorized charge",
        "chargeback", "stolen", "security vulnerability"
    ]

    DISPUTE_CLAIM_PATTERNS = [
        r"(?i)\b(i want|i need|give me|demand|request)\s+(a\s+)?refund\b",
        r"(?i)\brefund\s+my\s+(money|order|payment|card)\b",
        r"(?i)\b(damaged|broken|shattered|cracked|defective|faulty|scam|terrible|worst service)\b"
    ]

    @classmethod
    def evaluate(
        cls,
        user_message: str,
        retrieved_chunks_count: int,
        highest_similarity: float,
        similarity_threshold: float
    ) -> Tuple[bool, Optional[str], TicketPriority, TicketCategory]:
        """
        Returns:
            (is_escalated, escalation_reason, priority, category)
        """
        text = user_message.lower().strip()

        # 1. Critical Legal / Security / Urgent Issue
        if any(w in text for w in cls.URGENT_TRIGGERS):
            return (
                True,
                "Urgent legal/security keyword detected",
                TicketPriority.URGENT,
                TicketCategory.COMPLAINT
            )

        # 2. Customer explicitly asked for a human
        if any(w in text for w in cls.HUMAN_REQUEST_TRIGGERS):
            return (
                True,
                "Customer explicitly requested a human support agent",
                TicketPriority.HIGH,
                TicketCategory.GENERAL
            )

        # 3. Active financial dispute or damaged product claim requiring human authorization
        for pattern in cls.DISPUTE_CLAIM_PATTERNS:
            if re.search(pattern, text):
                return (
                    True,
                    "Dispute or damaged product claim requiring human agent authorization",
                    TicketPriority.HIGH,
                    TicketCategory.REFUND if "refund" in text or "return" in text else TicketCategory.COMPLAINT
                )

        # 4. Low RAG Confidence / Unknown question
        if retrieved_chunks_count == 0 or highest_similarity < similarity_threshold:
            return (
                True,
                "AI knowledge base had insufficient confidence to resolve inquiry safely",
                TicketPriority.MEDIUM,
                TicketCategory.GENERAL
            )

        # No escalation needed; AI can answer safely using grounded context
        return False, None, TicketPriority.LOW, TicketCategory.GENERAL
