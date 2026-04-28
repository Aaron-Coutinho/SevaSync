# routers/__init__.py
# Import all routers so `from routers import auth, needs, volunteers, tasks, analytics` works.

from . import auth, needs, volunteers, tasks, analytics

__all__ = ["auth", "needs", "volunteers", "tasks", "analytics"]
