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
    matchScore: float = 0.0
    matchReasons: list[str] = []
    assignedBy: str
    status: AssignmentStatus
    notes: str = ""
    assignedAt: Optional[datetime] = None
    acceptedAt: Optional[datetime] = None
    startedAt: Optional[datetime] = None
    completedAt: Optional[datetime] = None
    # Enriched fields for display
    volunteerName: Optional[str] = None
    needTitle: Optional[str] = None
    urgency: Optional[str] = None
    area: Optional[str] = None


# ── Match Suggestion sub-models ───────────────────────────────────────────────
class VolunteerSuggestion(BaseModel):
    volunteerId: str
    name: str  # Volunteer's actual name from volunteer document
    score: float
    reasons: list[str]


class MatchSuggestionResponse(BaseModel):
    id: str
    needId: str
    suggestions: list[VolunteerSuggestion]
    generatedAt: Optional[datetime] = None
