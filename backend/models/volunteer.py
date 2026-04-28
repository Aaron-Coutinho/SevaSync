from enum import Enum
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class SkillTag(str, Enum):
    medical = "medical"
    counselling = "counselling"
    logistics = "logistics"
    translation = "translation"
    data_entry = "data_entry"
    field_support = "field_support"
    community_outreach = "community_outreach"
    documentation = "documentation"


class VolunteerStatus(str, Enum):
    available = "available"
    busy = "busy"
    offline = "offline"


class PreferredTime(str, Enum):
    morning = "morning"
    afternoon = "afternoon"
    evening = "evening"
    flexible = "flexible"


# ── Nested ───────────────────────────────────────────────────────────────────
class VolunteerLocation(BaseModel):
    area: str
    city: str
    lat: float = 0.0
    lng: float = 0.0


class VolunteerAvailability(BaseModel):
    weekdays: bool = True
    weekends: bool = False
    hoursPerWeek: int = 10
    preferredTime: PreferredTime = PreferredTime.flexible


# ── Create ───────────────────────────────────────────────────────────────────
class VolunteerCreate(BaseModel):
    uid: str
    phone: str
    skills: list[SkillTag] = []
    languages: list[str] = []
    location: VolunteerLocation
    availability: VolunteerAvailability = VolunteerAvailability()
    maxActiveTasks: int = 3


# ── Update ───────────────────────────────────────────────────────────────────
class VolunteerUpdate(BaseModel):
    phone: Optional[str] = None
    skills: Optional[list[SkillTag]] = None
    languages: Optional[list[str]] = None
    location: Optional[VolunteerLocation] = None
    availability: Optional[VolunteerAvailability] = None
    maxActiveTasks: Optional[int] = None
    status: Optional[VolunteerStatus] = None


# ── Response ──────────────────────────────────────────────────────────────────
class VolunteerResponse(BaseModel):
    uid: str
    phone: Optional[str] = ""          # optional — may be absent in seeded docs
    skills: list[str] = []              # plain str so unknown tags don't crash
    languages: list[str] = []
    location: VolunteerLocation
    availability: VolunteerAvailability = VolunteerAvailability()
    maxActiveTasks: int = 3
    activeTaskCount: int = 0
    status: VolunteerStatus = VolunteerStatus.available
    verified: Optional[bool] = False    # optional — may be absent in seeded docs
    totalCompleted: int = 0
    rating: float = 0.0
    joinedAt: Optional[datetime] = None
    # Extra flat fields that come from seed data written before location nesting
    name: Optional[str] = None
    area: Optional[str] = None          # legacy flat field in seed docs
