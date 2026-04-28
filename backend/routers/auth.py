"""
routers/auth.py — Authentication and profile creation endpoints.

Routes (all mounted under /auth by main.py):
  POST /register             → create Firestore user doc from Firebase UID
  POST /verify-token         → validate session and return current user dict
  POST /volunteer-profile    → create volunteer profile doc in Firestore
"""

import logging
from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException, status
from google.cloud import firestore

import firebase_config as _fa  # noqa: F401 — triggers Admin SDK init
from firebase_admin import firestore as admin_firestore
from firebase_admin import auth as firebase_auth

from dependencies import get_current_user
from models import (
    UserCreate,
    UserResponse,
    VolunteerCreate,
    VolunteerResponse,
    VolunteerStatus,
    ActivityLogCreate,
    ActivityEntityType,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Auth"])

# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_db() -> firestore.Client:
    from firebase_admin import firestore as fs
    return fs.client()


def _log_activity(db: firestore.Client, entry: ActivityLogCreate) -> None:
    """Write an immutable activity log entry to activity_logs collection."""
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


# ── POST /auth/register ───────────────────────────────────────────────────────
@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user in Firestore",
)
def register(
    body: UserCreate,
    current_user: dict = Depends(get_current_user),
) -> UserResponse:
    """
    Create a user document in the Firestore `users` collection.

    The caller must be authenticated (Bearer token). The Firestore document
    ID is set to the caller's Firebase UID so it matches firebase_auth.

    Steps:
      1. Verify the caller's token (via get_current_user dependency).
      2. Check the user doc doesn't already exist (idempotent guard).
      3. Set custom `role` claim on the Firebase Auth account.
      4. Write the user doc to Firestore.
      5. Return UserResponse.
    """
    db = _get_db()
    uid = current_user["uid"]

    # Idempotency: return existing doc if already registered
    existing = db.collection("users").document(uid).get()
    if existing.exists:
        data = existing.to_dict()
        data["uid"] = uid
        return UserResponse(**data)

    # Set custom role claim on Firebase Auth so tokens carry the role
    try:
        firebase_auth.set_custom_user_claims(uid, {"role": body.role.value})
    except Exception as exc:
        logger.error("Failed to set custom claims for %s: %s", uid, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to set user role claim.",
        )

    user_doc = {
        "name": body.name,
        "email": body.email,
        "role": body.role.value,
        "organization": body.organization,
        "createdAt": admin_firestore.SERVER_TIMESTAMP,
    }

    db.collection("users").document(uid).set(user_doc)

    _log_activity(
        db,
        ActivityLogCreate(
            entityType=ActivityEntityType.volunteer,
            entityId=uid,
            action="user_registered",
            actor=uid,
            actorRole=body.role.value,
            metadata={"email": body.email, "organization": body.organization},
        ),
    )

    return UserResponse(
        uid=uid,
        name=body.name,
        email=body.email,
        role=body.role,
        organization=body.organization,
    )


# ── POST /auth/verify-token ───────────────────────────────────────────────────
@router.post(
    "/verify-token",
    summary="Verify Firebase token and return current user info",
)
def verify_token(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Validate the caller's Bearer token and return uid + role + email + organization.
    """
    db = _get_db()
    uid = current_user["uid"]
    doc = db.collection("users").document(uid).get()
    
    res = dict(current_user)
    if doc.exists:
        data = doc.to_dict()
        res["organization"] = data.get("organization", "")
        res["role"] = data.get("role", res["role"])
    else:
        res["organization"] = ""
    
    return res


# ── POST /auth/volunteer-profile ──────────────────────────────────────────────
@router.post(
    "/volunteer-profile",
    response_model=VolunteerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a volunteer profile in Firestore",
)
def create_volunteer_profile(
    body: VolunteerCreate,
    current_user: dict = Depends(get_current_user),
) -> VolunteerResponse:
    """
    Create a volunteer profile document in the `volunteers` collection.

    - Requires authentication (any role).
    - The Firestore document ID is the caller's Firebase UID.
    - Backend enforces: activeTaskCount=0, totalCompleted=0,
      status=available, verified=False at creation time.
    - Idempotent: returns existing doc if profile already exists.
    """
    db = _get_db()
    uid = current_user["uid"]

    # Idempotency guard
    existing = db.collection("volunteers").document(uid).get()
    if existing.exists:
        data = existing.to_dict()
        data["uid"] = uid
        return VolunteerResponse(**data)

    from firebase_admin import firestore as fs

    volunteer_doc = {
        "uid": uid,
        "phone": body.phone,
        "skills": [s.value for s in body.skills],
        "languages": body.languages,
        "location": body.location.model_dump(),
        "availability": body.availability.model_dump(),
        "maxActiveTasks": body.maxActiveTasks,
        # Backend-controlled fields — never trusted from client
        "activeTaskCount": 0,
        "totalCompleted": 0,
        "status": VolunteerStatus.available.value,
        "verified": False,
        "rating": 0.0,
        "joinedAt": fs.SERVER_TIMESTAMP,
    }

    db.collection("volunteers").document(uid).set(volunteer_doc)

    _log_activity(
        db,
        ActivityLogCreate(
            entityType=ActivityEntityType.volunteer,
            entityId=uid,
            action="volunteer_profile_created",
            actor=uid,
            actorRole=current_user.get("role", "volunteer"),
            metadata={"skills": [s.value for s in body.skills]},
        ),
    )

    return VolunteerResponse(
        uid=uid,
        phone=body.phone,
        skills=body.skills,
        languages=body.languages,
        location=body.location,
        availability=body.availability,
        maxActiveTasks=body.maxActiveTasks,
        activeTaskCount=0,
        totalCompleted=0,
        status=VolunteerStatus.available,
        verified=False,
        rating=0.0,
    )
