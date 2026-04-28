from enum import Enum
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel


class ActivityEntityType(str, Enum):
    need = "need"
    assignment = "assignment"
    volunteer = "volunteer"


# ── Create ────────────────────────────────────────────────────────────────────
class ActivityLogCreate(BaseModel):
    entityType: ActivityEntityType
    entityId: str
    action: str          # e.g. "status_changed", "assigned", "completed"
    actor: str           # uid
    actorRole: str
    metadata: dict[str, Any] = {}


# ── Update ────────────────────────────────────────────────────────────────────
# Activity logs are immutable — no update schema needed.


# ── Response ──────────────────────────────────────────────────────────────────
class ActivityLogResponse(BaseModel):
    id: str
    entityType: ActivityEntityType
    entityId: str
    action: str
    actor: str
    actorRole: str
    metadata: dict[str, Any]
    timestamp: Optional[datetime] = None
