from enum import Enum
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class UserRole(str, Enum):
    admin = "admin"
    volunteer = "volunteer"
    field_volunteer = "field_volunteer"


# ── Create ──────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    role: UserRole = UserRole.volunteer
    organization: str


# ── Update ──────────────────────────────────────────────────────────────────
class UserUpdate(BaseModel):
    name: Optional[str] = None
    organization: Optional[str] = None
    role: Optional[UserRole] = None


# ── Response ─────────────────────────────────────────────────────────────────
class UserResponse(BaseModel):
    uid: str
    name: str
    email: str
    role: UserRole
    organization: str
    createdAt: Optional[datetime] = None
