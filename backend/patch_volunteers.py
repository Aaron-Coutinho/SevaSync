"""
patch_volunteers.py — One-shot patch to fix existing Firestore volunteer docs.

Problems being fixed:
  1. All vol_* docs are missing 'phone' and 'verified' fields
     → VolunteerResponse Pydantic model was crashing on every doc
  2. vol_002 had skill 'transportation' which is not a valid SkillTag enum
     → Replaced with 'logistics'

Run once from backend/ directory:
    python patch_volunteers.py
"""

import os
from pathlib import Path

_env_path = Path(__file__).parent.parent / ".env"
from dotenv import load_dotenv
load_dotenv(dotenv_path=_env_path, override=False)

import firebase_config
db = firebase_config.db

patches = {
    "vol_001": {"phone": "+91-9800000001", "verified": True},
    "vol_002": {"phone": "+91-9800000002", "verified": True, "skills": ["logistics", "field_support"]},
    "vol_003": {"phone": "+91-9800000003", "verified": True},
    "vol_004": {"phone": "+91-9800000004", "verified": True},
    "vol_005": {"phone": "+91-9800000005", "verified": True},
    "vol_006": {"phone": "+91-9800000006", "verified": False},
    "vol_007": {"phone": "+91-9800000007", "verified": True},
    "vol_008": {"phone": "+91-9800000008", "verified": True},
    "vol_009": {"phone": "+91-9800000009", "verified": True},
    "vol_010": {"phone": "+91-9800000010", "verified": False},
}

print("Patching volunteer docs in Firestore...")
for uid, patch_data in patches.items():
    ref = db.collection("volunteers").document(uid)
    doc = ref.get()
    if doc.exists:
        ref.update(patch_data)
        print(f"  [OK] Patched {uid}: {list(patch_data.keys())}")
    else:
        print(f"  [WARN]  Skipped {uid} — doc does not exist in Firestore")

print("\nDone. All existing volunteer docs patched.")
