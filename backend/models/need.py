from enum import Enum
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class NeedCategory(str, Enum):
    food_essentials = "food_essentials"
    medical = "medical"
    elderly_support = "elderly_support"
    child_support = "child_support"
    transport_logistics = "transport_logistics"
    documentation = "documentation"
    shelter_community = "shelter_community"


class NeedUrgency(str, Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


class NeedStatus(str, Enum):
    new = "new"
    analyzed = "analyzed"
    pending_assignment = "pending_assignment"
    assigned = "assigned"
    in_progress = "in_progress"
    completed = "completed"
    escalated = "escalated"


# ── Nested ────────────────────────────────────────────────────────────────────
class NeedLocation(BaseModel):
    area: str
    city: str


# ── Create ────────────────────────────────────────────────────────────────────
class NeedCreate(BaseModel):
    rawDescription: str
    title: Optional[str] = None
    category: Optional[NeedCategory] = None
    urgency: Optional[NeedUrgency] = None
    beneficiaryCount: int = 1
    location: NeedLocation
    requiredSkills: list[str] = []
    requiredLanguages: list[str] = []
    estimatedHours: Optional[float] = None
    vulnerableGroup: bool = False
    submittedBy: str


# ── Update ────────────────────────────────────────────────────────────────────
class NeedUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[NeedCategory] = None
    urgency: Optional[NeedUrgency] = None
    status: Optional[NeedStatus] = None
    beneficiaryCount: Optional[int] = None
    location: Optional[NeedLocation] = None
    requiredSkills: Optional[list[str]] = None
    requiredLanguages: Optional[list[str]] = None
    estimatedHours: Optional[float] = None
    vulnerableGroup: Optional[bool] = None
    aiSummary: Optional[str] = None
    aiTags: Optional[list[str]] = None
    priorityScore: Optional[float] = None


# ── Response ──────────────────────────────────────────────────────────────────
class NeedResponse(BaseModel):
    id: str
    rawDescription: str
    title: str
    category: Optional[NeedCategory] = None
    urgency: Optional[NeedUrgency] = None
    status: NeedStatus
    beneficiaryCount: int
    location: NeedLocation
    requiredSkills: list[str]
    requiredLanguages: list[str]
    estimatedHours: Optional[float] = None
    vulnerableGroup: bool
    aiSummary: Optional[str] = None
    aiTags: list[str] = []
    priorityScore: Optional[float] = None
    submittedBy: str
    submittedAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None
