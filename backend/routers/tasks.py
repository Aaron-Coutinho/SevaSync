"""
routers/tasks.py — Assignment status management.

Routes (mounted under /assignments by main.py):
  GET  /             → list assignments (admin only, filterable)
  GET  /{id}         → single assignment (admin or own volunteer)
  PATCH /{id}        → update assignment status (with transition rules)

Valid status transitions:
  assigned  → accepted  (volunteer)
  assigned  → declined  (volunteer) – decrement activeTaskCount
  accepted  → started   (volunteer)
  started   → completed (volunteer) – decrement activeTaskCount,
                                       increment totalCompleted,
                                       update need → completed

All multi-doc transitions use batch writes.
Every status change writes to activity_logs.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from google.cloud import firestore
from pydantic import BaseModel

import firebase_config as _fa  # noqa: F401
from firebase_admin import firestore as admin_firestore

from dependencies import get_current_user, verify_admin
from models import (
    AssignmentResponse,
    AssignmentUpdate,
    AssignmentStatus,
    NeedStatus,
    ActivityEntityType,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Assignments"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_db() -> firestore.Client:
    from firebase_admin import firestore as fs
    return fs.client()


def _doc_to_assignment(doc) -> AssignmentResponse:
    data = doc.to_dict()
    data["id"] = doc.id
    return AssignmentResponse(**data)


# Valid state machine transitions: { current_status: set(allowed_next) }
VALID_TRANSITIONS: dict[str, set[str]] = {
    "assigned":  {"accepted", "declined"},
    "accepted":  {"started"},
    "started":   {"completed"},
}


# ── GET /assignments ──────────────────────────────────────────────────────────
@router.get(
    "",
    response_model=list[AssignmentResponse],
    summary="List assignments (admin only)",
)
def list_assignments(
    volunteerId: str | None = Query(default=None, description="Filter by volunteer UID"),
    needId: str | None = Query(default=None, description="Filter by need ID"),
    status_filter: str | None = Query(default=None, alias="status", description="Filter by status"),
    _admin: dict = Depends(verify_admin),
) -> list[AssignmentResponse]:
    """
    Return all assignment documents with optional filters applied in Python.
    Enriches each assignment with volunteer name and need title.
    Admin-only endpoint.
    """
    db = _get_db()
    
    # Fetch all assignments without Firestore filters to avoid index issues
    docs = db.collection("assignments").stream()
    results: list[AssignmentResponse] = []
    for doc in docs:
        try:
            results.append(_doc_to_assignment(doc))
        except Exception as exc:
            logger.warning("Skipping malformed assignment doc %s: %s", doc.id, exc)

    # Apply filters in Python
    if volunteerId:
        results = [a for a in results if a.volunteerId == volunteerId]
    if needId:
        results = [a for a in results if a.needId == needId]
    if status_filter:
        results = [a for a in results if a.status == status_filter]

    # Enrich with volunteer names and need titles
    enriched_results = []
    for assignment in results:
        # Fetch volunteer name from volunteers collection
        vol_doc = db.collection("volunteers").document(assignment.volunteerId).get()
        volunteer_name = assignment.volunteerId
        if vol_doc.exists:
            vol_data = vol_doc.to_dict()
            volunteer_name = vol_data.get("name") or vol_data.get("displayName") or assignment.volunteerId
            # Fallback: fetch name from users collection if missing from volunteer doc
            if not vol_data.get("name"):
                user_doc = db.collection("users").document(assignment.volunteerId).get()
                if user_doc.exists:
                    volunteer_name = user_doc.to_dict().get("name", assignment.volunteerId)
        
        # Fetch need title from needs collection
        need_doc = db.collection("needs").document(assignment.needId).get()
        need_title = need_doc.to_dict().get("title", "Untitled Need") if need_doc.exists else "Unknown Need"
        
        # Create enriched response
        enriched_data = assignment.model_dump()
        enriched_data["volunteerName"] = volunteer_name
        enriched_data["needTitle"] = need_title
        enriched_results.append(AssignmentResponse(**enriched_data))

    return enriched_results


# ── GET /assignments/{id} ─────────────────────────────────────────────────────
@router.get(
    "/{assignment_id}",
    response_model=AssignmentResponse,
    summary="Get a single assignment",
)
def get_assignment(
    assignment_id: str,
    current_user: dict = Depends(get_current_user),
) -> AssignmentResponse:
    """
    Return a single assignment.
    Admin: can fetch any assignment.
    Volunteer: can only fetch if they are the assigned volunteer.
    """
    db = _get_db()
    doc = db.collection("assignments").document(assignment_id).get()
    if not doc.exists:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"Assignment '{assignment_id}' not found.",
        )

    data = doc.to_dict()
    caller_uid = current_user["uid"]
    caller_role = current_user.get("role", "volunteer")

    if caller_role != "admin" and data.get("volunteerId") != caller_uid:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "You can only view your own assignments.",
        )

    return _doc_to_assignment(doc)


# ── PATCH /assignments/{id} ──────────────────────────────────────────────────
@router.patch(
    "/{assignment_id}",
    response_model=AssignmentResponse,
    summary="Update assignment status",
)
def update_assignment(
    assignment_id: str,
    body: AssignmentUpdate,
    current_user: dict = Depends(get_current_user),
) -> AssignmentResponse:
    """
    Progress an assignment through the status workflow.

    Access rules:
      - Admin can update any assignment.
      - Volunteer can only update their own assignment.

    Valid transitions:
      assigned → accepted | declined
      accepted → started
      started  → completed

    Side effects (batch-written):
      declined  → decrement volunteer.activeTaskCount
      completed → decrement activeTaskCount, increment totalCompleted,
                   set volunteer status to 'available' if now free,
                   update need status to 'completed'
    """
    db = _get_db()

    # Fetch assignment
    asgn_ref = db.collection("assignments").document(assignment_id)
    asgn_doc = asgn_ref.get()
    if not asgn_doc.exists:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"Assignment '{assignment_id}' not found.",
        )

    asgn_data = asgn_doc.to_dict()
    caller_uid = current_user["uid"]
    caller_role = current_user.get("role", "volunteer")

    # Access check
    if caller_role != "admin" and asgn_data.get("volunteerId") != caller_uid:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "You can only update your own assignments.",
        )

    # Determine what changed
    if body.status is None and body.notes is None:
        return _doc_to_assignment(asgn_doc)

    update_payload: dict = {}
    if body.notes is not None:
        update_payload["notes"] = body.notes

    current_status = asgn_data.get("status")
    new_status = body.status.value if body.status else None

    if new_status and new_status != current_status:
        # Validate transition
        allowed = VALID_TRANSITIONS.get(current_status, set())
        if new_status not in allowed:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"Invalid status transition: '{current_status}' → '{new_status}'. "
                f"Allowed: {sorted(allowed) if allowed else 'none (terminal state)'}.",
            )

        update_payload["status"] = new_status

        # Set the matching timestamp field
        ts_field_map = {
            "accepted": "acceptedAt",
            "started": "startedAt",
            "completed": "completedAt",
        }
        ts_field = ts_field_map.get(new_status)
        if ts_field:
            update_payload[ts_field] = admin_firestore.SERVER_TIMESTAMP

    # ── Batch write ──────────────────────────────────────────────────────
    batch = db.batch()
    batch.update(asgn_ref, update_payload)

    volunteer_id = asgn_data.get("volunteerId", "")
    need_id = asgn_data.get("needId", "")

    if new_status == "declined":
        # Decrement volunteer activeTaskCount
        vol_ref = db.collection("volunteers").document(volunteer_id)
        vol_doc = vol_ref.get()
        if vol_doc.exists:
            vol_data = vol_doc.to_dict()
            new_active = max(vol_data.get("activeTaskCount", 1) - 1, 0)
            vol_update: dict = {"activeTaskCount": new_active}
            # If volunteer was busy and now has room, set available
            if vol_data.get("status") == "busy":
                vol_update["status"] = "available"
            batch.update(vol_ref, vol_update)

        # Re-open the need for reassignment
        need_ref = db.collection("needs").document(need_id)
        batch.update(need_ref, {
            "status": NeedStatus.pending_assignment.value,
            "updatedAt": admin_firestore.SERVER_TIMESTAMP,
        })

    elif new_status == "completed":
        # Decrement activeTaskCount, increment totalCompleted
        vol_ref = db.collection("volunteers").document(volunteer_id)
        vol_doc = vol_ref.get()
        if vol_doc.exists:
            vol_data = vol_doc.to_dict()
            new_active = max(vol_data.get("activeTaskCount", 1) - 1, 0)
            new_completed = vol_data.get("totalCompleted", 0) + 1
            vol_update = {
                "activeTaskCount": new_active,
                "totalCompleted": new_completed,
            }
            # If volunteer was busy and now has room, set available
            if vol_data.get("status") == "busy" and new_active < vol_data.get("maxActiveTasks", 3):
                vol_update["status"] = "available"
            batch.update(vol_ref, vol_update)

        # Mark need as completed
        need_ref = db.collection("needs").document(need_id)
        batch.update(need_ref, {
            "status": NeedStatus.completed.value,
            "updatedAt": admin_firestore.SERVER_TIMESTAMP,
        })

    # Activity log
    if new_status:
        log_ref = db.collection("activity_logs").document()
        batch.set(
            log_ref,
            {
                "entityType": ActivityEntityType.assignment,
                "entityId": assignment_id,
                "action": "status_changed",
                "actor": caller_uid,
                "actorRole": caller_role,
                "metadata": {
                    "from": current_status,
                    "to": new_status,
                    "needId": need_id,
                    "volunteerId": volunteer_id,
                },
                "timestamp": admin_firestore.SERVER_TIMESTAMP,
            },
        )

    batch.commit()
    return _doc_to_assignment(asgn_ref.get())
