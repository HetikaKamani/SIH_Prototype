from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime


class ComplaintModel(BaseModel):
    complaint_id: str

    text: str

    filename: Optional[str] = None

    detections: List[Dict] = Field(
        default_factory=list
    )
    evidence: List[Dict] = Field(
    default_factory=list
)

    category: str
    subcategory: str

    severity: str
    confidence: float

    department: str
    priority: str

    sla: str
    sla_hours: int
    sla_deadline: datetime
    sla_status: str

    escalation_required: bool
    escalated_at: Optional[datetime] = None

    status: str = "SUBMITTED"

    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None

    created_at: datetime = Field(
        default_factory=datetime.utcnow
    )

    updated_at: datetime = Field(
        default_factory=datetime.utcnow
    )


class LocationUpdateRequest(BaseModel):
    latitude: float
    longitude: float
    location_name: Optional[str] = None