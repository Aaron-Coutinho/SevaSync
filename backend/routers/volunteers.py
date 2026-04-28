"""
routers/volunteers.py — Volunteer directory endpoints.

Routes (mounted under /volunteers by main.py):
  GET  /                  → list all volunteers (admin only)
                            query params: skill, status, area
  GET  /{uid}             → single volunteer (admin or own uid)
  PUT  /{uid}             → update profile (own uid only)
  GET  /{uid}/tasks       → all assignments for this volunteer
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from google.cloud import firestore

import firebase_config as _fa  # noqa: F401 — triggers Admin SDK init
from firebase_admin import firestore as admin_firestore

from dependencies import get_current_user, verify_admin
from models import (
    VolunteerResponse,
    VolunteerUpdate,
    AssignmentResponse,
    AssignmentStatus,
    ActivityLogCreate,
    ActivityEntityType,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Volunteers"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_db() -> firestore.Client:
    from firebase_admin import firestore as fs
    return fs.client()


def _doc_to_volunteer(doc) -> VolunteerResponse:
    """Convert a Firestore DocumentSnapshot to a VolunteerResponse."""
    data = doc.to_dict()
    data["uid"] = doc.id
    # Normalize nested dicts for Pydantic
    return VolunteerResponse(**data)


def _doc_to_assignment(doc) -> AssignmentResponse:
    """Convert a Firestore DocumentSnapshot to an AssignmentResponse."""
    data = doc.to_dict()
    data["id"] = doc.id
    return AssignmentResponse(**data)


def _log_activity(
    db: firestore.Client,
    entry: ActivityLogCreate,
) -> None:
    log_ref = db.collection("activity_logs").document()
    log_ref.set(
        {
            "entityType": entry.entityType,
            "entityId": entry.entityId,
            "action": entry.action,
            "actor": entry.actor,
            "actorRole": entry.actorRole,
            "metadata": entry.metadata,
            "timestamp": admin_firestore.SERVER_TIMESTAMP,
        }
    )


# ── GET /volunteers ───────────────────────────────────────────────────────────
@router.get(
    "",
    response_model=list[VolunteerResponse],
    summary="List all volunteers (admin only)",
)
def list_volunteers(
    skill: str | None = Query(default=None, description="Filter by skill tag"),
    status: str | None = Query(default=None, description="Filter by volunteer status"),
    area: str | None = Query(default=None, description="Filter by location.area"),
    _admin: dict = Depends(verify_admin),
) -> list[VolunteerResponse]:
    """
    Return all volunteer profiles from Firestore.

    Supports optional query filters:
      - skill  → volunteers whose skills array contains this value
      - status → volunteers with this status (available/busy/offline)
      - area   → volunteers whose location.area matches (case-insensitive substring)

    Note: Firestore compound queries require composite indexes. Filters are
    applied in Python for prototype flexibility; add Firestore indexes for
    production performance.
    """
    db = _get_db()
    query = db.collection("volunteers")

    # Apply server-side Firestore filters where straightforward
    if skill:
        query = query.where(filter=firestore.FieldFilter("skills", "array_contains", skill))
    if status:
        query = query.where(filter=firestore.FieldFilter("status", "==", status))

    docs = query.stream()
    results: list[VolunteerResponse] = []

    for doc in docs:
        try:
            volunteer_data = doc.to_dict()
            volunteer_data["uid"] = doc.id

            # Fallback: fetch name from users collection if missing
            if not volunteer_data.get("name"):
                user_doc = db.collection("users").document(doc.id).get()
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    volunteer_data["name"] = user_data.get("name", "")
                    if not volunteer_data.get("email"):
                        volunteer_data["email"] = user_data.get("email", "")

            volunteer = VolunteerResponse(**volunteer_data)
            # area filter applied in Python (Firestore can't filter nested fields easily)
            if area and volunteer.location.area.lower() != area.lower():
                continue
            results.append(volunteer)
        except Exception as exc:
            logger.warning("Skipping malformed volunteer doc %s: %s", doc.id, exc)

    return results


# ── GET /volunteers/{uid} ─────────────────────────────────────────────────────
@router.get(
    "/{uid}",
    response_model=VolunteerResponse,
    summary="Get a single volunteer profile",
)
def get_volunteer(
    uid: str,
    current_user: dict = Depends(get_current_user),
) -> VolunteerResponse:
    """
    Return a single volunteer profile by UID.

    Access rules:
      - Admin: can fetch any volunteer.
      - Volunteer: can only fetch their own profile (uid == current user uid).
    """
    caller_uid = current_user["uid"]
    caller_role = current_user.get("role", "volunteer")

    if caller_role != "admin" and caller_uid != uid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own profile.",
        )

    db = _get_db()
    doc = db.collection("volunteers").document(uid).get()

    if not doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Volunteer with uid '{uid}' not found.",
        )

    volunteer_data = doc.to_dict()
    volunteer_data["uid"] = doc.id

    # Fallback: fetch name and email from users collection if missing
    if not volunteer_data.get("name"):
        user_doc = db.collection("users").document(uid).get()
        if user_doc.exists:
            user_data = user_doc.to_dict()
            volunteer_data["name"] = user_data.get("name", "")
            if not volunteer_data.get("email"):
                volunteer_data["email"] = user_data.get("email", "")

    return VolunteerResponse(**volunteer_data)


# ── PUT /volunteers/{uid} ─────────────────────────────────────────────────────
@router.put(
    "/{uid}",
    response_model=VolunteerResponse,
    summary="Update a volunteer profile (own uid only)",
)
def update_volunteer(
    uid: str,
    body: VolunteerUpdate,
    current_user: dict = Depends(get_current_user),
) -> VolunteerResponse:
    """
    Update a volunteer's profile fields.

    Only the volunteer themselves can update their own profile.
    Admins use separate admin endpoints.

    Fields like activeTaskCount, totalCompleted, verified are NOT
    updatable through this endpoint (backend-controlled).

    If status changes, an activity log entry is written.
    """
    caller_uid = current_user["uid"]

    if caller_uid != uid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own profile.",
        )

    db = _get_db()
    vol_ref = db.collection("volunteers").document(uid)
    doc = vol_ref.get()

    if not doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Volunteer with uid '{uid}' not found.",
        )

    # Build update payload — only include fields that were explicitly set
    update_data: dict = {}
    prev_data = doc.to_dict()

    if body.phone is not None:
        update_data["phone"] = body.phone
    if body.skills is not None:
        update_data["skills"] = [s.value for s in body.skills]
    if body.languages is not None:
        update_data["languages"] = body.languages
    if body.location is not None:
        update_data["location"] = body.location.model_dump()
    if body.availability is not None:
        update_data["availability"] = body.availability.model_dump()
    if body.maxActiveTasks is not None:
        update_data["maxActiveTasks"] = body.maxActiveTasks
    if body.status is not None:
        update_data["status"] = body.status.value

    if not update_data:
        # Nothing to update — return current doc
        return _doc_to_volunteer(doc)

    # Use batch: update volunteer doc + write activity log atomically
    batch = db.batch()

    batch.update(vol_ref, update_data)

    # Log status change if status was updated
    if "status" in update_data:
        log_ref = db.collection("activity_logs").document()
        batch.set(
            log_ref,
            {
                "entityType": ActivityEntityType.volunteer,
                "entityId": uid,
                "action": "status_changed",
                "actor": caller_uid,
                "actorRole": current_user.get("role", "volunteer"),
                "metadata": {
                    "from": prev_data.get("status"),
                    "to": update_data["status"],
                },
                "timestamp": admin_firestore.SERVER_TIMESTAMP,
            },
        )

    batch.commit()

    # Fetch updated doc and return
    updated_doc = vol_ref.get()
    return _doc_to_volunteer(updated_doc)


# ── GET /volunteers/{uid}/tasks ───────────────────────────────────────────────
@router.get(
    "/{uid}/tasks",
    response_model=list[AssignmentResponse],
    summary="Get all assignments for a volunteer",
)
def get_volunteer_tasks(
    uid: str,
    current_user: dict = Depends(get_current_user),
) -> list[AssignmentResponse]:
    """
    Return all assignment documents where volunteerId == uid.

    Access rules:
      - Admin: can view any volunteer's tasks.
      - Volunteer: can only view their own tasks.

    Results are ordered by assignedAt descending (most recent first).
    """
    caller_uid = current_user["uid"]
    caller_role = current_user.get("role", "volunteer")

    if caller_role != "admin" and caller_uid != uid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own assignments.",
        )

    db = _get_db()
    docs = (
        db.collection("assignments")
        .where(filter=firestore.FieldFilter("volunteerId", "==", uid))
        .stream()
    )

    results: list[AssignmentResponse] = []
    for doc in docs:
        try:
            results.append(_doc_to_assignment(doc))
        except Exception as exc:
            logger.warning("Skipping malformed assignment doc %s: %s", doc.id, exc)

    # Enrich with need data
    enriched_results = []
    for assignment in results:
        need_id = assignment.needId
        if need_id:
            need_doc = db.collection("needs").document(need_id).get()
            if need_doc.exists:
                need_data = need_doc.to_dict()
                # Create enriched response
                enriched_data = assignment.model_dump()
                enriched_data["needTitle"] = need_data.get("title", "Unknown Need")
                enriched_data["urgency"] = need_data.get("urgency")
                enriched_data["area"] = need_data.get("location", {}).get("area")
                enriched_results.append(AssignmentResponse(**enriched_data))
            else:
                # Need not found, add default values
                enriched_data = assignment.model_dump()
                enriched_data["needTitle"] = "Unknown Need"
                enriched_data["urgency"] = None
                enriched_data["area"] = None
                enriched_results.append(AssignmentResponse(**enriched_data))
        else:
            # No needId, add default values
            enriched_data = assignment.model_dump()
            enriched_data["needTitle"] = "Unknown Need"
            enriched_data["urgency"] = None
            enriched_data["area"] = None
            enriched_results.append(AssignmentResponse(**enriched_data))

    # Sort in memory to avoid requiring a Firestore composite index
    enriched_results.sort(
        key=lambda x: x.assignedAt.timestamp() if x.assignedAt else 0,
        reverse=True
    )

    return enriched_results
