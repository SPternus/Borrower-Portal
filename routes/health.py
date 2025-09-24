"""
Health check routes for the Ternus Borrower Profile API
"""
import logging
from datetime import datetime
from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Ternus Borrower Profile API",
        "version": "2.0.0"
    } 