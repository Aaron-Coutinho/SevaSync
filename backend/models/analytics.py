from pydantic import BaseModel


# ── GET /analytics/summary ────────────────────────────────────────────────────
class AnalyticsSummaryResponse(BaseModel):
    """Response model for GET /analytics/summary."""
    totalNeeds: int
    urgentNeeds: int          # urgency == critical or high
    assignedNeeds: int        # status == assigned | in_progress
    completedNeeds: int       # status == completed
    unassignedNeeds: int      # status == new | analyzed | pending_assignment
    activeVolunteers: int     # status == available | busy
    avgAssignmentTimeHours: float  # avg time from submittedAt → assignedAt


# ── GET /analytics/volunteer-load ────────────────────────────────────────────
class VolunteerLoadItem(BaseModel):
    volunteerId: str
    volunteerName: str
    activeTaskCount: int
    completedTaskCount: int
    status: str


class VolunteerLoadResponse(BaseModel):
    """Response model for GET /analytics/volunteer-load."""
    volunteers: list[VolunteerLoadItem]


# ── GET /analytics/category-breakdown ────────────────────────────────────────
class CategoryBreakdownItem(BaseModel):
    category: str
    count: int
    completedCount: int


class CategoryBreakdownResponse(BaseModel):
    """Response model for GET /analytics/category-breakdown."""
    breakdown: list[CategoryBreakdownItem]
