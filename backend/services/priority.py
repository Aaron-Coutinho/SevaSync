"""
services/priority.py — Deterministic priority scoring engine.

Formula:
    priorityScore = urgency_weight
                  + min(beneficiaryCount * 2, 30)
                  + (20 if vulnerableGroup else 0)
                  + age_bonus   # +5 per 6h unassigned, max 20

Urgency weights: critical=100, high=75, medium=40, low=15
"""

import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────
URGENCY_WEIGHTS: dict[str, int] = {
    "critical": 100,
    "high": 75,
    "medium": 40,
    "low": 15,
}

BENEFICIARY_RATE = 2          # points per beneficiary
BENEFICIARY_CAP = 30          # max points from beneficiary count

VULNERABLE_BONUS = 20         # flat bonus if vulnerableGroup is True

AGE_BONUS_PER_INTERVAL = 5   # points per 6-hour interval
AGE_INTERVAL_HOURS = 6        # interval length in hours
AGE_BONUS_CAP = 20            # max points from age bonus

# Statuses considered "unassigned" for age bonus eligibility
UNASSIGNED_STATUSES = {"new", "analyzed", "pending_assignment"}


def _compute_age_bonus(need: dict) -> int:
    """
    Returns an age bonus of +5 for every 6 hours the need has been unassigned,
    capped at 20 points.

    Only applies when need status is still in an unassigned state.
    """
    status = need.get("status", "new")
    if status not in UNASSIGNED_STATUSES:
        return 0

    submitted_at = need.get("submittedAt")
    if submitted_at is None:
        return 0

    # Handle Firestore Timestamp objects and plain datetime objects
    if hasattr(submitted_at, "timestamp"):
        # Firestore DatetimeWithNanoseconds
        submitted_dt = submitted_at
        if submitted_dt.tzinfo is None:
            submitted_dt = submitted_dt.replace(tzinfo=timezone.utc)
    elif isinstance(submitted_at, datetime):
        submitted_dt = submitted_at
        if submitted_dt.tzinfo is None:
            submitted_dt = submitted_dt.replace(tzinfo=timezone.utc)
    else:
        return 0

    now = datetime.now(tz=timezone.utc)
    elapsed_hours = max((now - submitted_dt).total_seconds() / 3600, 0)
    intervals = int(elapsed_hours // AGE_INTERVAL_HOURS)
    return min(intervals * AGE_BONUS_PER_INTERVAL, AGE_BONUS_CAP)


def compute_priority_score(need: dict) -> int:
    """
    Compute and return the integer priority score for a need document.

    Args:
        need: A dict representing a Firestore need document.
              Expected keys: urgency, beneficiaryCount, vulnerableGroup,
              submittedAt, status.

    Returns:
        Integer priority score. Higher = more urgent.
    """
    urgency = need.get("urgency", "low")
    urgency_pts = URGENCY_WEIGHTS.get(urgency, URGENCY_WEIGHTS["low"])

    beneficiary_count = need.get("beneficiaryCount", 1)
    beneficiary_pts = min(beneficiary_count * BENEFICIARY_RATE, BENEFICIARY_CAP)

    vulnerable = need.get("vulnerableGroup", False)
    vulnerable_pts = VULNERABLE_BONUS if vulnerable else 0

    age_pts = _compute_age_bonus(need)

    score = urgency_pts + beneficiary_pts + vulnerable_pts + age_pts

    logger.debug(
        "Priority score for need %s: urgency=%d beneficiary=%d "
        "vulnerable=%d age=%d → total=%d",
        need.get("id", "unknown"),
        urgency_pts,
        beneficiary_pts,
        vulnerable_pts,
        age_pts,
        score,
    )

    return score
