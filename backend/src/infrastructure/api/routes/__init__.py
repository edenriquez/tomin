"""
API routes for the application.
"""
from fastapi import APIRouter
from infrastructure.api.v1.endpoints import health

# Create main API router
api_router = APIRouter()

# Include API version 1 routes
api_router.include_router(
    health.router,
    prefix="/health",
    tags=["health"]
)

# You can include more versioned API routers here
# Example:
# from backend.infrastructure.api.v1.endpoints import items, users
# api_router.include_router(items.router, prefix="/items", tags=["items"])
# api_router.include_router(users.router, prefix="/users", tags=["users"])