from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class EvaluationCreate(BaseModel):
    message_id: str
    is_positive: bool
    feedback_reason: Optional[str] = None
    customer_notes: Optional[str] = None


class AnalyticsOverviewResponse(BaseModel):
    total_conversations: int
    ai_resolved_conversations: int
    human_escalations: int
    resolution_rate_percent: float
    total_tickets: int
    open_tickets: int
    resolved_tickets: int
    average_response_time_seconds: float
    total_ai_tokens: int
    estimated_ai_cost_usd: float
    grounding_success_rate_percent: float
    category_distribution: Dict[str, int]
    channel_distribution: Dict[str, int]
    daily_volume: List[Dict[str, Any]]
