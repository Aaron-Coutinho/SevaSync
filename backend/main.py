"""
main.py — SevaSync FastAPI application entrypoint.

Registers:
  - CORS middleware (open for prototype)
  - All routers: auth, needs, volunteers, tasks, analytics
  - GET /  health check
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ── Load .env BEFORE importing routers (they trigger firebase_config init) ────
# Walk up from backend/ to find the project-root .env
_env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=_env_path, override=False)

from routers import auth, needs, volunteers, tasks, analytics


app = FastAPI(
    title="SevaSync API",
    description="NGO volunteer coordination platform — Smart Resource Allocation",
    version="1.0.0",
    redirect_slashes=False,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Open for prototype; tighten allow_origins to frontend domain before production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router,        prefix="/auth")
app.include_router(needs.router,       prefix="/needs")
app.include_router(volunteers.router,  prefix="/volunteers")
app.include_router(tasks.router,       prefix="/assignments")
app.include_router(analytics.router,   prefix="/analytics")


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def health_check() -> dict:
    """Returns basic liveness signal. Used by Cloud Run health probes."""
    return {"status": "ok", "app": "SevaSync"}
