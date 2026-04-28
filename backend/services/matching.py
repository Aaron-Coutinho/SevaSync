"""
services/matching.py — Deterministic volunteer matching engine.

Match score formula per eligible volunteer:
    matchScore =  skill_overlap_count * 20   (max 60)
               + (15 if area_match)
               + (10 if time_available)
               + (5  if language_match)
               + min((maxActiveTasks - activeTaskCount) * 3, 9)   # workload
               + min(rating * 2, 10)

get_top_matches() returns top 3 volunteers sorted by score descending.
Each result includes volunteerId, score, and human-readable reasons list.

Eligibility filter:
  - volunteer.status == "available"
  - volunteer.activeTaskCount < volunteer.maxActiveTasks
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ── Scoring constants ─────────────────────────────────────────────────────────
SKILL_PTS_PER_MATCH = 20
SKILL_MAX_PTS = 60

AREA_MATCH_PTS = 15
TIME_AVAILABLE_PTS = 10
LANGUAGE_MATCH_PTS = 5

WORKLOAD_RATE = 3       # points per free slot
WORKLOAD_MAX_PTS = 9

RATING_RATE = 2         # points per rating point
RATING_MAX_PTS = 10

TOP_N = 3               # number of recommendations to return


# ── Eligibility ───────────────────────────────────────────────────────────────
def _is_eligible(volunteer: dict) -> bool:
    """Return True if volunteer can take new tasks."""
    status = volunteer.get("status", "offline")
    active = volunteer.get("activeTaskCount", 0)
    max_tasks = volunteer.get("maxActiveTasks", 3)
    return status == "available" and active < max_tasks


# ── Individual factor scorers ─────────────────────────────────────────────────
def _skill_score(need: dict, volunteer: dict) -> tuple[int, Optional[str]]:
    """Skill overlap score and reason string."""
    required: list[str] = need.get("requiredSkills", [])
    volunteer_skills: list[str] = volunteer.get("skills", [])
    overlap = len(set(required) & set(volunteer_skills))
    pts = min(overlap * SKILL_PTS_PER_MATCH, SKILL_MAX_PTS)
    reason = f"Matches {overlap} required skill(s)" if overlap > 0 else None
    return pts, reason


def _area_score(need: dict, volunteer: dict) -> tuple[int, Optional[str]]:
    """Area/location match score and reason string."""
    need_area = need.get("location", {}).get("area", "").strip().lower()
    vol_area = volunteer.get("location", {}).get("area", "").strip().lower()
    if need_area and vol_area and need_area == vol_area:
        return AREA_MATCH_PTS, f"Located in {need.get('location', {}).get('area', 'the same area')}"
    return 0, None


def _time_score(need: dict, volunteer: dict) -> tuple[int, Optional[str]]:
    """
    Availability/time fit score.
    Checks if estimatedHours fits within volunteer's hoursPerWeek budget.
    """
    estimated_hours: float = need.get("estimatedHours") or 0
    availability = volunteer.get("availability", {})
    hours_per_week: float = availability.get("hoursPerWeek", 0)

    if hours_per_week > 0 and estimated_hours <= hours_per_week:
        pref_time = availability.get("preferredTime", "flexible")
        reason = "Available now" if pref_time == "flexible" else f"Available ({pref_time} schedule)"
        return TIME_AVAILABLE_PTS, reason
    return 0, None


def _language_score(need: dict, volunteer: dict) -> tuple[int, Optional[str]]:
    """Language match score and reason string."""
    required_langs: list[str] = [l.lower() for l in need.get("requiredLanguages", [])]
    vol_langs: list[str] = [l.lower() for l in volunteer.get("languages", [])]
    if required_langs and set(required_langs) & set(vol_langs):
        return LANGUAGE_MATCH_PTS, "Speaks required language(s)"
    # If need has no language requirement, no penalty and no bonus
    return 0, None


def _workload_score(volunteer: dict) -> tuple[int, Optional[str]]:
    """Workload-based availability score and reason string."""
    max_tasks = volunteer.get("maxActiveTasks", 3)
    active = volunteer.get("activeTaskCount", 0)
    free_slots = max(max_tasks - active, 0)
    pts = min(free_slots * WORKLOAD_RATE, WORKLOAD_MAX_PTS)
    reason = f"Low workload ({active}/{max_tasks} active tasks)" if free_slots > 0 else None
    return pts, reason


def _rating_score(volunteer: dict) -> tuple[int, Optional[str]]:
    """Rating-based bonus and reason string."""
    rating: float = volunteer.get("rating", 0)
    pts = min(int(rating * RATING_RATE), RATING_MAX_PTS)
    reason = f"Highly rated ({rating:.1f}/5)" if rating >= 4.0 else None
    return pts, reason


# ── Core scoring function ─────────────────────────────────────────────────────
def compute_match_score(need: dict, volunteer: dict) -> tuple[int, list[str]]:
    """
    Compute the integer match score between a need and a volunteer.

    Args:
        need:      Firestore need document as dict.
        volunteer: Firestore volunteer document as dict.

    Returns:
        Tuple of (score: int, reasons: list[str])
        reasons contains only the factors that contributed positively.
    """
    total = 0
    reasons: list[str] = []

    for scorer in [
        lambda: _skill_score(need, volunteer),
        lambda: _area_score(need, volunteer),
        lambda: _time_score(need, volunteer),
        lambda: _language_score(need, volunteer),
        lambda: _workload_score(volunteer),
        lambda: _rating_score(volunteer),
    ]:
        pts, reason = scorer()
        total += pts
        if reason:
            reasons.append(reason)

    return total, reasons


# ── Top-N matching ────────────────────────────────────────────────────────────
def get_top_matches(need: dict, volunteers: list[dict]) -> list[dict]:
    """
    Return top 3 volunteer recommendations for a given need.

    Filters to eligible volunteers (available + capacity), scores each,
    and returns results sorted by matchScore descending.

    Args:
        need:       Firestore need document as dict.
        volunteers: List of Firestore volunteer documents as dicts.

    Returns:
        List of up to 3 dicts, each with:
            - volunteerId (str)
            - name        (str) - volunteer's actual name from volunteer doc
            - score       (int)
            - reasons     (list[str])
    """
    scored: list[dict] = []

    for volunteer in volunteers:
        if not _is_eligible(volunteer):
            continue

        score, reasons = compute_match_score(need, volunteer)

        # Always include at least a fallback reason
        if not reasons:
            reasons = ["Available for new tasks"]

        volunteer_id = volunteer.get("uid", volunteer.get("id", ""))
        
        # Name is already in the volunteer document (from seeded data or user profile)
        name = (
            volunteer.get("name") or
            volunteer.get("fullName") or
            volunteer.get("displayName") or
            f"Volunteer {volunteer_id[-4:]}"  # friendly fallback e.g. "Volunteer _006"
        )

        scored.append(
            {
                "volunteerId": volunteer_id,
                "name": name,
                "score": score,
                "reasons": reasons,
            }
        )

    scored.sort(key=lambda v: v["score"], reverse=True)

    top = scored[:TOP_N]

    logger.debug(
        "Match suggestions for need %s: %s",
        need.get("id", "unknown"),
        [(m["volunteerId"], m["score"]) for m in top],
    )

    return top
