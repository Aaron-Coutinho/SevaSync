"""
firebase_config.py — Firebase Admin SDK initialization.

Renamed from firebase_admin.py to avoid shadowing the `firebase-admin`
pip package (which caused a circular import at uvicorn startup).

Initializes:
  - Firestore client  → exposed as `db`
  - Firebase Auth     → exposed as `auth`

Both are module-level singletons initialized once at startup.

Required env var:
  FIREBASE_SERVICE_ACCOUNT_JSON  — full service account JSON as a string
  FIREBASE_PROJECT_ID            — GCP project ID (used as fallback)
"""

import json
import os
from dotenv import load_dotenv

import firebase_admin
from firebase_admin import credentials, firestore, auth as firebase_auth

# Load environment variables
load_dotenv()

# ── Initialize ────────────────────────────────────────────────────────────────
def _init_app() -> firebase_admin.App:
    """
    Initialize the Firebase Admin App from environment variable.
    Returns the initialized App object.
    """
    service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    if not service_account_json:
        raise RuntimeError(
            "FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set. "
            "Provide the full service account JSON as a string."
        )

    service_account_dict = json.loads(service_account_json)
    cred = credentials.Certificate(service_account_dict)

    # Avoid re-initialization on hot-reload (e.g. uvicorn --reload)
    if not firebase_admin._apps:
        app = firebase_admin.initialize_app(cred)
    else:
        app = firebase_admin.get_app()

    return app


_app = _init_app()

# ── Module-level singletons ───────────────────────────────────────────────────
db: firestore.Client = firestore.client()
"""Firestore Admin client — use for all database operations."""

auth: firebase_auth = firebase_auth
"""Firebase Auth module — use auth.verify_id_token(), auth.get_user(), etc."""
