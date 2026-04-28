"""
routers/analytics.py — Dashboard analytics endpoints.

Routes (mounted under /analytics by main.py):
  GET /summary             → KPI counts for coordinator dashboard
  GET /volunteer-load      → per-volunteer task count and status
  GET /category-breakdown  → need count grouped by category
"""

import logging
from collections import defaultdict
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends

import firebase_config as _fa  # noqa: F401
from firebase_admin import firestore as admin_firestore

from dependencies import verify_admin
from models import (
    AnalyticsSummaryResponse,
    VolunteerLoadItem,
    VolunteerLoadResponse,
    CategoryBreakdownItem,
    CategoryBreakdownResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Analytics"])


def _get_db():
    from firebase_admin import firestore as fs
    return fs.client()


# ── GET /analytics/summary ───────────────────────────────────────────────────
@router.get(
    "/summary",
    response_model=AnalyticsSummaryResponse,
    summary="Dashboard KPI summary counts",
)
def get_summary(
    _admin: dict = Depends(verify_admin),
) -> AnalyticsSummaryResponse:
    """
    Aggregates key counts from the needs and volunteers collections:
      - totalNeeds
      - urgentNeeds (critical + high AND still unassigned statuses)
      - assignedNeeds (status in assigned | in_progress)
      - completedNeeds (status == completed)
      - unassignedNeeds (status in new | analyzed | pending_assignment)
      - activeVolunteers (status == available or busy)
      - avgAssignmentTimeHours (avg seconds from submittedAt→assignedAt
        across assigned/in_progress/completed needs — converted to hours)
    """
    db = _get_db()

    # ── Needs counts ─────────────────────────────────────────────────────
    total_needs = 0
    urgent_unassigned = 0
    assigned_needs = 0
    completed_needs = 0
    unassigned_needs = 0

    unassigned_statuses = {"new", "analyzed", "pending_assignment"}
    assigned_statuses = {"assigned", "in_progress"}
    urgent_levels = {"critical", "high"}

    assignment_times: list[float] = []  # in seconds

    for doc in db.collection("needs").stream():
        data = doc.to_dict()
        s = data.get("status", "new")
        u = data.get("urgency", "low")
        total_needs += 1

        if s in unassigned_statuses:
            unassigned_needs += 1
            if u in urgent_levels:
                urgent_unassigned += 1
        elif s in assigned_statuses:
            assigned_needs += 1
        elif s == "completed":
            completed_needs += 1

        # For avg assignment time: look at updatedAt - submittedAt for
        # needs that have been assigned or later
        if s in (assigned_statuses | {"completed"}):
            submitted = data.get("submittedAt")
            updated = data.get("updatedAt")
            if submitted and updated:
                try:
                    if hasattr(submitted, "timestamp"):
                        diff = (updated - submitted).total_seconds()
                    else:
                        diff = 0
                    if diff > 0:
                        assignment_times.append(diff)
                except Exception:
                    pass

    avg_hours = 0.0
    if assignment_times:
        avg_hours = round(sum(assignment_times) / len(assignment_times) / 3600, 2)

    # ── Volunteer counts ─────────────────────────────────────────────────
    active_volunteers = 0
    for doc in db.collection("volunteers").stream():
        vs = doc.to_dict().get("status", "offline")
        if vs in ("available", "busy"):
            active_volunteers += 1

    return AnalyticsSummaryResponse(
        totalNeeds=total_needs,
        urgentNeeds=urgent_unassigned,
        assignedNeeds=assigned_needs,
        completedNeeds=completed_needs,
        unassignedNeeds=unassigned_needs,
        activeVolunteers=active_volunteers,
        avgAssignmentTimeHours=avg_hours,
    )


# ── GET /analytics/volunteer-load ────────────────────────────────────────────
@router.get(
    "/volunteer-load",
    response_model=VolunteerLoadResponse,
    summary="Per-volunteer active and completed task counts",
)
def get_volunteer_load(
    _admin: dict = Depends(verify_admin),
) -> VolunteerLoadResponse:
    """
    Stream the volunteers collection and return each volunteer's
    uid, name (looked up from users collection), activeTaskCount,
    completedTaskCount (totalCompleted), and status.
    """
    db = _get_db()

    # Build uid → name lookup from users collection
    user_names: dict[str, str] = {}
    for doc in db.collection("users").stream():
        d = doc.to_dict()
        user_names[doc.id] = d.get("name", "Unknown")

    items: list[VolunteerLoadItem] = []
    for doc in db.collection("volunteers").stream():
        data = doc.to_dict()
        uid = doc.id
        items.append(
            VolunteerLoadItem(
                volunteerId=uid,
                volunteerName=user_names.get(uid, uid),
                activeTaskCount=data.get("activeTaskCount", 0),
                completedTaskCount=data.get("totalCompleted", 0),
                status=data.get("status", "offline"),
            )
        )

    return VolunteerLoadResponse(volunteers=items)


# ── GET /analytics/category-breakdown ─────────────────────────────────────────
@router.get(
    "/category-breakdown",
    response_model=CategoryBreakdownResponse,
    summary="Need count grouped by category",
)
def get_category_breakdown(
    _admin: dict = Depends(verify_admin),
) -> CategoryBreakdownResponse:
    """
    Stream all needs and group counts by category.
    Returns both total count and completed count per category.
    """
    db = _get_db()

    totals: dict[str, int] = defaultdict(int)
    completed: dict[str, int] = defaultdict(int)

    for doc in db.collection("needs").stream():
        data = doc.to_dict()
        cat = data.get("category", "unknown") or "unknown"
        totals[cat] += 1
        if data.get("status") == "completed":
            completed[cat] += 1

    breakdown = [
        CategoryBreakdownItem(
            category=cat,
            count=count,
            completedCount=completed.get(cat, 0),
        )
        for cat, count in sorted(totals.items(), key=lambda x: x[1], reverse=True)
    ]

    return CategoryBreakdownResponse(breakdown=breakdown)
