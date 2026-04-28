"""
dependencies.py — FastAPI shared dependencies.

Usage in routers:
    from dependencies import get_current_user, verify_admin

    @router.get("/protected")
    def protected(user: dict = Depends(get_current_user)):
        ...

    @router.post("/admin-only")
    def admin_only(user: dict = Depends(verify_admin)):
        ...
"""

import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

import firebase_config as _firebase_config_module  # noqa: F401 — triggers SDK init
from firebase_admin import auth as firebase_auth

logger = logging.getLogger(__name__)

_bearer_scheme = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> dict:
    """
    Verify the Firebase ID token in the Authorization header.
    """
    print(f"DEBUG: Credentials object received: {credentials}")
    if not credentials:
        print("DEBUG: No credentials provided! HTTPBearer rejected the header.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    print(f"DEBUG: Received token (first 15 chars): {token[:15] if token else 'None'}")
    try:
        # Allow 10 seconds of clock skew for local dev environments
        decoded_token = firebase_auth.verify_id_token(token, clock_skew_seconds=10)
        print("DEBUG: Token successfully decoded.")
    except firebase_auth.ExpiredIdTokenError as e:
        print(f"DEBUG: ExpiredIdTokenError: {e}")
        logger.error("Token expired: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token has expired: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except firebase_auth.InvalidIdTokenError as e:
        print(f"DEBUG: InvalidIdTokenError: {e}")
        logger.error("Invalid token: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        print(f"DEBUG: Other Exception: {type(e).__name__} - {e}")
        logger.error("Token verification failed: %s: %s", type(e).__name__, e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {
        "uid": decoded_token.get("uid"),
        "role": decoded_token.get("role", "volunteer"),  # custom claim
        "email": decoded_token.get("email", ""),
    }


async def verify_admin(
    user: dict = Depends(get_current_user),
) -> dict:
    """
    Confirm that the authenticated user has the 'admin' role.

    Raises:
        403 — if the user role is not 'admin'.

    Returns the same user dict as get_current_user() so it can be
    used directly in route functions.
    """
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return user
