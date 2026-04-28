"""
routers/needs.py — Need request CRUD, AI analysis, matching, and assignment.

Routes (mounted under /needs by main.py):
  POST /                  → create new need + trigger Gemini analysis
  GET  /                  → list all needs (admin, filterable)
  GET  /{id}              → single need
  PATCH /{id}             → partial update (recomputes priority if relevant)
  POST /{id}/analyze      → re-run Gemini analysis
  GET  /{id}/suggestions  → compute + return top volunteer matches
  POST /{id}/assign       → assign volunteer (batch write)
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from google.cloud import firestore
from pydantic import BaseModel

import firebase_config as _fa  # noqa: F401
from firebase_admin import firestore as admin_firestore

from dependencies import verify_admin
from models import (
    NeedCreate,
    NeedUpdate,
    NeedResponse,
    NeedStatus,
    AssignmentCreate,
    AssignmentResponse,
    AssignmentStatus,
    MatchSuggestionResponse,
    VolunteerSuggestion,
    ActivityLogCreate,
    ActivityEntityType,
)
from services.gemini import analyze_need, explain_matches
from services.priority import compute_priority_score
from services.matching import get_top_matches

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Needs"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_db() -> firestore.Client:
    from firebase_admin import firestore as fs
    return fs.client()


def _doc_to_need(doc) -> NeedResponse:
    data = doc.to_dict()
    data["id"] = doc.id
    return NeedResponse(**data)


def _log_activity(db: firestore.Client, entry: ActivityLogCreate) -> None:
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


class AssignBody(BaseModel):
    """Request body for POST /needs/{id}/assign."""
    volunteerId: str


# ── POST /needs ───────────────────────────────────────────────────────────────
@router.post(
    "/",
    response_model=NeedResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new community need",
)
def create_need(
    body: NeedCreate,
    admin: dict = Depends(verify_admin),
) -> NeedResponse:
    """
    Store a new need request in Firestore, then immediately call Gemini
    to structure the raw text.  If AI analysis succeeds the document is
    updated with AI fields, status set to 'analyzed', and the priority
    score computed.

    Activity log entry is written for creation.
    """
    db = _get_db()

    # ── 1. Persist the raw need ──────────────────────────────────────────
    doc_data: dict = {
        "rawDescription": body.rawDescription,
        "title": body.title or "",
        "category": body.category.value if body.category else None,
        "urgency": body.urgency.value if body.urgency else None,
        "status": NeedStatus.new.value,
        "beneficiaryCount": body.beneficiaryCount,
        "location": body.location.model_dump(),
        "requiredSkills": body.requiredSkills,
        "requiredLanguages": body.requiredLanguages,
        "estimatedHours": body.estimatedHours,
        "vulnerableGroup": body.vulnerableGroup,
        "aiSummary": None,
        "aiTags": [],
        "priorityScore": 0,
        "submittedBy": admin["uid"],
        "submittedAt": admin_firestore.SERVER_TIMESTAMP,
        "updatedAt": admin_firestore.SERVER_TIMESTAMP,
    }

    doc_ref = db.collection("needs").document()
    doc_ref.set(doc_data)
    need_id = doc_ref.id

    # ── 2. Activity log ──────────────────────────────────────────────────
    _log_activity(
        db,
        ActivityLogCreate(
            entityType=ActivityEntityType.need,
            entityId=need_id,
            action="need_created",
            actor=admin["uid"],
            actorRole="admin",
            metadata={"rawDescription": body.rawDescription[:120]},
        ),
    )

    # ── 3. Gemini analysis (synchronous, best-effort) ────────────────────
    ai_result = analyze_need(body.rawDescription)
    if ai_result:
        ai_update: dict = {
            "title": ai_result.get("title") or doc_data["title"],
            "category": ai_result.get("category"),
            "urgency": ai_result.get("urgency"),
            "requiredSkills": ai_result.get("requiredSkills", []),
            "requiredLanguages": ai_result.get("requiredLanguages", []),
            "estimatedHours": ai_result.get("estimatedHours"),
            "vulnerableGroup": ai_result.get("vulnerableGroup", False),
            "aiSummary": ai_result.get("aiSummary"),
            "aiTags": ai_result.get("aiTags", []),
            "status": NeedStatus.analyzed.value,
            "updatedAt": admin_firestore.SERVER_TIMESTAMP,
        }

        # Build a dict that includes AI fields for priority computation
        need_for_score = {**doc_data, **ai_update}
        # After set(), submittedAt is server-timestamped; fetch for age calc
        fresh_doc = doc_ref.get().to_dict()
        need_for_score["submittedAt"] = fresh_doc.get("submittedAt")

        ai_update["priorityScore"] = compute_priority_score(need_for_score)
        doc_ref.update(ai_update)

    # ── 4. Return ────────────────────────────────────────────────────────
    return _doc_to_need(doc_ref.get())


# ── GET /needs ────────────────────────────────────────────────────────────────
@router.get(
    "/",
    response_model=list[NeedResponse],
    summary="List all needs sorted by priority",
)
def list_needs(
    status_filter: str | None = Query(
        default=None, alias="status", description="Filter by need status"
    ),
    urgency: str | None = Query(default=None, description="Filter by urgency level"),
    category: str | None = Query(default=None, description="Filter by category"),
    _admin: dict = Depends(verify_admin),
) -> list[NeedResponse]:
    """
    Stream all needs from Firestore, apply optional filters, and return
    sorted by priorityScore descending (highest priority first).
    """
    db = _get_db()
    query = db.collection("needs")

    if status_filter:
        query = query.where(filter=firestore.FieldFilter("status", "==", status_filter))
    if urgency:
        query = query.where(filter=firestore.FieldFilter("urgency", "==", urgency))
    if category:
        query = query.where(filter=firestore.FieldFilter("category", "==", category))

    docs = query.stream()
    results: list[NeedResponse] = []
    for doc in docs:
        try:
            results.append(_doc_to_need(doc))
        except Exception as exc:
            logger.warning("Skipping malformed need doc %s: %s", doc.id, exc)

    # Sort by priorityScore descending in Python (avoids compound index)
    results.sort(key=lambda n: n.priorityScore or 0, reverse=True)
    return results


# ── GET /needs/{id} ───────────────────────────────────────────────────────────
@router.get(
    "/{need_id}",
    response_model=NeedResponse,
    summary="Get a single need by ID",
)
def get_need(
    need_id: str,
    _admin: dict = Depends(verify_admin),
) -> NeedResponse:
    db = _get_db()
    doc = db.collection("needs").document(need_id).get()
    if not doc.exists:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Need '{need_id}' not found.")
    return _doc_to_need(doc)


# ── PATCH /needs/{id} ─────────────────────────────────────────────────────────
@router.patch(
    "/{need_id}",
    response_model=NeedResponse,
    summary="Partial update of a need",
)
def update_need(
    need_id: str,
    body: NeedUpdate,
    admin: dict = Depends(verify_admin),
) -> NeedResponse:
    """
    Update individual fields on a need document.  If urgency,
    beneficiaryCount, or vulnerableGroup changes, the priority score is
    recomputed.  Status changes are logged to activity_logs.
    """
    db = _get_db()
    need_ref = db.collection("needs").document(need_id)
    doc = need_ref.get()
    if not doc.exists:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Need '{need_id}' not found.")

    prev = doc.to_dict()
    update_data: dict = {}

    # Build only the fields that were explicitly provided
    if body.title is not None:
        update_data["title"] = body.title
    if body.category is not None:
        update_data["category"] = body.category.value
    if body.urgency is not None:
        update_data["urgency"] = body.urgency.value
    if body.status is not None:
        update_data["status"] = body.status.value
    if body.beneficiaryCount is not None:
        update_data["beneficiaryCount"] = body.beneficiaryCount
    if body.location is not None:
        update_data["location"] = body.location.model_dump()
    if body.requiredSkills is not None:
        update_data["requiredSkills"] = body.requiredSkills
    if body.requiredLanguages is not None:
        update_data["requiredLanguages"] = body.requiredLanguages
    if body.estimatedHours is not None:
        update_data["estimatedHours"] = body.estimatedHours
    if body.vulnerableGroup is not None:
        update_data["vulnerableGroup"] = body.vulnerableGroup
    if body.aiSummary is not None:
        update_data["aiSummary"] = body.aiSummary
    if body.aiTags is not None:
        update_data["aiTags"] = body.aiTags
    if body.priorityScore is not None:
        update_data["priorityScore"] = body.priorityScore

    if not update_data:
        return _doc_to_need(doc)

    update_data["updatedAt"] = admin_firestore.SERVER_TIMESTAMP

    # Recompute priority if scoring-relevant fields changed
    score_fields = {"urgency", "beneficiaryCount", "vulnerableGroup"}
    if score_fields & update_data.keys():
        merged = {**prev, **update_data}
        merged["submittedAt"] = prev.get("submittedAt")
        update_data["priorityScore"] = compute_priority_score(merged)

    # Batch: update need + optional activity log
    batch = db.batch()
    batch.update(need_ref, update_data)

    if "status" in update_data:
        log_ref = db.collection("activity_logs").document()
        batch.set(
            log_ref,
            {
                "entityType": ActivityEntityType.need,
                "entityId": need_id,
                "action": "status_changed",
                "actor": admin["uid"],
                "actorRole": "admin",
                "metadata": {
                    "from": prev.get("status"),
                    "to": update_data["status"],
                },
                "timestamp": admin_firestore.SERVER_TIMESTAMP,
            },
        )

    batch.commit()
    return _doc_to_need(need_ref.get())


# ── POST /needs/{id}/analyze ─────────────────────────────────────────────────
@router.post(
    "/{need_id}/analyze",
    response_model=NeedResponse,
    summary="Re-run Gemini analysis on a need",
)
def reanalyze_need(
    need_id: str,
    admin: dict = Depends(verify_admin),
) -> NeedResponse:
    """
    Re-invoke Gemini to re-parse the rawDescription and overwrite the AI
    fields.  Useful when the coordinator edits the raw description or
    wants a second analysis pass.
    """
    db = _get_db()
    need_ref = db.collection("needs").document(need_id)
    doc = need_ref.get()
    if not doc.exists:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Need '{need_id}' not found.")

    need_data = doc.to_dict()
    ai_result = analyze_need(need_data.get("rawDescription", ""))
    if ai_result is None:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Gemini analysis failed. The need has been flagged for manual review.",
        )

    ai_update: dict = {
        "title": ai_result.get("title") or need_data.get("title", ""),
        "category": ai_result.get("category"),
        "urgency": ai_result.get("urgency"),
        "requiredSkills": ai_result.get("requiredSkills", []),
        "requiredLanguages": ai_result.get("requiredLanguages", []),
        "estimatedHours": ai_result.get("estimatedHours"),
        "vulnerableGroup": ai_result.get("vulnerableGroup", False),
        "aiSummary": ai_result.get("aiSummary"),
        "aiTags": ai_result.get("aiTags", []),
        "status": NeedStatus.analyzed.value,
        "updatedAt": admin_firestore.SERVER_TIMESTAMP,
    }

    merged = {**need_data, **ai_update}
    merged["submittedAt"] = need_data.get("submittedAt")
    ai_update["priorityScore"] = compute_priority_score(merged)

    need_ref.update(ai_update)

    _log_activity(
        db,
        ActivityLogCreate(
            entityType=ActivityEntityType.need,
            entityId=need_id,
            action="need_reanalyzed",
            actor=admin["uid"],
            actorRole="admin",
            metadata={},
        ),
    )

    return _doc_to_need(need_ref.get())


# ── GET /needs/{id}/suggestions ───────────────────────────────────────────────
@router.get(
    "/{need_id}/suggestions",
    response_model=MatchSuggestionResponse,
    summary="Get volunteer match suggestions for a need",
)
def get_suggestions(
    need_id: str,
    admin: dict = Depends(verify_admin),
) -> MatchSuggestionResponse:
    """
    Compute top volunteer recommendations for the given need.

    1. Fetch all volunteers from Firestore.
    2. Run deterministic matching engine (get_top_matches).
    3. Call Gemini for human-readable match explanations.
    4. Persist result in match_suggestions collection.
    5. Return MatchSuggestionResponse.
    """
    db = _get_db()
    need_doc = db.collection("needs").document(need_id).get()
    if not need_doc.exists:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Need '{need_id}' not found.")

    need_data = need_doc.to_dict()
    need_data["id"] = need_id

    # Fetch all volunteers as dicts
    vol_docs = db.collection("volunteers").stream()
    volunteers = []
    for vd in vol_docs:
        v = vd.to_dict()
        v["uid"] = vd.id
        volunteers.append(v)

    # Deterministic scoring
    top_matches = get_top_matches(need_data, volunteers)

    # Gemini explanations (best-effort)
    explanations = explain_matches(need_data, top_matches)
    for i, match in enumerate(top_matches):
        if explanations and i < len(explanations) and explanations[i]:
            # Prepend the Gemini explanation to the reasons list
            match["reasons"] = [explanations[i]] + match.get("reasons", [])

    # Persist to match_suggestions
    suggestion_ref = db.collection("match_suggestions").document()
    suggestion_doc = {
        "needId": need_id,
        "suggestions": top_matches,  # each has volunteerId, score, reasons
        "generatedAt": admin_firestore.SERVER_TIMESTAMP,
    }
    suggestion_ref.set(suggestion_doc)

    return MatchSuggestionResponse(
        id=suggestion_ref.id,
        needId=need_id,
        suggestions=[
            VolunteerSuggestion(
                volunteerId=m["volunteerId"],
                score=m["score"],
                reasons=m["reasons"],
            )
            for m in top_matches
        ],
    )


# ── GET /needs/{id}/activity ─────────────────────────────────────────────────
@router.get(
    "/{need_id}/activity",
    summary="Get activity log for a specific need",
)
def get_need_activity(
    need_id: str,
    _admin: dict = Depends(verify_admin),
) -> list[dict]:
    """
    Return all activity_logs entries where entityId == need_id,
    ordered by timestamp descending (most recent first).
    Used by the need detail page to render the activity timeline.
    """
    db = _get_db()
    docs = (
        db.collection("activity_logs")
        .where(filter=firestore.FieldFilter("entityId", "==", need_id))
        .stream()
    )
    results = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        # Convert Firestore Timestamp to ISO string for JSON serialisation
        ts = data.get("timestamp")
        if ts and hasattr(ts, "isoformat"):
            data["timestamp"] = ts.isoformat()
        elif ts and hasattr(ts, "seconds"):
            from datetime import datetime, timezone
            data["timestamp"] = datetime.fromtimestamp(
                ts.seconds, tz=timezone.utc
            ).isoformat()
        results.append(data)

    results.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return results


# ── POST /needs/{id}/assign ──────────────────────────────────────────────────
@router.post(
    "/{need_id}/assign",
    response_model=AssignmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Assign a volunteer to this need",
)
def assign_volunteer(
    need_id: str,
    body: AssignBody,
    admin: dict = Depends(verify_admin),
) -> AssignmentResponse:
    """
    Create an assignment linking the need to the chosen volunteer.

    Batch write:
      1. Create assignment doc in assignments collection.
      2. Update need status → 'assigned'.
      3. Increment volunteer.activeTaskCount.
      4. If activeTaskCount >= maxActiveTasks → set volunteer status to 'busy'.
      5. Write activity log.
    """
    db = _get_db()

    # Validate need
    need_ref = db.collection("needs").document(need_id)
    need_doc = need_ref.get()
    if not need_doc.exists:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Need '{need_id}' not found.")

    # Validate volunteer
    vol_ref = db.collection("volunteers").document(body.volunteerId)
    vol_doc = vol_ref.get()
    if not vol_doc.exists:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"Volunteer '{body.volunteerId}' not found.",
        )

    vol_data = vol_doc.to_dict()
    need_data = need_doc.to_dict()

    # Check capacity
    active_count = vol_data.get("activeTaskCount", 0)
    max_tasks = vol_data.get("maxActiveTasks", 3)
    if active_count >= max_tasks:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Volunteer '{body.volunteerId}' is at max capacity "
            f"({active_count}/{max_tasks} active tasks).",
        )

    # Look up match score if a match_suggestion exists
    match_score = 0.0
    match_reasons: list[str] = []
    suggestions_query = (
        db.collection("match_suggestions")
        .where(filter=firestore.FieldFilter("needId", "==", need_id))
        .stream()
    )
    sug_docs = list(suggestions_query)
    sug_docs.sort(
        key=lambda x: x.to_dict().get("generatedAt", "").timestamp() if hasattr(x.to_dict().get("generatedAt", ""), "timestamp") else 0,
        reverse=True
    )
    for sug_doc in sug_docs[:1]:
        for s in sug_doc.to_dict().get("suggestions", []):
            if s.get("volunteerId") == body.volunteerId:
                match_score = s.get("score", 0)
                match_reasons = s.get("reasons", [])
                break

    # ── Batch write ──────────────────────────────────────────────────────
    batch = db.batch()

    # 1. Create assignment doc
    assignment_ref = db.collection("assignments").document()
    assignment_data = {
        "needId": need_id,
        "volunteerId": body.volunteerId,
        "matchScore": match_score,
        "matchReasons": match_reasons,
        "assignedBy": admin["uid"],
        "status": AssignmentStatus.assigned.value,
        "notes": "",
        "assignedAt": admin_firestore.SERVER_TIMESTAMP,
        "acceptedAt": None,
        "startedAt": None,
        "completedAt": None,
    }
    batch.set(assignment_ref, assignment_data)

    # 2. Update need status
    batch.update(need_ref, {
        "status": NeedStatus.assigned.value,
        "updatedAt": admin_firestore.SERVER_TIMESTAMP,
    })

    # 3. Update volunteer activeTaskCount + possibly status
    new_active = active_count + 1
    vol_update: dict = {"activeTaskCount": new_active}
    if new_active >= max_tasks:
        vol_update["status"] = "busy"
    batch.update(vol_ref, vol_update)

    # 4. Activity log
    log_ref = db.collection("activity_logs").document()
    batch.set(
        log_ref,
        {
            "entityType": ActivityEntityType.assignment,
            "entityId": assignment_ref.id,
            "action": "volunteer_assigned",
            "actor": admin["uid"],
            "actorRole": "admin",
            "metadata": {
                "needId": need_id,
                "volunteerId": body.volunteerId,
                "matchScore": match_score,
            },
            "timestamp": admin_firestore.SERVER_TIMESTAMP,
        },
    )

    batch.commit()

    return AssignmentResponse(
        id=assignment_ref.id,
        needId=need_id,
        volunteerId=body.volunteerId,
        matchScore=match_score,
        matchReasons=match_reasons,
        assignedBy=admin["uid"],
        status=AssignmentStatus.assigned,
        notes="",
    )
