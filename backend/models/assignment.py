from enum import Enum
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class AssignmentStatus(str, Enum):
    assigned = "assigned"
    accepted = "accepted"
    started = "started"
    completed = "completed"
    declined = "declined"


# ── Create ────────────────────────────────────────────────────────────────────
class AssignmentCreate(BaseModel):
    needId: str
    volunteerId: str
    matchScore: float = 0.0
    matchReasons: list[str] = []
    assignedBy: str  # admin uid
    notes: str = ""


# ── Update ────────────────────────────────────────────────────────────────────
class AssignmentUpdate(BaseModel):
    status: Optional[AssignmentStatus] = None
    notes: Optional[str] = None


# ── Response ──────────────────────────────────────────────────────────────────
class AssignmentResponse(BaseModel):
    id: str
    needId: str
    volunteerId: str
    matchScore: float
    matchReasons: list[str]
    assignedBy: str
    status: AssignmentStatus
    notes: str
    assignedAt: Optional[datetime] = None
    acceptedAt: Optional[datetime] = None
    startedAt: Optional[datetime] = None
    completedAt: Optional[datetime] = None


# ── Match Suggestion sub-models ───────────────────────────────────────────────
class VolunteerSuggestion(BaseModel):
    volunteerId: str
    score: float
    reasons: list[str]


class MatchSuggestionResponse(BaseModel):
    id: str
    needId: str
    suggestions: list[VolunteerSuggestion]
    generatedAt: Optional[datetime] = None
