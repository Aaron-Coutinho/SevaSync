"""
services/gemini.py — Gemini API integration for SevaSync.

Two functions:
  1. analyze_need(raw_description) → structured dict
     Uses structured output mode (response_json_schema + Pydantic schema)
     to extract: title, category, urgency, requiredSkills, requiredLanguages,
     estimatedHours, vulnerableGroup, aiSummary, aiTags.

  2. explain_matches(need, top_matches) → list[str]
     Sends need + top 3 volunteer profiles to Gemini.
     Returns one short plain-text reason string per volunteer.

SDK: google-genai  (NOT google-generativeai)
Model: gemini-3-flash-preview
"""

import json
import logging
import os
from typing import Literal, Optional

from google import genai
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

MODEL = "gemini-3-flash-preview"

# ── Gemini client — lazy singleton ────────────────────────────────────────────
_client: Optional[genai.Client] = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY environment variable is not set.")
        _client = genai.Client(api_key=api_key)
    return _client


# ── Structured output schema (Pydantic → JSON Schema) ────────────────────────
class NeedAnalysisSchema(BaseModel):
    title: str = Field(
        description="A short, clear title for the need (max 10 words)."
    )
    category: Literal[
        "food_essentials",
        "medical",
        "elderly_support",
        "child_support",
        "transport_logistics",
        "documentation",
        "shelter_community",
    ] = Field(description="Best-fit category from the predefined list.")
    urgency: Literal["critical", "high", "medium", "low"] = Field(
        description="Urgency level based on time-sensitivity and severity."
    )
    requiredSkills: list[
        Literal[
            "medical",
            "counselling",
            "logistics",
            "translation",
            "data_entry",
            "field_support",
            "community_outreach",
            "documentation",
        ]
    ] = Field(description="Volunteer skill tags needed to fulfil this request.")
    requiredLanguages: list[str] = Field(
        description="Languages the volunteer must speak (e.g. ['Hindi', 'Marathi'])."
    )
    estimatedHours: float = Field(
        description="Estimated volunteer hours needed to fulfil the request."
    )
    vulnerableGroup: bool = Field(
        description="True if the beneficiary is elderly, a child, or medically dependent."
    )
    aiSummary: str = Field(
        description="One- to two-sentence coordinator-friendly summary of the need."
    )
    aiTags: list[str] = Field(
        description="Short keyword tags for filtering/display (max 5 tags)."
    )


_ANALYZE_SYSTEM_INSTRUCTION = (
    "You are a structured data extraction assistant for an NGO volunteer coordination "
    "platform. Given a free-text community need description, extract the relevant fields "
    "strictly according to the provided JSON schema. Use only the allowed enum values for "
    "category, urgency, and skills. Be concise and factual."
)


def analyze_need(raw_description: str) -> Optional[dict]:
    """
    Parse a free-text community need into a structured dict using Gemini.

    Uses response_json_schema (structured output mode) so the response
    is always valid, parseable JSON. The coordinator is shown the output
    as a suggestion — they can edit before final save.

    Args:
        raw_description: Raw text submitted by coordinator or field volunteer.

    Returns:
        Dict with keys: title, category, urgency, requiredSkills,
        requiredLanguages, estimatedHours, vulnerableGroup, aiSummary, aiTags.
        Returns None on failure (caller should flag for manual review).
    """
    try:
        client = _get_client()

        prompt = (
            f"Extract structured need information from the following community request:\n\n"
            f'"{raw_description}"\n\n'
            "Return a JSON object matching the schema exactly."
        )

        response = client.models.generate_content(
            model=MODEL,
            contents=prompt,
            config={
                "system_instruction": _ANALYZE_SYSTEM_INSTRUCTION,
                "response_mime_type": "application/json",
                "response_json_schema": NeedAnalysisSchema.model_json_schema(),
            },
        )

        parsed = NeedAnalysisSchema.model_validate_json(response.text)
        return parsed.model_dump()

    except Exception as exc:
        logger.error(
            "Gemini analyze_need failed for input '%.80s...': %s",
            raw_description,
            exc,
            exc_info=True,
        )
        return None


# ── Match explanation ─────────────────────────────────────────────────────────
def explain_matches(need: dict, top_matches: list[dict]) -> list[Optional[str]]:
    """
    Generate a short human-readable explanation for each volunteer recommendation.

    Sends the need summary and the top (up to 3) volunteer profiles to Gemini
    and asks for one sentence per volunteer explaining why they are a good match.
    Gemini is used ONLY for natural-language explanation — the actual scoring
    is deterministic (see matching.py).

    Args:
        need:        Firestore need document as dict.
        top_matches: List of match result dicts from get_top_matches(),
                     each with volunteerId, score, reasons.

    Returns:
        List of explanation strings aligned to top_matches order.
        If explanation fails, returns a list of None values.
    """
    if not top_matches:
        return []

    try:
        client = _get_client()

        # Build a compact context block for Gemini
        need_summary = (
            f"Need: {need.get('title', 'Community request')}\n"
            f"Category: {need.get('category', 'unknown')}\n"
            f"Urgency: {need.get('urgency', 'unknown')}\n"
            f"Required skills: {', '.join(need.get('requiredSkills', []))}\n"
            f"Summary: {need.get('aiSummary', need.get('rawDescription', ''))}"
        )

        volunteers_block = "\n\n".join(
            f"Volunteer {i + 1} (ID: {m['volunteerId']}):\n"
            f"  Score: {m['score']}\n"
            f"  Match factors: {', '.join(m.get('reasons', []))}"
            for i, m in enumerate(top_matches)
        )

        prompt = (
            f"{need_summary}\n\n"
            f"Top volunteer matches:\n{volunteers_block}\n\n"
            f"For each volunteer, write exactly ONE short sentence (max 15 words) "
            f"explaining why they are a good match for this need. "
            f"Return a JSON array of {len(top_matches)} strings in the same order."
        )

        schema = {
            "type": "array",
            "items": {"type": "string"},
            "minItems": len(top_matches),
            "maxItems": len(top_matches),
        }

        response = client.models.generate_content(
            model=MODEL,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_json_schema": schema,
            },
        )

        explanations: list[str] = json.loads(response.text)

        # Pad or trim to match top_matches length
        while len(explanations) < len(top_matches):
            explanations.append(None)

        return explanations[: len(top_matches)]

    except Exception as exc:
        logger.error(
            "Gemini explain_matches failed for need %s: %s",
            need.get("id", "unknown"),
            exc,
            exc_info=True,
        )
        return [None] * len(top_matches)
