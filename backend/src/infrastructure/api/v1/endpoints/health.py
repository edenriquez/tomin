"""
Health check endpoint.
"""
from fastapi import APIRouter

router = APIRouter()

@router.get("", status_code=200)
async def health_check():
    """
    Health check endpoint.
    
    Returns:
        dict: Status of the API
    """
    return {
        "status": "ok",
        "service": "backend",
        "version": "1.0.0"
    }
